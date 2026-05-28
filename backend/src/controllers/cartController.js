const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Add to Cart - FIXED: Allow products from all active stores (verified or not)
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const customerId = req.user.id;

    console.log('CartController: Adding to cart - productId:', productId, 'quantity:', quantity);

    // Validate productId
    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required!' });
    }

    // Try to parse productId as integer first
    let queryProductId = productId;
    if (typeof productId === 'string' && /^\d+$/.test(productId)) {
      queryProductId = parseInt(productId);
    }

    // Get product with store info - ALLOW ALL ACTIVE PRODUCTS
    // Products can be added if they exist and are active, regardless of store status
    let product = await pool.query(
      `SELECT p.id, p.name, p.base_price, p.stock_quantity, p.store_id, p.is_active,
              s.store_name
       FROM products p
       LEFT JOIN stores s ON p.store_id = s.id
       WHERE p.id = $1`,
      [queryProductId]
    );

    console.log('CartController: Product query result (int):', product.rows);

    if (product.rows.length === 0) {
      // Try string ID
      product = await pool.query(
        `SELECT p.id, p.name, p.base_price, p.stock_quantity, p.store_id, p.is_active,
                s.store_name
         FROM products p
         LEFT JOIN stores s ON p.store_id = s.id
         WHERE p.id = $1`,
        [String(productId)]
      );
      
      console.log('CartController: Product query result (str):', product.rows);
      
      if (product.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Product not found!' });
      }
    }

    const productData = product.rows[0];
    console.log('CartController: productData:', productData);
    
    // Check if product is active
    if (productData.is_active === false) {
      return res.status(400).json({ success: false, error: 'This product is currently unavailable!' });
    }

    // Check stock
    const stockQty = productData.stock_quantity || 0;
    if (stockQty < quantity) {
      return res.status(400).json({ success: false, error: 'Not enough stock!' });
    }

    const productStoreId = productData.store_id;

    // ALLOW MULTIPLE STORES - Don't clear cart when adding from different store
    // Each product can be from different store, all stay in cart
    let cartCleared = false;
    // REMOVED: Store conflict check - users can now buy from multiple stores

    // Check if already in cart - try both int and string
    let existing = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE customer_id = $1 AND product_id = $2',
      [customerId, queryProductId]
    );
    
    if (existing.rows.length === 0) {
      existing = await pool.query(
        'SELECT id, quantity FROM cart_items WHERE customer_id = $1 AND product_id = $2',
        [customerId, String(productId)]
      );
    }

    let result;
    if (existing.rows.length > 0) {
      // Update quantity
      result = await pool.query(
        'UPDATE cart_items SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [quantity, existing.rows[0].id]
      );
    } else {
      // Add new item - store as integer if possible
      const finalProductId = typeof productData.id === 'number' ? productData.id : queryProductId;
      result = await pool.query(
        'INSERT INTO cart_items (id, customer_id, product_id, quantity) VALUES ($1, $2, $3, $4) RETURNING *',
        [uuidv4(), customerId, finalProductId, quantity]
      );
    }

    res.status(201).json({
      success: true,
      message: cartCleared 
        ? '✅ Added to cart! Previous items from different store were removed.'
        : '✅ Added to cart!',
      cartItem: result.rows[0],
      cartCleared: cartCleared
    });

  } catch (error) {
    console.error('CartController Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Cart - FIXED: Show all cart items regardless of store status
exports.getCart = async (req, res) => {
  try {
    const customerId = req.user.id;

    const result = await pool.query(
      `SELECT ci.id, ci.quantity,
              p.id as product_id, p.name, p.base_price, p.discount_price,
              p.image_url, p.thumbnail, p.slug,
              s.store_name, p.store_id
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN stores s ON p.store_id = s.id
       WHERE ci.customer_id = $1
       ORDER BY ci.created_at DESC`,
      [customerId]
    );

    const total = result.rows.reduce((sum, item) => {
      const price = item.discount_price || item.base_price;
      return sum + (price * item.quantity);
    }, 0);

    res.json({
      success: true,
      count: result.rows.length,
      total: parseFloat(total).toFixed(2),
      cart: result.rows
    });

  } catch (error) {
    console.error('CartController.getCart Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update Cart Item
exports.updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const customerId = req.user.id;

    if (quantity < 1) {
      return res.status(400).json({ success: false, error: 'Quantity must be at least 1!' });
    }

    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 AND customer_id = $3 RETURNING *',
      [quantity, id, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cart item not found!' });
    }

    res.json({ success: true, message: '✅ Cart updated!', cartItem: result.rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Remove from Cart
exports.removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;

    await pool.query(
      'DELETE FROM cart_items WHERE id = $1 AND customer_id = $2',
      [id, customerId]
    );

    res.json({ success: true, message: '✅ Item removed from cart!' });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Clear Cart
exports.clearCart = async (req, res) => {
  try {
    const customerId = req.user.id;
    await pool.query('DELETE FROM cart_items WHERE customer_id = $1', [customerId]);
    res.json({ success: true, message: '✅ Cart cleared!' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
