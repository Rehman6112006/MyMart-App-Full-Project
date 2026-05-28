const pool = require('../config/database');

const logActivity = async (adminId, action, entityType, entityId, details, ipAddress) => {
  try {
    await pool.query(
      `INSERT INTO admin_activity_logs (admin_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, action, entityType, entityId, JSON.stringify(details), ipAddress]
    );
  } catch (error) {
    console.error('Activity log error:', error);
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const period = Math.max(1, parseInt(req.query.period) || 30);

    const usersResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE role = 'customer') as customers,
        COUNT(*) FILTER (WHERE role = 'vendor') as vendors,
        COUNT(*) FILTER (WHERE role = 'admin') as admins,
        COUNT(*) as total
      FROM users
    `);

    const storesResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_verified = true) as verified,
        COUNT(*) as total
      FROM stores
    `);

    const ordersResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE order_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE order_status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE order_status = 'processing') as processing,
        COUNT(*) FILTER (WHERE order_status = 'shipped') as shipped,
        COUNT(*) FILTER (WHERE order_status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE order_status = 'cancelled') as cancelled,
        COUNT(*) as total
      FROM orders
    `);

    const revenueResult = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'completed'), 0) as total_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'completed' AND created_at >= NOW() - $1::int * INTERVAL '1 day'), 0) as revenue_period,
        COUNT(*) FILTER (WHERE payment_status = 'completed' AND created_at >= NOW() - $1::int * INTERVAL '1 day') as orders_period
      FROM orders
    `, [period]);

    const pendingResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM stores WHERE is_verified = false AND is_active = true) as pending_stores
    `);

    const ordersChart = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
        COUNT(*) as orders,
        SUM(total_amount) as revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    const topCategories = await pool.query(`
      SELECT 
        c.name,
        COUNT(p.id) as products_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY products_count DESC
      LIMIT 5
    `);

    const adminStoreResult = await pool.query(
      `SELECT id, store_name, is_active, is_verified FROM stores WHERE owner_id = $1`,
      [userId]
    );

    // Pending payments (COD orders)
    const pendingPaymentsResult = await pool.query(
      `SELECT 
        COUNT(*)::int as count,
        COALESCE(SUM(total_amount), 0) as total_amount
       FROM orders
       WHERE payment_method = 'cod' AND status != 'cancelled'`
    );

    res.json({
      success: true,
      stats: {
        users: usersResult.rows[0],
        stores: storesResult.rows[0],
        orders: ordersResult.rows[0],
        revenue: revenueResult.rows[0],
        commission: { total_commission: 0, pending_commission: 0, paid_commission: 0 },
        pending: pendingResult.rows[0],
        pendingPayments: {
          count: pendingPaymentsResult.rows[0].count,
          totalAmount: parseFloat(pendingPaymentsResult.rows[0].total_amount)
        },
        adminStore: adminStoreResult.rows[0] || null
      },
      charts: {
        ordersByMonth: ordersChart.rows,
        topCategories: topCategories.rows
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, email, first_name, last_name, phone, role, is_active, email_verified, created_at
      FROM users
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (role) {
      query += ` AND role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    if (search) {
      query += ` AND (email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countParams = [];
    if (role) {
      countQuery += ` AND role = $${countParams.length + 1}`;
      countParams.push(role);
    }
    if (search) {
      countQuery += ` AND (email ILIKE $${countParams.length + 1} OR first_name ILIKE $${countParams.length + 1} OR last_name ILIKE $${countParams.length + 1})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      count: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / limit),
      users: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const adminId = req.user.id;

    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, is_active',
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await logActivity(adminId, 'update_user_status', 'user', id, { is_active }, req.ip);

    res.json({ success: true, message: '✅ User status updated!', user: result.rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, phone, role, is_active, email_verified, phone_verified, profile_picture, created_at FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.role === 'vendor') {
      const storeResult = await pool.query(
        'SELECT id, store_name, is_active, is_verified FROM stores WHERE owner_id = $1',
        [id]
      );
      user.store = storeResult.rows[0];
    }

    const orderResult = await pool.query(
      'SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_spent FROM orders WHERE customer_id = $1 AND payment_status = $2',
      [id, 'completed']
    );
    user.orderStats = orderResult.rows[0];

    res.json({ success: true, user });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    if (String(id) === String(adminId)) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account!' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const userToDelete = userResult.rows[0];

    if (userToDelete.role === 'admin') {
      return res.status(400).json({ success: false, error: 'Cannot delete admin accounts!' });
    }

    const safeDelete = async (query, params, description) => {
      try {
        await pool.query(query, params);
        console.log(`Deleted: ${description}`);
      } catch (e) {
        console.log(`Skip/Error ${description}: ${e.message}`);
      }
    };

    if (userToDelete.role === 'vendor') {
      const storeResult = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [id]);

      if (storeResult.rows.length > 0) {
        const storeId = storeResult.rows[0].id;

        await safeDelete('DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE store_id = $1)', [storeId], 'product_variants');
        await safeDelete('DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE store_id = $1)', [storeId], 'product_images');
        await safeDelete('DELETE FROM products WHERE store_id = $1', [storeId], 'store products');
        await safeDelete('DELETE FROM stores WHERE id = $1', [storeId], 'store');
      }

      await safeDelete('DELETE FROM products WHERE vendor_id = $1', [id], 'vendor products');
    }

    await safeDelete('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [id], 'order_items by user');
    await safeDelete('DELETE FROM order_items WHERE vendor_id = $1', [id], 'order_items by vendor');

    await safeDelete('DELETE FROM orders WHERE user_id = $1', [id], 'user orders');
    await safeDelete('DELETE FROM orders WHERE vendor_id = $1', [id], 'vendor orders');

    await safeDelete('DELETE FROM cart_items WHERE user_id = $1', [id], 'cart_items');
    await safeDelete('DELETE FROM cart WHERE user_id = $1', [id], 'cart');

    await safeDelete('DELETE FROM delivery_addresses WHERE user_id = $1', [id], 'delivery_addresses');

    await safeDelete('DELETE FROM reviews WHERE customer_id = $1', [id], 'reviews');

    await safeDelete('DELETE FROM wishlists WHERE user_id = $1', [id], 'wishlists');
    await safeDelete('DELETE FROM wishlist_lists WHERE customer_id = $1', [id], 'wishlist_lists');

    await safeDelete('DELETE FROM notifications WHERE user_id = $1', [id], 'notifications');

    await safeDelete('DELETE FROM admin_activity_logs WHERE admin_id = $1', [id], 'admin_activity_logs');

    await safeDelete('DELETE FROM user_saved_cards WHERE user_id = $1', [id], 'saved_cards');

    await safeDelete('DELETE FROM email_verification_otps WHERE email = $1', [userToDelete.email], 'email_otps');

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    try {
      await logActivity(adminId, 'delete_user', 'user', id, {
        deleted_email: userToDelete.email,
        role: userToDelete.role
      }, req.ip);
    } catch (e) {
      console.log('Could not log activity:', e.message);
    }

    res.json({
      success: true,
      message: 'User and all related data permanently deleted!'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getAllVendors = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.is_active as user_active,
        u.created_at,
        s.id as store_id,
        s.store_name,
        s.store_slug,
        s.is_active as store_active,
        s.is_verified as store_verified,
        COALESCE(s.total_products, 0) as total_products,
        COALESCE(s.total_orders, 0) as total_orders,
        COALESCE(s.total_revenue, 0) as total_revenue,
        COALESCE(s.avg_rating, 0) as avg_rating
      FROM users u
      LEFT JOIN stores s ON u.id = s.owner_id
      WHERE u.role = 'vendor'
    `;
    const params = [];
    let paramCount = 1;

    if (status === 'pending') {
      query += ` AND (u.is_active = false OR COALESCE(s.is_verified, false) = false)`;
    } else if (status === 'approved') {
      query += ` AND u.is_active = true AND COALESCE(s.is_verified, true) = true`;
    } else if (status === 'suspended') {
      query += ` AND (u.is_active = false OR COALESCE(s.is_active, false) = false)`;
    } else if (status === 'pending_account') {
      query += ` AND s.id IS NULL`;
    } else if (status === 'pending_store') {
      query += ` AND s.id IS NOT NULL AND s.is_verified = false`;
    }

    if (search) {
      query += ` AND (s.store_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const vendors = result.rows.map(row => ({
      id: row.store_id || row.user_id,
      user_id: row.user_id,
      store_id: row.store_id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      store_name: row.store_name || 'No Store Created',
      store_slug: row.store_slug,
      is_active: row.store_active ?? row.user_active,
      is_verified: row.store_verified ?? false,
      has_store: !!row.store_id,
      user_active: row.user_active,
      created_at: row.created_at,
      total_products: row.total_products || 0,
      total_orders: row.total_orders || 0,
      total_revenue: parseFloat(row.total_revenue) || 0,
      avg_rating: parseFloat(row.avg_rating) || 0
    }));

    res.json({ success: true, vendors });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.approveVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const vendorInfo = await pool.query(
      `SELECT u.id as user_id, s.id as store_id 
       FROM users u 
       LEFT JOIN stores s ON u.id = s.owner_id 
       WHERE u.id = $1 AND u.role = 'vendor'`,
      [id]
    );

    if (vendorInfo.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const vendor = vendorInfo.rows[0];

    await pool.query(
      `UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1`,
      [vendor.user_id]
    );

    let storeResult = null;
    if (vendor.store_id) {
      const result = await pool.query(
        `UPDATE stores SET is_verified = true, is_active = true, updated_at = NOW() 
         WHERE id = $1 RETURNING *`,
        [vendor.store_id]
      );
      storeResult = result.rows[0];
    }

    await logActivity(adminId, 'approve_vendor', 'user', vendor.user_id, { storeId: vendor.store_id }, req.ip);

    res.json({
      success: true,
      message: vendor.store_id
        ? '✅ Vendor and store approved! They can now add products.'
        : '✅ Vendor account approved! They can now login and create their store.',
      store: storeResult
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.suspendVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    const result = await pool.query(
      'UPDATE stores SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    await logActivity(adminId, 'suspend_vendor', 'store', id, { reason }, req.ip);

    res.json({ success: true, message: '✅ Vendor suspended!' });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.reactivateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const result = await pool.query(
      'UPDATE stores SET is_active = true WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    await logActivity(adminId, 'reactivate_vendor', 'store', id, {}, req.ip);

    res.json({ success: true, message: '✅ Vendor reactivated!' });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.approveStore = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const result = await pool.query(
      `UPDATE stores SET is_verified = true, is_active = true, updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    const store = result.rows[0];
    await pool.query('UPDATE users SET is_active = true WHERE id = $1 AND is_active = false', [store.owner_id]);
    await logActivity(adminId, 'approve_store', 'store', id, {}, req.ip);

    res.json({
      success: true,
      message: '✅ Store approved! Vendor can now login and manage their store.',
      store: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getCommissionSummary = async (req, res) => {
  try {
    res.json({
      success: true,
      summary: {
        pending_commission: 0,
        paid_commission: 0,
        total_transactions: 0,
        message: 'Commission tracking will be available after Phase 13'
      },
      topVendors: []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.processPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, transaction_id, notes } = req.body;
    const adminId = req.user.id;

    const result = await pool.query(
      `UPDATE vendor_payouts 
       SET status = 'completed', 
           payment_method = $1, 
           transaction_id = $2, 
           notes = $3,
           processed_by = $4,
           processed_at = NOW()
       WHERE id = $5 AND status = 'pending'
       RETURNING *`,
      [payment_method, transaction_id, notes, adminId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payout not found or already processed' });
    }

    await logActivity(adminId, 'process_payout', 'payout', id, { amount: result.rows[0].net_amount }, req.ip);

    res.json({ success: true, message: '✅ Payout processed!', payout: result.rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.generateReport = async (req, res) => {
  try {
    const { type, start_date, end_date } = req.body;
    const adminId = req.user.id;

    let reportData = [];

    switch (type) {
      case 'sales':
        const salesData = await pool.query(`
          SELECT 
            DATE(o.created_at) as date,
            COUNT(*) as orders,
            SUM(o.total_amount) as revenue
          FROM orders o
          WHERE o.created_at BETWEEN $1 AND $2 AND o.payment_status = 'completed'
          GROUP BY DATE(o.created_at)
          ORDER BY date
        `, [start_date, end_date]);
        reportData = salesData.rows;
        break;

      case 'customers':
        const customersData = await pool.query(`
          SELECT 
            CONCAT(u.first_name, ' ', u.last_name) as name,
            u.email, u.phone,
            COUNT(o.id) as total_orders,
            COALESCE(SUM(o.total_amount), 0) as lifetime_value
          FROM users u
          LEFT JOIN orders o ON o.customer_id = u.id AND o.payment_status = 'completed'
          WHERE u.role = 'customer'
          GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone
          ORDER BY lifetime_value DESC
          LIMIT 100
        `);
        reportData = customersData.rows;
        break;

      default:
        return res.status(400).json({ success: false, error: 'Invalid report type' });
    }

    const report = await pool.query(
      `INSERT INTO reports (report_type, report_name, parameters, generated_by, status, completed_at)
       VALUES ($1, $2, $3, $4, 'completed', NOW())
       RETURNING *`,
      [type, `${type}_report_${Date.now()}`, JSON.stringify({ start_date, end_date }), adminId]
    );

    res.json({
      success: true,
      message: '✅ Report generated!',
      report: report.rows[0],
      data: reportData
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
             COALESCE((SELECT COUNT(*) FROM products p WHERE p.category_id = c.id), 0) as product_count,
             COALESCE((SELECT COUNT(DISTINCT p.store_id) FROM products p WHERE p.category_id = c.id), 0) as vendor_count
      FROM categories c
      ORDER BY c.is_featured DESC, c.name ASC
    `);

    res.json({ success: true, categories: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, store_id } = req.query;
    const offset = (page - 1) * limit;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      WHERE p.category_id = $1
    `;
    const countParams = [id];

    if (store_id) {
      countQuery += ` AND p.store_id = $2`;
      countParams.push(store_id);
    }

    const countResult = await pool.query(countQuery, countParams);

    let query = `
      SELECT p.*, 
             s.store_name,
             s.store_slug,
             COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '') as vendor_name,
             c.name as category_name
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN users u ON p.vendor_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = $1
    `;
    const params = [id];
    let paramCount = 2;

    if (store_id) {
      query += ` AND p.store_id = $${paramCount}`;
      params.push(store_id);
      paramCount++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({ 
      success: true, 
      products: result.rows,
      total: parseInt(countResult.rows[0]?.total || 0),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countResult.rows[0]?.total || 0) / limit)
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getReports = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, CONCAT(u.first_name, ' ', u.last_name) as generated_by_name
       FROM reports r
       LEFT JOIN users u ON r.generated_by = u.id
       ORDER BY r.created_at DESC
       LIMIT 50`
    );

    res.json({ success: true, reports: result.rows });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const { public_only } = req.query;

    let query = 'SELECT * FROM platform_settings';
    if (public_only === 'true') {
      query += ' WHERE is_public = true';
    }

    const result = await pool.query(query);

    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = {
        value: row.setting_value,
        type: row.setting_type,
        description: row.description
      };
    });

    res.json({ success: true, settings });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    const adminId = req.user.id;

    const result = await pool.query(
      `UPDATE platform_settings 
       SET setting_value = $1, updated_at = NOW(), updated_by = $2
       WHERE setting_key = $3
       RETURNING *`,
      [value, adminId, key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Setting not found' });
    }

    await logActivity(adminId, 'update_setting', 'setting', key, { value }, req.ip);

    res.json({ success: true, message: '✅ Setting updated!', setting: result.rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getSalesAnalytics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const dailySales = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue
      FROM orders
      WHERE payment_status = 'completed'
        AND ($1::date IS NULL OR created_at >= $1)
        AND ($2::date IS NULL OR created_at <= $2)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, [start_date, end_date]);

    const categorySales = await pool.query(`
      SELECT 
        c.name as category,
        COUNT(p.id) as products_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY products_count DESC
    `);

    res.json({
      success: true,
      analytics: {
        dailySales: dailySales.rows,
        categorySales: categorySales.rows
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(`
      SELECT 
        p.id, p.name, p.brand, p.base_price,
        c.name as category,
        s.store_name,
        p.average_rating
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN stores s ON p.store_id = s.id
      WHERE p.is_active = true
      ORDER BY p.average_rating DESC NULLS LAST
      LIMIT $1
    `, [limit]);

    res.json({ success: true, products: result.rows });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

console.log('✅ Admin Dashboard Controller Loaded');
