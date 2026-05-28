const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

exports.getAdminStore = async (req, res) => {
  try {
    const adminId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM stores WHERE owner_id = $1',
      [adminId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, store: null });
    }

    res.json({ success: true, store: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.createAdminStore = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { store_name, store_slug, description, phone, email, address, logo, banner } = req.body;

    const existing = await pool.query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [adminId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Admin already has a store' });
    }

    const slug = store_slug || store_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const result = await pool.query(
      `INSERT INTO stores (id, owner_id, store_name, store_slug, description, phone, email, address, logo, banner, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, true)
       RETURNING *`,
      [uuidv4(), adminId, store_name, slug, description, phone, email, address, logo, banner]
    );

    res.status(201).json({ success: true, message: '✅ Admin store created!', store: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateAdminStore = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { store_name, description, phone, email, address, logo, banner } = req.body;

    const result = await pool.query(
      `UPDATE stores SET 
        store_name = COALESCE($1, store_name),
        description = COALESCE($2, description),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        address = COALESCE($5, address),
        logo = COALESCE($6, logo),
        banner = COALESCE($7, banner),
        updated_at = NOW()
       WHERE owner_id = $8
       RETURNING *`,
      [store_name, description, phone, email, address, logo, banner, adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    res.json({ success: true, message: '✅ Store updated!', store: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getAdminStoreProducts = async (req, res) => {
  try {
    const adminId = req.user.id;

    const storeResult = await pool.query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [adminId]
    );

    if (storeResult.rows.length === 0) {
      return res.json({ success: true, products: [], hasStore: false });
    }

    const storeId = storeResult.rows[0].id;

    const result = await pool.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.store_id = $1
       ORDER BY p.created_at DESC`,
      [storeId]
    );

    res.json({ success: true, products: result.rows, hasStore: true, storeId });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.createAdminStoreProduct = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { name, description, sku, category_id, brand, base_price, discount_percentage, stock_quantity, image_url, thumbnail, is_active } = req.body;

    const storeResult = await pool.query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [adminId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Create your admin store first' });
    }

    const storeId = storeResult.rows[0].id;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    const productSku = sku || `ADM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const discountPrice = discount_percentage ? base_price - (base_price * discount_percentage / 100) : base_price;

    const result = await pool.query(
      `INSERT INTO products (id, store_id, vendor_id, name, slug, description, sku, category_id, brand,
        base_price, discount_percentage, discount_price, stock_quantity, is_active, image_url, thumbnail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [uuidv4(), storeId, adminId, name, slug, description, productSku, category_id, brand,
       base_price, discount_percentage || 0, discountPrice, stock_quantity || 0, is_active !== false, image_url, thumbnail]
    );

    res.status(201).json({ success: true, message: '✅ Product added to admin store!', product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateAdminStoreProduct = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { name, description, base_price, discount_percentage, stock_quantity, is_active, category_id, brand, image_url, thumbnail } = req.body;

    const storeResult = await pool.query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [adminId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No admin store found' });
    }

    const storeId = storeResult.rows[0].id;

    const check = await pool.query(
      'SELECT id FROM products WHERE id = $1 AND store_id = $2',
      [id, storeId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Product not found in your store' });
    }

    const discountPrice = discount_percentage ? base_price - (base_price * discount_percentage / 100) : base_price;

    const result = await pool.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        base_price = COALESCE($3, base_price),
        discount_percentage = COALESCE($4, discount_percentage),
        discount_price = $5,
        stock_quantity = COALESCE($6, stock_quantity),
        is_active = COALESCE($7, is_active),
        category_id = COALESCE($8, category_id),
        brand = COALESCE($9, brand),
        image_url = COALESCE($10, image_url),
        thumbnail = COALESCE($11, thumbnail),
        updated_at = NOW()
       WHERE id = $12 AND store_id = $13
       RETURNING *`,
      [name, description, base_price, discount_percentage, discountPrice, stock_quantity, is_active, category_id, brand, image_url, thumbnail, id, storeId]
    );

    res.json({ success: true, message: '✅ Product updated!', product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.deleteAdminStoreProduct = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;

    const storeResult = await pool.query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [adminId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No admin store found' });
    }

    const storeId = storeResult.rows[0].id;

    const check = await pool.query(
      'SELECT id FROM products WHERE id = $1 AND store_id = $2',
      [id, storeId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Product not found in your store' });
    }

    await pool.query('DELETE FROM order_items WHERE product_id = $1', [id]);
    await pool.query('DELETE FROM cart_items WHERE product_id = $1', [id]);
    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    res.json({ success: true, message: '✅ Product deleted!' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getAdminStoreOrderStats = async (req, res) => {
  try {
    const adminId = req.user.id;

    const storeResult = await pool.query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [adminId]
    );

    if (storeResult.rows.length === 0) {
      return res.json({ success: true, stats: null, hasStore: false });
    }

    const storeId = storeResult.rows[0].id;

    const result = await pool.query(
      `SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'confirmed')::int as confirmed,
        COUNT(*) FILTER (WHERE status = 'processing')::int as processing,
        COUNT(*) FILTER (WHERE status = 'shipped')::int as shipped,
        COUNT(*) FILTER (WHERE status = 'delivered')::int as delivered,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancelled,
        COUNT(*) FILTER (WHERE status = 'refunded')::int as refunded,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders WHERE store_id = $1`,
      [storeId]
    );

    res.json({ success: true, stats: result.rows[0], hasStore: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getAdminStoreOrders = async (req, res) => {
  try {
    const adminId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const storeResult = await pool.query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [adminId]
    );

    if (storeResult.rows.length === 0) {
      return res.json({ success: true, orders: [], hasStore: false, total: 0, page: 1, pages: 0 });
    }

    const storeId = storeResult.rows[0].id;

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM orders WHERE store_id = $1 OR vendor_id = $2',
      [storeId, adminId]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await pool.query(
      `SELECT o.*, u.first_name, u.last_name, u.email,
              da.name as address_name, da.phone as address_phone,
              da.address_line1, da.address_line2, da.city, da.postal_code
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       LEFT JOIN delivery_addresses da ON o.delivery_address_id = da.id
       WHERE o.store_id = $1 OR o.vendor_id = $2
       ORDER BY o.created_at DESC
       LIMIT $3 OFFSET $4`,
      [storeId, adminId, limit, offset]
    );

    for (const order of result.rows) {
      const items = await pool.query(
        `SELECT oi.*, p.name as product_name, p.thumbnail as product_image
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = items.rows;
      order.order_status = order.status;

      const history = await pool.query(
        'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC',
        [order.id]
      );
      order.status_history = history.rows;
    }

    res.json({ success: true, orders: result.rows, hasStore: true, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateAdminStoreOrderStatus = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    const storeResult = await pool.query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [adminId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No admin store found' });
    }

    const storeId = storeResult.rows[0].id;

    const check = await pool.query(
      'SELECT id FROM orders WHERE id = $1 AND store_id = $2',
      [id, storeId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Order not found in your store' });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    // Auto-mark payment as received when delivered
    if (status === 'delivered') {
      await pool.query(
        "UPDATE orders SET payment_status = 'paid' WHERE id = $1",
        [id]
      );
      await pool.query(
        "UPDATE orders SET payment_status = 'paid' WHERE status = 'delivered' AND payment_method = 'cod' AND payment_status = 'pending'"
      );
    }

    const notes = {
      'confirmed': 'Order confirmed by admin',
      'preparing': 'Order preparation started',
      'processing': 'Order is being processed',
      'shipped': 'Order shipped',
      'out_for_delivery': 'Assigned for delivery',
      'delivered': 'Order delivered successfully',
      'cancelled': 'Order cancelled by admin',
      'refunded': 'Order refunded'
    };

    await pool.query(
      'INSERT INTO order_status_history (order_id, status, notes, updated_by) VALUES ($1, $2, $3, $4)',
      [id, status, notes[status] || 'Status updated', adminId]
    );

    res.json({ success: true, message: 'Order status updated', order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================
// COD PAYMENT — Mark as Received (Admin Store)
// ============================================

exports.markAdminStorePaymentReceived = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;

    const storeResult = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [adminId]);
    if (storeResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No admin store found' });
    }
    const storeId = storeResult.rows[0].id;

    const check = await pool.query('SELECT * FROM orders WHERE id = $1 AND store_id = $2', [id, storeId]);
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Order not found in your store' });
    }

    const order = check.rows[0];
    if (order.payment_method !== 'cod') {
      return res.status(400).json({ success: false, error: 'Only COD orders can be marked as payment received' });
    }
    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, error: 'Order must be delivered before marking payment as received' });
    }

    const result = await pool.query(
      `UPDATE orders SET payment_status = 'paid', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    await pool.query(
      'INSERT INTO order_status_history (order_id, status, notes, updated_by) VALUES ($1, $2, $3, $4)',
      [id, 'payment_received', 'Payment collected for COD order', adminId]
    );

    res.json({ success: true, message: 'Payment marked as received', order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
