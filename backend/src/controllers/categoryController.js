const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Create Category (Admin only)
exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon, color, image_url, is_featured } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const result = await pool.query(
      `INSERT INTO categories (id, name, slug, description, icon, color, image_url, is_featured, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
       RETURNING *`,
      [uuidv4(), name, slug, description || '', icon || '📦', color || '#6366F1', image_url || '', is_featured || false]
    );

    res.status(201).json({
      success: true,
      message: '✅ Category created!',
      category: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get All Categories (Public)
exports.getAllCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, slug, description, icon, color, image_url, is_featured
       FROM categories
       WHERE is_active = true
       ORDER BY is_featured DESC, name ASC`
    );

    res.json({
      success: true,
      count: result.rows.length,
      categories: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update Category (Admin)
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, image_url, is_featured } = req.body;

    const result = await pool.query(
      `UPDATE categories SET name = $1, description = $2, icon = $3, color = $4, image_url = $5, is_featured = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [name, description, icon, color, image_url || '', is_featured, id]
    );

    res.json({
      success: true,
      message: '✅ Category updated!',
      category: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Delete Category (Admin)
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE categories SET is_active = false WHERE id = $1',
      [id]
    );

    res.json({ success: true, message: '✅ Category deleted!' });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Category by ID (Public)
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = true) as product_count
       FROM categories c
       WHERE c.id = $1 AND c.is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({
      success: true,
      category: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Category Tree (Public) - Hierarchical categories
exports.getCategoryTree = async (req, res) => {
  try {
    // Just return flat list if parent_id doesn't exist
    const result = await pool.query(
      `SELECT id, name, slug, description, icon, color, image_url, is_featured
       FROM categories
       WHERE is_active = true
       ORDER BY is_featured DESC, name ASC`
    );

    res.json({
      success: true,
      count: result.rows.length,
      categories: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Featured Categories (Public)
exports.getFeaturedCategories = async (req, res) => {
  try {
    // Get featured categories first, then top categories by product count
    const result = await pool.query(
      `SELECT c.id, c.name, c.slug, c.description, c.icon, c.color, c.image_url,
              COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
       WHERE c.is_active = true
       GROUP BY c.id
       ORDER BY c.is_featured DESC, product_count DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      count: result.rows.length,
      categories: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
