const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// ==================== WISHLIST LISTS ====================

// Create Wishlist List
exports.createList = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, isPublic = false } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'List name is required!' });
    }

    const shareToken = isPublic ? crypto.randomBytes(16).toString('hex') : null;

    const result = await pool.query(
      `INSERT INTO wishlist_lists (customer_id, name, description, is_public, share_token)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, name, description, isPublic, shareToken]
    );

    res.status(201).json({
      success: true,
      message: '✅ Wishlist created!',
      list: result.rows[0]
    });

  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get My Wishlists
exports.getMyLists = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT wl.*, 
              (SELECT COUNT(*) FROM wishlists WHERE list_id = wl.id) as item_count,
              COALESCE(wl.total_value, 0) as total_value
       FROM wishlist_lists wl
       WHERE wl.customer_id = $1
       ORDER BY wl.updated_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      lists: result.rows
    });

  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update List
exports.updateList = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, isPublic } = req.body;

    let shareToken;
    if (isPublic !== undefined) {
      const existing = await pool.query('SELECT share_token FROM wishlist_lists WHERE id = $1 AND customer_id = $2', [id, userId]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'List not found!' });
      }
      shareToken = isPublic ? (existing.rows[0].share_token || crypto.randomBytes(16).toString('hex')) : null;
    }

    const result = await pool.query(
      `UPDATE wishlist_lists 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_public = COALESCE($3, is_public),
           share_token = COALESCE($4, share_token),
           updated_at = NOW()
       WHERE id = $5 AND customer_id = $6
       RETURNING *`,
      [name, description, isPublic, shareToken, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'List not found!' });
    }

    res.json({
      success: true,
      message: '✅ List updated!',
      list: result.rows[0]
    });

  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Delete List
exports.deleteList = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM wishlist_lists WHERE id = $1 AND customer_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'List not found!' });
    }

    res.json({ success: true, message: '✅ List deleted!' });

  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Shared Wishlist (Public)
exports.getSharedList = async (req, res) => {
  try {
    const { shareToken } = req.params;

    const listResult = await pool.query(
      `SELECT wl.*, CONCAT(u.first_name, ' ', u.last_name) as owner_name
       FROM wishlist_lists wl
       JOIN users u ON wl.customer_id = u.id
       WHERE wl.share_token = $1 AND wl.is_public = true`,
      [shareToken]
    );

    if (listResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Wishlist not found or not shared!' });
    }

    const list = listResult.rows[0];

    // Get items
    const itemsResult = await pool.query(
      `SELECT w.id, w.added_price, w.created_at as added_at,
              p.id as product_id, p.name, p.base_price, p.discount_price, p.discount_percentage,
              p.thumbnail, p.stock_quantity, p.slug,
              s.store_name, s.id as store_id,
              c.name as category_name
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       JOIN stores s ON p.store_id = s.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE w.list_id = $1
       ORDER BY w.created_at DESC`,
      [list.id]
    );

    res.json({
      success: true,
      list: {
        id: list.id,
        name: list.name,
        description: list.description,
        ownerName: list.owner_name,
        createdAt: list.created_at
      },
      items: itemsResult.rows,
      totalItems: itemsResult.rows.length
    });

  } catch (error) {
    console.error('Get shared list error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== WISHLIST ITEMS ====================

// Add to Wishlist (Enhanced)
exports.addToWishlist = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { productId, listId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required!' });
    }

    // Check if product exists
    const productCheck = await pool.query(
      'SELECT id, base_price, discount_price FROM products WHERE id = $1',
      [productId]
    );
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found!' });
    }

    const product = productCheck.rows[0];
    const currentPrice = product.discount_price || product.base_price;

    // Check if already in any wishlist
    const existing = await pool.query(
      'SELECT id, list_id FROM wishlists WHERE customer_id = $1 AND product_id = $2',
      [customerId, productId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Product already in your wishlist!' });
    }

    // Add to wishlist
    const result = await pool.query(
      `INSERT INTO wishlists (id, customer_id, product_id, list_id, added_price)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uuidv4(), customerId, productId, listId || null, currentPrice]
    );

    // Update list item count
    if (listId) {
      await pool.query(
        `UPDATE wishlist_lists SET item_count = (
          SELECT COUNT(*) FROM wishlists WHERE list_id = $1
        ), updated_at = NOW() WHERE id = $1`,
        [listId]
      );
    }

    // Create price alert for the product (non-blocking)
    try {
      await pool.query(
        `INSERT INTO wishlist_alerts (id, user_id, product_id, original_price, last_checked_price, is_active)
         VALUES ($1, $2, $3, $4, $4, true)
         ON CONFLICT DO NOTHING`,
        [uuidv4(), customerId, productId, currentPrice]
      );
    } catch (_) {
      // Table may not exist; non-critical
    }

    res.status(201).json({
      success: true,
      message: '✅ Added to wishlist!',
      wishlistItem: result.rows[0]
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get My Wishlist (with full product details)
exports.getMyWishlist = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { listId } = req.query;

    let query = `
      SELECT w.id, w.added_price, w.created_at as added_at,
             p.id as product_id, p.name, p.base_price, p.discount_price, p.discount_percentage,
             p.thumbnail, p.stock_quantity, p.slug, p.average_rating, p.review_count,
             s.store_name, s.id as store_id,
             c.name as category_name,
             CASE WHEN p.discount_price < w.added_price THEN true ELSE false END as price_dropped,
             (w.added_price - COALESCE(p.discount_price, p.base_price)) as savings
      FROM wishlists w
      JOIN products p ON w.product_id = p.id
      JOIN stores s ON p.store_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE w.customer_id = $1
    `;
    const params = [customerId];

    if (listId) {
      query += ` AND w.list_id = $2`;
      params.push(listId);
    }

    query += ` ORDER BY w.created_at DESC`;

    const result = await pool.query(query, params);

    // Calculate summary
    const summary = {
      totalItems: result.rows.length,
      totalValue: result.rows.reduce((sum, item) => sum + parseFloat(item.base_price), 0),
      priceDrops: result.rows.filter(item => item.price_dropped).length,
      inStock: result.rows.filter(item => item.stock_quantity > 0).length,
      outOfStock: result.rows.filter(item => item.stock_quantity === 0).length
    };

    res.json({
      success: true,
      summary,
      wishlist: result.rows
    });

  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Remove from Wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;

    // Get the wishlist item to check list_id
    const item = await pool.query(
      'SELECT list_id FROM wishlists WHERE id = $1 AND customer_id = $2',
      [id, customerId]
    );

    if (item.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Wishlist item not found!' });
    }

    const listId = item.rows[0].list_id;

    await pool.query('DELETE FROM wishlists WHERE id = $1', [id]);

    // Update list item count
    if (listId) {
      await pool.query(
        `UPDATE wishlist_lists SET item_count = (
          SELECT COUNT(*) FROM wishlists WHERE list_id = $1
        ), updated_at = NOW() WHERE id = $1`,
        [listId]
      );
    }

    res.json({ success: true, message: '✅ Removed from wishlist!' });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Check if Product in Wishlist
exports.checkWishlist = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { productId } = req.params;

    const result = await pool.query(
      'SELECT id, list_id FROM wishlists WHERE customer_id = $1 AND product_id = $2',
      [customerId, productId]
    );

    res.json({
      success: true,
      inWishlist: result.rows.length > 0,
      listId: result.rows[0]?.list_id || null,
      wishlistId: result.rows[0]?.id || null
    });

  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Move to Cart
exports.moveToCart = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { wishlistId } = req.params;
    const { quantity = 1 } = req.body;

    const wishlistItem = await pool.query(
      'SELECT product_id FROM wishlists WHERE id = $1 AND customer_id = $2',
      [wishlistId, customerId]
    );

    if (wishlistItem.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Wishlist item not found!' });
    }

    const productId = wishlistItem.rows[0].product_id;

    // Check if already in cart
    const existingCart = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE customer_id = $1 AND product_id = $2',
      [customerId, productId]
    );

    if (existingCart.rows.length > 0) {
      await pool.query(
        'UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2',
        [quantity, existingCart.rows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO cart_items (id, customer_id, product_id, quantity) VALUES ($1, $2, $3, $4)',
        [uuidv4(), customerId, productId, quantity]
      );
    }

    await pool.query('DELETE FROM wishlists WHERE id = $1', [wishlistId]);

    res.json({ success: true, message: '✅ Moved to cart!' });

  } catch (error) {
    console.error('Move to cart error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Move All to Cart
exports.moveAllToCart = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { listId } = req.body;

    // Get all items
    let query = 'SELECT product_id FROM wishlists WHERE customer_id = $1';
    const params = [customerId];
    
    if (listId) {
      query += ' AND list_id = $2';
      params.push(listId);
    }

    const items = await pool.query(query, params);

    if (items.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No items to move!' });
    }

    let movedCount = 0;
    for (const item of items.rows) {
      const existingCart = await pool.query(
        'SELECT id, quantity FROM cart_items WHERE customer_id = $1 AND product_id = $2',
        [customerId, item.product_id]
      );

      if (existingCart.rows.length > 0) {
        await pool.query(
          'UPDATE cart_items SET quantity = quantity + 1 WHERE id = $1',
          [existingCart.rows[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO cart_items (id, customer_id, product_id, quantity) VALUES ($1, $2, $3, 1)',
          [uuidv4(), customerId, item.product_id]
        );
      }
      movedCount++;
    }

    // Clear moved items from wishlist
    await pool.query(
      `DELETE FROM wishlists WHERE customer_id = $1${listId ? ' AND list_id = $2' : ''}`,
      listId ? [customerId, listId] : [customerId]
    );

    res.json({
      success: true,
      message: `✅ ${movedCount} items moved to cart!`
    });

  } catch (error) {
    console.error('Move all to cart error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Clear Wishlist
exports.clearWishlist = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { listId } = req.body;

    let query = 'DELETE FROM wishlists WHERE customer_id = $1';
    const params = [customerId];

    if (listId) {
      query += ' AND list_id = $2';
      params.push(listId);
    }

    await pool.query(query, params);

    if (listId) {
      await pool.query(
        'UPDATE wishlist_lists SET item_count = 0, updated_at = NOW() WHERE id = $1',
        [listId]
      );
    }

    res.json({ success: true, message: '✅ Wishlist cleared!' });

  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== ALERTS ====================

// Set Price Alert
exports.setPriceAlert = async (req, res) => {
  try {
    const userId = req.user.id;
    const { wishlistId, threshold } = req.body;

    const wishlistItem = await pool.query(
      'SELECT product_id FROM wishlists WHERE id = $1 AND customer_id = $2',
      [wishlistId, userId]
    );

    if (wishlistItem.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Wishlist item not found!' });
    }

    await pool.query(
      `UPDATE wishlist_alerts 
       SET alert_threshold = $1, is_active = true
       WHERE user_id = $2 AND product_id = $3`,
      [threshold, userId, wishlistItem.rows[0].product_id]
    );

    res.json({ success: true, message: '✅ Price alert set!' });

  } catch (error) {
    console.error('Set price alert error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Active Alerts
exports.getAlerts = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT a.*, p.name as product_name, p.discount_price, p.stock_quantity, p.thumbnail
       FROM wishlist_alerts a
       JOIN products p ON a.product_id = p.id
       WHERE a.user_id = $1 AND a.is_active = true
       ORDER BY a.created_at DESC`,
      [userId]
    );

    const stockAlerts = await pool.query(
      `SELECT s.*, p.name as product_name, p.discount_price, p.thumbnail
       FROM wishlist_stock_alerts s
       JOIN products p ON s.product_id = p.id
       WHERE s.user_id = $1 AND s.is_active = true`,
      [userId]
    );

    res.json({
      success: true,
      priceAlerts: result.rows,
      stockAlerts: stockAlerts.rows
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Price Drops
exports.getPriceDrops = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT w.id as wishlist_id, w.added_price,
              p.id as product_id, p.name, p.base_price, p.discount_price, p.discount_percentage,
              p.thumbnail, p.stock_quantity,
              (w.added_price - COALESCE(p.discount_price, p.base_price)) as price_drop,
              ROUND(((w.added_price - COALESCE(p.discount_price, p.base_price)) / w.added_price * 100)::numeric, 1) as discount_percent
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       WHERE w.customer_id = $1 AND w.added_price > COALESCE(p.discount_price, p.base_price)
       ORDER BY (w.added_price - COALESCE(p.discount_price, p.base_price)) DESC`,
      [userId]
    );

    res.json({
      success: true,
      priceDrops: result.rows,
      totalSavings: result.rows.reduce((sum, item) => sum + parseFloat(item.price_drop), 0)
    });

  } catch (error) {
    console.error('Get price drops error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== ANALYTICS ====================

// Get Wishlist Analytics
exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalItems, priceDrops, outOfStock, inCart] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM wishlists WHERE customer_id = $1', [userId]),
      pool.query(
        `SELECT COUNT(*) as count FROM wishlists w
         JOIN products p ON w.product_id = p.id
         WHERE w.customer_id = $1 AND w.added_price > COALESCE(p.discount_price, p.base_price)`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM wishlists w
         JOIN products p ON w.product_id = p.id
         WHERE w.customer_id = $1 AND p.stock_quantity = 0`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT w.product_id) as count FROM wishlists w
         JOIN cart_items c ON w.product_id = c.product_id
         WHERE w.customer_id = $1`,
        [userId]
      )
    ]);

    const topCategories = await pool.query(
      `SELECT c.name, COUNT(*) as count
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE w.customer_id = $1
       GROUP BY c.name
       ORDER BY count DESC
       LIMIT 5`,
      [userId]
    );

    const recentItems = await pool.query(
      `SELECT p.name, p.discount_price, p.thumbnail, w.created_at
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       WHERE w.customer_id = $1
       ORDER BY w.created_at DESC
       LIMIT 5`,
      [userId]
    );

    res.json({
      success: true,
      analytics: {
        totalItems: parseInt(totalItems.rows[0].count),
        priceDrops: parseInt(priceDrops.rows[0].count),
        outOfStock: parseInt(outOfStock.rows[0].count),
        inCart: parseInt(inCart.rows[0].count),
        topCategories: topCategories.rows,
        recentItems: recentItems.rows
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Add from Shared Wishlist
exports.addFromShared = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shareToken } = req.params;
    const { productId } = req.body;

    // Get the shared list
    const listResult = await pool.query(
      'SELECT id FROM wishlist_lists WHERE share_token = $1 AND is_public = true',
      [shareToken]
    );

    if (listResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shared wishlist not found!' });
    }

    const listId = listResult.rows[0].id;

    // Check if product exists in shared list
    const itemCheck = await pool.query(
      'SELECT product_id FROM wishlists WHERE list_id = $1 AND product_id = $2',
      [listId, productId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found in this wishlist!' });
    }

    // Check if already in user's wishlist
    const existing = await pool.query(
      'SELECT id FROM wishlists WHERE customer_id = $1 AND product_id = $2 AND list_id IS NULL',
      [userId, productId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Already in your wishlist!' });
    }

    // Get product price
    const product = await pool.query('SELECT base_price, discount_price FROM products WHERE id = $1', [productId]);
    const price = product.rows[0].discount_price || product.rows[0].base_price;

    // Add to user's wishlist
    await pool.query(
      `INSERT INTO wishlists (id, customer_id, product_id, added_price)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), userId, productId, price]
    );

    res.json({ success: true, message: '✅ Added to your wishlist!' });

  } catch (error) {
    console.error('Add from shared error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
