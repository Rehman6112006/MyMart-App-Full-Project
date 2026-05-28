const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Get All Active Banners (Public)
exports.getBanners = async (req, res) => {
  try {
    const { position } = req.query;
    
    let query = `
      SELECT * FROM banners 
      WHERE is_active = true 
      AND (start_date IS NULL OR start_date <= NOW())
      AND (end_date IS NULL OR end_date >= NOW())
    `;
    
    const params = [];
    
    if (position) {
      query += ` AND position = $1`;
      params.push(position);
    }
    
    query += ` ORDER BY sort_order ASC, created_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      banners: result.rows
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Single Banner (Public)
exports.getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM banners WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Banner not found' });
    }
    
    res.json({ success: true, banner: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Create Banner (Admin)
exports.createBanner = async (req, res) => {
  try {
    const {
      title, subtitle, image_url, link_type, link_value, button_text,
      background_color, text_color, position, is_active, is_featured,
      start_date, end_date, sort_order
    } = req.body;
    
    if (!title || !image_url) {
      return res.status(400).json({
        success: false,
        error: 'Title and image URL are required'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO banners (title, subtitle, image_url, link_type, link_value, button_text,
        background_color, text_color, position, is_active, is_featured, start_date, end_date, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        title, subtitle, image_url, link_type || 'none', link_value, button_text,
        background_color || '#6366F1', text_color || '#FFFFFF', position || 1,
        is_active !== false, is_featured || false, start_date, end_date, sort_order || 0, req.user.id
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Banner created successfully!',
      banner: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update Banner (Admin)
exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, subtitle, image_url, link_type, link_value, button_text,
      background_color, text_color, position, is_active, is_featured,
      start_date, end_date, sort_order
    } = req.body;
    
    const result = await pool.query(
      `UPDATE banners SET
        title = COALESCE($1, title),
        subtitle = COALESCE($2, subtitle),
        image_url = COALESCE($3, image_url),
        link_type = COALESCE($4, link_type),
        link_value = COALESCE($5, link_value),
        button_text = COALESCE($6, button_text),
        background_color = COALESCE($7, background_color),
        text_color = COALESCE($8, text_color),
        position = COALESCE($9, position),
        is_active = COALESCE($10, is_active),
        is_featured = COALESCE($11, is_featured),
        start_date = COALESCE($12, start_date),
        end_date = COALESCE($13, end_date),
        sort_order = COALESCE($14, sort_order),
        updated_at = NOW()
       WHERE id = $15
       RETURNING *`,
      [
        title, subtitle, image_url, link_type, link_value, button_text,
        background_color, text_color, position, is_active, is_featured,
        start_date, end_date, sort_order, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Banner not found' });
    }
    
    res.json({
      success: true,
      message: 'Banner updated successfully!',
      banner: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Delete Banner (Admin)
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM banners WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Banner not found' });
    }
    
    res.json({ success: true, message: 'Banner deleted successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get All Banners (Admin - including inactive)
exports.getAllBannersAdmin = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM banners ORDER BY position ASC, sort_order ASC, created_at DESC'
    );
    
    res.json({
      success: true,
      banners: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================
// OFFERS/COUPONS MANAGEMENT
// ============================================

// Get All Active Offers (Public)
exports.getOffers = async (req, res) => {
  try {
    const { vendor_id } = req.query;
    
    let query = `
      SELECT * FROM offers 
      WHERE is_active = true 
      AND (start_date IS NULL OR start_date <= NOW())
      AND (end_date IS NULL OR end_date >= NOW())
      AND (usage_limit IS NULL OR usage_count < usage_limit)
    `;
    
    const params = [];
    
    if (vendor_id) {
      query += ` AND (vendor_id IS NULL OR vendor_id = $${params.length + 1})`;
      params.push(vendor_id);
    }
    
    query += ` ORDER BY is_featured DESC, created_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      offers: result.rows
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Validate Coupon Code
exports.validateCoupon = async (req, res) => {
  try {
    const { code, order_amount, vendor_id } = req.body;
    
    if (!code) {
      return res.status(400).json({ success: false, error: 'Coupon code required' });
    }
    
    const result = await pool.query(
      `SELECT * FROM offers 
       WHERE coupon_code = $1 AND is_active = true
       AND (start_date IS NULL OR start_date <= NOW())
       AND (end_date IS NULL OR end_date >= NOW())
       AND (usage_limit IS NULL OR usage_count < usage_limit)`,
      [code.toUpperCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired coupon code' });
    }
    
    const offer = result.rows[0];
    
    // Check minimum order amount
    if (offer.min_order_amount && order_amount < offer.min_order_amount) {
      return res.status(400).json({
        success: false,
        error: `Minimum order amount is Rs. ${offer.min_order_amount}`
      });
    }
    
    // Calculate discount
    let discount = 0;
    if (offer.offer_type === 'percentage') {
      discount = (order_amount * offer.discount_value) / 100;
      if (offer.max_discount_amount && discount > offer.max_discount_amount) {
        discount = offer.max_discount_amount;
      }
    } else if (offer.offer_type === 'fixed') {
      discount = offer.discount_value;
    } else if (offer.offer_type === 'free_delivery') {
      discount = 'FREE_DELIVERY';
    }
    
    res.json({
      success: true,
      offer: offer,
      discount: discount,
      message: discount === 'FREE_DELIVERY' ? 'Free delivery applied!' : `Rs. ${discount.toFixed(2)} discount applied!`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Create Offer (Admin)
exports.createOffer = async (req, res) => {
  try {
    const {
      title, description, banner_image, offer_type, discount_value,
      min_order_amount, max_discount_amount, coupon_code, usage_limit,
      per_user_limit, is_active, is_featured, start_date, end_date,
      applicable_categories, applicable_products, vendor_id
    } = req.body;
    
    if (!title || !offer_type || !coupon_code) {
      return res.status(400).json({
        success: false,
        error: 'Title, offer type, and coupon code are required'
      });
    }
    
    // Check if coupon code already exists
    const existing = await pool.query(
      'SELECT id FROM offers WHERE coupon_code = $1',
      [coupon_code.toUpperCase()]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Coupon code already exists'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO offers (title, description, banner_image, offer_type, discount_value,
        min_order_amount, max_discount_amount, coupon_code, usage_limit, per_user_limit,
        is_active, is_featured, start_date, end_date, applicable_categories,
        applicable_products, vendor_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        title, description, banner_image, offer_type, discount_value || 0,
        min_order_amount || 0, max_discount_amount, coupon_code.toUpperCase(),
        usage_limit, per_user_limit || 1, is_active !== false, is_featured || false,
        start_date, end_date, applicable_categories, applicable_products,
        vendor_id, req.user.id
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Offer created successfully!',
      offer: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get All Offers (Admin)
exports.getAllOffersAdmin = async (req, res) => {
  try {
    const { vendor_id } = req.query;
    
    let query = 'SELECT * FROM offers';
    const params = [];
    
    if (vendor_id) {
      query += ' WHERE vendor_id = $1';
      params.push(vendor_id);
    }
    
    query += ' ORDER BY is_featured DESC, created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      offers: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update Offer (Admin)
exports.updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'title', 'description', 'banner_image', 'offer_type', 'discount_value',
      'min_order_amount', 'max_discount_amount', 'coupon_code', 'usage_limit',
      'per_user_limit', 'is_active', 'is_featured', 'start_date', 'end_date',
      'applicable_categories', 'applicable_products', 'vendor_id'
    ];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }
    
    fields.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE offers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    
    res.json({
      success: true,
      message: 'Offer updated successfully!',
      offer: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Delete Offer (Admin)
exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM offers WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }
    
    res.json({ success: true, message: 'Offer deleted successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
