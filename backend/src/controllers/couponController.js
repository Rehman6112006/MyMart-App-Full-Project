// ==================== COUPON CONTROLLER ====================
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ==================== CUSTOMER APIs ====================

// Get Available Coupons (Public - for customers)
exports.getAvailableCoupons = async (req, res) => {
  try {
    const userId = req.user?.id || null;

    const result = await pool.query(
      `SELECT id, code, description, discount_type, discount_value, 
              min_order_amount, max_discount_amount, start_date, end_date,
              applicable_stores, applicable_categories
       FROM coupons 
       WHERE is_active = true 
         AND start_date <= NOW() 
         AND end_date >= NOW()
         AND (usage_limit IS NULL OR usage_count < usage_limit)
         AND (
           is_public = true
           OR (applicable_users IS NOT NULL AND $1 = ANY(applicable_users))
         )
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      coupons: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Validate & Preview Coupon (before applying to cart)
exports.validateCoupon = async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Coupon code is required!' });
    }

    // Get coupon details
    const couponResult = await pool.query(
      `SELECT * FROM coupons WHERE code = $1 AND UPPER(code) = UPPER($1)`,
      [code]
    );

    if (couponResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid coupon code!' });
    }

    const coupon = couponResult.rows[0];
    const errors = [];
    const warnings = [];

    // Check if active
    if (!coupon.is_active) {
      errors.push('This coupon is no longer active.');
    }

    // Check dates
    const now = new Date();
    if (new Date(coupon.start_date) > now) {
      errors.push('This coupon is not yet valid.');
    }
    if (new Date(coupon.end_date) < now) {
      errors.push('This coupon has expired.');
    }

    // Check global usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      errors.push('This coupon has reached its usage limit.');
    }

    // Check if coupon is targeted to specific users
    if (coupon.applicable_users && coupon.applicable_users.length > 0) {
      const isTargeted = coupon.applicable_users.some(id => id === userId);
      if (!isTargeted) {
        errors.push('This coupon is not available for your account.');
      }
    }

    // Check per-user usage limit
    const userUsageResult = await pool.query(
      'SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = $1 AND user_id = $2',
      [coupon.id, userId]
    );
    const userUsageCount = parseInt(userUsageResult.rows[0].count);
    if (coupon.per_user_limit && userUsageCount >= coupon.per_user_limit) {
      errors.push('You have already used this coupon the maximum number of times.');
    }

    // Check minimum order amount
    const orderAmount = parseFloat(subtotal) || 0;
    if (coupon.min_order_amount && orderAmount < parseFloat(coupon.min_order_amount)) {
      errors.push(`Minimum order amount is ₹${coupon.min_order_amount} to use this coupon.`);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        valid: false,
        errors
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (orderAmount * parseFloat(coupon.discount_value)) / 100;
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount_amount));
      }
    } else if (coupon.discount_type === 'fixed_amount') {
      discountAmount = Math.min(parseFloat(coupon.discount_value), orderAmount);
    } else if (coupon.discount_type === 'free_shipping') {
      discountAmount = 200; // Assume shipping cost
      warnings.push('Free shipping will be applied to your order.');
    }

    const newTotal = orderAmount - discountAmount;

    res.json({
      success: true,
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        discountAmount: discountAmount.toFixed(2),
        originalAmount: orderAmount.toFixed(2),
        newTotal: Math.max(0, newTotal).toFixed(2)
      },
      warnings
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get My Coupon History
exports.getMyCouponHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT cu.*, c.code, c.discount_type, c.discount_value, o.order_number
       FROM coupon_usages cu
       JOIN coupons c ON cu.coupon_id = c.id
       LEFT JOIN orders o ON cu.order_id = o.id
       WHERE cu.user_id = $1
       ORDER BY cu.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      usages: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== ADMIN APIs ====================

// Create Coupon (Admin only)
exports.createCoupon = async (req, res) => {
  try {
    const {
      code, description, discountType, discountValue, minOrderAmount,
      maxDiscountAmount, usageLimit, perUserLimit, startDate, endDate,
      isPublic, applicableStores, applicableCategories
    } = req.body;
    const createdBy = req.user.id;

    // Validation
    if (!code || !discountType || discountValue == null || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Code, discount type, value, start date, and end date are required!' 
      });
    }

    if (!['percentage', 'fixed_amount', 'free_shipping'].includes(discountType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid discount type!' 
      });
    }

    if (discountType === 'percentage' && (discountValue < 1 || discountValue > 100)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Percentage must be between 1 and 100!' 
      });
    }

    // Check if code already exists
    const existing = await pool.query(
      'SELECT id FROM coupons WHERE UPPER(code) = UPPER($1)',
      [code]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Coupon code already exists!' });
    }

    const result = await pool.query(
      `INSERT INTO coupons (
        code, description, discount_type, discount_value, min_order_amount,
        max_discount_amount, usage_limit, per_user_limit, start_date, end_date,
        is_public, applicable_stores, applicable_categories, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        code.toUpperCase(), description || null, discountType, discountValue,
        minOrderAmount || 0, maxDiscountAmount || null, usageLimit || null,
        perUserLimit || 1, startDate, endDate, isPublic !== false,
        applicableStores || null, applicableCategories || null, createdBy
      ]
    );

    res.status(201).json({
      success: true,
      message: '✅ Coupon created successfully!',
      coupon: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get All Coupons (Admin)
exports.getAllCoupons = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT c.*, u.first_name as created_by_name
      FROM coupons c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status === 'active') {
      query += ` AND c.is_active = true AND c.end_date >= NOW()`;
    } else if (status === 'expired') {
      query += ` AND c.end_date < NOW()`;
    } else if (status === 'exhausted') {
      query += ` AND c.usage_limit IS NOT NULL AND c.usage_count >= c.usage_limit`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (c.code ILIKE $${params.length} OR c.description ILIKE $${params.length})`;
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      coupons: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Single Coupon (Admin)
exports.getCouponById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.*, u.first_name as created_by_name
       FROM coupons c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Coupon not found!' });
    }

    // Get usage statistics
    const usageStats = await pool.query(
      `SELECT 
        COUNT(*) as total_usages,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(discount_applied) as total_discount_given,
        AVG(discount_applied) as avg_discount
       FROM coupon_usages WHERE coupon_id = $1`,
      [id]
    );

    // Get recent usages
    const recentUsages = await pool.query(
      `SELECT cu.*, o.order_number, u.first_name, u.last_name, u.email
       FROM coupon_usages cu
       LEFT JOIN orders o ON cu.order_id = o.id
       LEFT JOIN users u ON cu.user_id = o.id
       WHERE cu.coupon_id = $1
       ORDER BY cu.created_at DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      success: true,
      coupon: result.rows[0],
      stats: usageStats.rows[0],
      recentUsages: recentUsages.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update Coupon (Admin)
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      description, discountType, discountValue, minOrderAmount,
      maxDiscountAmount, usageLimit, perUserLimit, startDate, endDate,
      isActive, isPublic, applicableStores, applicableCategories
    } = req.body;

    // Check if coupon exists
    const existing = await pool.query('SELECT * FROM coupons WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Coupon not found!' });
    }

    const result = await pool.query(
      `UPDATE coupons SET
        description = COALESCE($1, description),
        discount_type = COALESCE($2, discount_type),
        discount_value = COALESCE($3, discount_value),
        min_order_amount = COALESCE($4, min_order_amount),
        max_discount_amount = COALESCE($5, max_discount_amount),
        usage_limit = COALESCE($6, usage_limit),
        per_user_limit = COALESCE($7, per_user_limit),
        start_date = COALESCE($8, start_date),
        end_date = COALESCE($9, end_date),
        is_active = COALESCE($10, is_active),
        is_public = COALESCE($11, is_public),
        applicable_stores = COALESCE($12, applicable_stores),
        applicable_categories = COALESCE($13, applicable_categories),
        updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        description, discountType, discountValue, minOrderAmount,
        maxDiscountAmount, usageLimit, perUserLimit, startDate, endDate,
        isActive, isPublic, applicableStores, applicableCategories, id
      ]
    );

    res.json({
      success: true,
      message: '✅ Coupon updated successfully!',
      coupon: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Delete Coupon (Admin)
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM coupons WHERE id = $1 RETURNING id, code',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Coupon not found!' });
    }

    res.json({
      success: true,
      message: `✅ Coupon ${result.rows[0].code} deleted successfully!`
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Toggle Coupon Status (Admin)
exports.toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE coupons SET is_active = NOT is_active, updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Coupon not found!' });
    }

    const status = result.rows[0].is_active ? 'activated' : 'deactivated';
    res.json({
      success: true,
      message: `✅ Coupon ${status}!`,
      coupon: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Coupon Analytics (Admin)
exports.getCouponAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      params.push(startDate, endDate);
      dateFilter = `WHERE cu.created_at BETWEEN $1 AND $2`;
    }

    // Overall stats
    const overallStats = await pool.query(
      `SELECT 
        COUNT(*) as total_usages,
        COUNT(DISTINCT cu.coupon_id) as total_coupons_used,
        COUNT(DISTINCT cu.user_id) as total_users,
        SUM(cu.discount_applied) as total_discount_given,
        AVG(cu.discount_applied) as avg_discount
       FROM coupon_usages cu
       ${dateFilter}`,
      params
    );

    // Top performing coupons
    const topCoupons = await pool.query(
      `SELECT c.code, c.discount_type, COUNT(cu.id) as usage_count, 
              SUM(cu.discount_applied) as total_discount
       FROM coupons c
       JOIN coupon_usages cu ON c.id = cu.coupon_id
       ${dateFilter ? 'WHERE cu.created_at BETWEEN $1 AND $2' : ''}
       GROUP BY c.id, c.code, c.discount_type
       ORDER BY usage_count DESC
       LIMIT 10`,
      params
    );

    // Coupons by status
    const statusBreakdown = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE is_active = true AND end_date >= NOW()) as active,
        COUNT(*) FILTER (WHERE end_date < NOW()) as expired,
        COUNT(*) FILTER (WHERE usage_limit IS NOT NULL AND usage_count >= usage_limit) as exhausted,
        COUNT(*) FILTER (WHERE is_active = false) as deactivated
       FROM coupons`
    );

    res.json({
      success: true,
      overall: overallStats.rows[0],
      topCoupons: topCoupons.rows,
      statusBreakdown: statusBreakdown.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== VENDOR COUPON APIs ====================

exports.getVendorCoupons = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const storeResult = await pool.query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [vendorId]
    );

    if (storeResult.rows.length === 0) {
      return res.json({ success: true, coupons: [], message: 'Create a store first' });
    }

    const storeId = storeResult.rows[0].id;

    const result = await pool.query(
      `SELECT * FROM coupons 
       WHERE created_by = $1 OR $2 = ANY(applicable_stores)
       ORDER BY created_at DESC`,
      [vendorId, storeId]
    );

    res.json({ success: true, count: result.rows.length, coupons: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.createVendorCoupon = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const b = req.body;
    const code = b.code;
    const description = b.description;
    const discountType = b.discountType || b.discount_type;
    const discountValue = b.discountValue ?? b.discount_value;
    const minOrderAmount = b.minOrderAmount ?? b.min_order_amount;
    const maxDiscountAmount = b.maxDiscountAmount ?? b.max_discount_amount;
    const usageLimit = b.usageLimit ?? b.usage_limit;
    const perUserLimit = b.perUserLimit ?? b.per_user_limit;
    const startDate = b.startDate || b.start_date;
    const endDate = b.endDate || b.end_date;
    const applicableUsers = b.applicableUsers || b.applicable_users;

    const storeResult = await pool.query(
      'SELECT id, store_name FROM stores WHERE owner_id = $1 AND is_active = true',
      [vendorId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'You need an active store to create coupons' });
    }

    const storeId = storeResult.rows[0].id;

    if (!code || !discountType || discountValue == null || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (!['percentage', 'fixed_amount', 'free_shipping'].includes(discountType)) {
      return res.status(400).json({ success: false, error: 'Invalid discount type' });
    }

    const existing = await pool.query(
      'SELECT id FROM coupons WHERE UPPER(code) = UPPER($1)',
      [code]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Coupon code already exists' });
    }

    // If applicableUsers is provided, set is_public to false (targeted coupon)
    const isTargeted = Array.isArray(applicableUsers) && applicableUsers.length > 0;
    const isPublic = !isTargeted;

    const result = await pool.query(
      `INSERT INTO coupons (
        code, description, discount_type, discount_value, min_order_amount,
        max_discount_amount, usage_limit, per_user_limit, start_date, end_date,
        is_public, applicable_stores, applicable_users, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        code.toUpperCase(), description || null, discountType, discountValue,
        minOrderAmount || 0, maxDiscountAmount || null, usageLimit || null,
        perUserLimit || 1, startDate, endDate, isPublic,
        [storeId],
        isTargeted ? applicableUsers : null, vendorId
      ]
    );

    res.status(201).json({ success: true, message: isTargeted ? '✅ Targeted coupon created!' : '✅ Coupon created for your store!', coupon: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateVendorCoupon = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;
    const b = req.body;
    const description = b.description;
    const discountValue = b.discountValue ?? b.discount_value;
    const minOrderAmount = b.minOrderAmount ?? b.min_order_amount;
    const maxDiscountAmount = b.maxDiscountAmount ?? b.max_discount_amount;
    const usageLimit = b.usageLimit ?? b.usage_limit;
    const perUserLimit = b.perUserLimit ?? b.per_user_limit;
    const startDate = b.startDate || b.start_date;
    const endDate = b.endDate || b.end_date;
    const isActive = b.isActive ?? b.is_active;
    const applicableUsers = b.applicableUsers || b.applicable_users;

    const storeResult = await pool.query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [vendorId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No store found' });
    }

    const check = await pool.query(
      'SELECT id FROM coupons WHERE id = $1 AND created_by = $2',
      [id, vendorId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Coupon not found or not yours' });
    }

    // If applicableUsers provided, update is_public accordingly
    const isTargeted = Array.isArray(applicableUsers);
    const applicableUsersValue = isTargeted ? (applicableUsers.length > 0 ? JSON.stringify(applicableUsers) : null) : undefined;

    const result = await pool.query(
      `UPDATE coupons SET
        description = COALESCE($1, description),
        discount_value = COALESCE($2, discount_value),
        min_order_amount = COALESCE($3, min_order_amount),
        max_discount_amount = COALESCE($4, max_discount_amount),
        usage_limit = COALESCE($5, usage_limit),
        per_user_limit = COALESCE($6, per_user_limit),
        start_date = COALESCE($7, start_date),
        end_date = COALESCE($8, end_date),
        is_active = COALESCE($9, is_active),
        is_public = CASE WHEN $12 IS NOT NULL THEN $12::boolean ELSE is_public END,
        applicable_users = CASE WHEN $13 IS NOT NULL THEN $13::uuid[] ELSE applicable_users END,
        updated_at = NOW()
       WHERE id = $10 AND created_by = $11
       RETURNING *`,
      [description, discountValue, minOrderAmount, maxDiscountAmount, usageLimit, perUserLimit, startDate, endDate, isActive, id, vendorId,
       isTargeted ? String(!isTargeted || applicableUsers.length === 0) : null,
       applicableUsersValue]
    );

    res.json({ success: true, message: '✅ Coupon updated!', coupon: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.deleteVendorCoupon = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM coupons WHERE id = $1 AND created_by = $2 RETURNING id, code',
      [id, vendorId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Coupon not found or not yours' });
    }

    res.json({ success: true, message: `✅ Coupon ${result.rows[0].code} deleted!` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== HELPER FUNCTIONS ====================

// Apply Coupon to Order (called during order placement)
exports.applyCouponToOrder = async (couponCode, userId, orderAmount, orderId) => {
  try {
    // Get coupon
    const couponResult = await pool.query(
      'SELECT * FROM coupons WHERE UPPER(code) = UPPER($1)',
      [couponCode]
    );

    if (couponResult.rows.length === 0) {
      return { success: false, error: 'Invalid coupon code!' };
    }

    const coupon = couponResult.rows[0];

    // Validate coupon
    const now = new Date();
    if (!coupon.is_active) {
      return { success: false, error: 'Coupon is not active!' };
    }
    if (new Date(coupon.start_date) > now) {
      return { success: false, error: 'Coupon not yet valid!' };
    }
    if (new Date(coupon.end_date) < now) {
      return { success: false, error: 'Coupon expired!' };
    }
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return { success: false, error: 'Coupon usage limit reached!' };
    }

    // Check min order amount
    if (coupon.min_order_amount && orderAmount < parseFloat(coupon.min_order_amount)) {
      return { success: false, error: `Minimum order amount is ₹${coupon.min_order_amount}!` };
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (orderAmount * parseFloat(coupon.discount_value)) / 100;
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount_amount));
      }
    } else if (coupon.discount_type === 'fixed_amount') {
      discountAmount = Math.min(parseFloat(coupon.discount_value), orderAmount);
    } else if (coupon.discount_type === 'free_shipping') {
      discountAmount = 200;
    }

    // Update order with coupon
    await pool.query(
      'UPDATE orders SET coupon_id = $1, discount_amount = $2 WHERE id = $3',
      [coupon.id, discountAmount.toFixed(2), orderId]
    );

    // Record usage
    await pool.query(
      'INSERT INTO coupon_usages (coupon_id, user_id, order_id, discount_applied) VALUES ($1, $2, $3, $4)',
      [coupon.id, userId, orderId, discountAmount.toFixed(2)]
    );

    // Increment usage count
    await pool.query(
      'UPDATE coupons SET usage_count = usage_count + 1 WHERE id = $1',
      [coupon.id]
    );

    return {
      success: true,
      discountAmount: discountAmount.toFixed(2),
      couponCode: coupon.code
    };

  } catch (error) {
    console.error('Error applying coupon:', error);
    return { success: false, error: 'Internal server error' };
  }
};
