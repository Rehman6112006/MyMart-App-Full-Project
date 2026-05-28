const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Create Store (Vendor only)
exports.createStore = async (req, res) => {
  try {
    const { storeName, name, description, email, contact_email, phone, address, city, state, country, zip, website, logo, banner, operating_hours, social_media } = req.body;
    const ownerId = req.user.id;

    const finalName = storeName || name;
    if (!finalName) {
      return res.status(400).json({
        success: false,
        error: 'Store name is required!'
      });
    }

    // Check if vendor already has a store
    const existing = await pool.query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [ownerId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You already have a store!'
      });
    }

    // Ensure additional columns exist
    const extraColumns = ['logo', 'banner', 'website', 'zip', 'operating_hours', 'social_media'];
    for (const col of extraColumns) {
      await pool.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS ${col} TEXT`);
    }

    const finalEmail = email || contact_email;

    // Generate store slug from name
    const storeSlug = String(finalName).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

    const result = await pool.query(
      `INSERT INTO stores (id, owner_id, store_name, store_slug, description, email, phone, address, city, state, country, zip, website, logo, banner, operating_hours, social_media, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, false, false)
       RETURNING *`,
      [uuidv4(), ownerId, finalName, storeSlug, description, finalEmail, phone, address, city, state, country, zip, website, logo, banner, operating_hours, social_media]
    );

    res.status(201).json({
      success: true,
      message: '✅ Store created! Waiting for admin approval.',
      store: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get My Store (Vendor)
exports.getMyStore = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const result = await pool.query(
      `SELECT s.*, u.first_name, u.last_name, u.email as owner_email
       FROM stores s
       JOIN users u ON s.owner_id = u.id
       WHERE s.owner_id = $1`,
      [ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No store found. Please create a store first.'
      });
    }

    res.json({
      success: true,
      store: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Store by ID (Public)
exports.getStoreById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT s.id, s.store_name, s.store_slug, s.description, s.email, s.phone,
              s.city, s.state, s.country, s.is_active, s.is_verified, s.created_at
       FROM stores s
       WHERE s.id = $1 AND s.is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    res.json({ success: true, store: result.rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update Store (Vendor)
exports.updateStore = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { storeName, name, description, email, contact_email, phone, address, city, state, country, zip, website, logo, banner, operating_hours, social_media } = req.body;

    // Ensure additional columns exist
    const extraColumns = ['logo', 'banner', 'website', 'zip', 'operating_hours', 'social_media'];
    for (const col of extraColumns) {
      await pool.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS ${col} TEXT`);
    }

    const finalName = storeName || name;
    const finalEmail = email || contact_email;

    const result = await pool.query(
      `UPDATE stores
       SET store_name = COALESCE($1, store_name),
           description = COALESCE($2, description),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           city = COALESCE($6, city),
           state = COALESCE($7, state),
           country = COALESCE($8, country),
           zip = COALESCE($9, zip),
           website = COALESCE($10, website),
           logo = COALESCE($11, logo),
           banner = COALESCE($12, banner),
           operating_hours = COALESCE($13, operating_hours),
           social_media = $14,
           updated_at = CURRENT_TIMESTAMP
       WHERE owner_id = $15
       RETURNING *`,
      [finalName, description, finalEmail, phone, address, city, state, country, zip, website, logo, banner, operating_hours, social_media || null, ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    res.json({
      success: true,
      message: '✅ Store updated successfully!',
      store: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get All Stores (Public - for customers browsing)
exports.getAllStores = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.store_name, s.store_slug, s.description, s.city, s.is_verified, s.created_at
       FROM stores s
       WHERE s.is_active = true
       ORDER BY s.created_at DESC`
    );

    res.json({
      success: true,
      count: result.rows.length,
      stores: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get All Stores (Admin - all stores including inactive/pending)
exports.getAllStoresAdmin = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.first_name, u.last_name, u.email as owner_email
       FROM stores s
       LEFT JOIN users u ON s.owner_id = u.id
       ORDER BY s.created_at DESC`
    );

    res.json({
      success: true,
      count: result.rows.length,
      stores: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Admin: Approve Store
exports.approveStore = async (req, res) => {
  try {
    const { id } = req.params;

    const storeResult = await pool.query(
      `UPDATE stores
       SET is_active = true, is_verified = true, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, store_name, is_active, is_verified, owner_id`,
      [id]
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    const store = storeResult.rows[0];
    await pool.query('UPDATE users SET is_active = true WHERE id = $1 AND is_active = false', [store.owner_id]);

    res.json({
      success: true,
      message: '✅ Store approved successfully! Vendor can now login and manage products.',
      store
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
