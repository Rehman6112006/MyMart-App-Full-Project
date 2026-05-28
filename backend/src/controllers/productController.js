const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const validator = require('../middleware/validator');

// Create Product (Vendor)
exports.createProduct = async (req, res) => {
  try {
    // Support both camelCase and snake_case from frontend, plus direct URL
    const {
      name, description, sku, categoryId, category_id, brand,
      basePrice, base_price, price, discountPercentage, discount_percentage, taxPercentage,
      stockQuantity, stock_quantity, lowStockThreshold, condition,
      image_url, imageUrl, is_active, thumbnail, images
    } = req.body;

    // Use snake_case values if provided, otherwise use camelCase
    const productName = name;
    const productDescription = description;
    // Auto-generate SKU if not provided (SKU format: PROD-UNIQUE_ID)
    const productSku = sku || `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const productCategoryId = category_id || categoryId;
    const productBrand = brand;
    const productPrice = price ?? basePrice ?? base_price;
    if (productPrice === undefined || productPrice === null || isNaN(Number(productPrice))) {
      return res.status(400).json({ success: false, error: 'Product price is required and must be a valid number' });
    }
    const productDiscountPercentage = discountPercentage ?? discount_percentage;
    const productTaxPercentage = taxPercentage;
    const productStockQuantity = stock_quantity !== undefined ? stock_quantity : (stockQuantity !== undefined ? stockQuantity : 0);
    const productLowStockThreshold = lowStockThreshold;
    const productCondition = condition;
    // Support: image_url, imageUrl, or thumbnail
    const productImageUrl = image_url || imageUrl || thumbnail;
    const productIsActive = is_active !== undefined ? is_active : true;
    
    // Handle multiple images - support both array and single image
    let productImages = images;
    if (!productImages || (Array.isArray(productImages) && productImages.length === 0)) {
      // If no images array, use single image_url as array
      productImages = productImageUrl ? [productImageUrl] : [];
    } else if (typeof productImages === 'string') {
      // If string, convert to array
      productImages = [productImages];
    }
    
    // Set thumbnail to first image if not provided
    const finalThumbnail = thumbnail || (productImages.length > 0 ? productImages[0] : null);
    const finalImageUrl = productImageUrl || finalThumbnail;

    const validation = validator.validateProduct({
      name: productName,
      price: productPrice,
      stock_quantity: productStockQuantity,
      description: productDescription
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: validation.errors
      });
    }

    const ownerId = req.user.id;

    // Get vendor's store (allow even if not active - for products to be visible after approval)
    const storeResult = await pool.query(
      'SELECT id, store_name, is_active FROM stores WHERE owner_id = $1',
      [ownerId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You need to create a store first!'
      });
    }

    const store = storeResult.rows[0];
    const storeId = store.id;
    const slug = productName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

    // Calculate discount price
    const discountPrice = productDiscountPercentage
      ? productPrice - (productPrice * productDiscountPercentage / 100)
      : productPrice;

    const result = await pool.query(
      `INSERT INTO products (id, store_id, vendor_id, name, slug, description, sku, category_id, brand,
        base_price, discount_percentage, discount_price, tax_percentage,
        stock_quantity, low_stock_threshold, condition, is_active, image_url, thumbnail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        uuidv4(), storeId, ownerId, productName, slug, productDescription, productSku, productCategoryId || null, productBrand || null,
        productPrice, productDiscountPercentage || 0, discountPrice, productTaxPercentage || 0,
        productStockQuantity, productLowStockThreshold || 5, productCondition || 'new', productIsActive, finalImageUrl, finalThumbnail
      ]
    );

    res.status(201).json({
      success: true,
      message: store.is_active ? '✅ Product created successfully!' : '✅ Product created! It will be visible after your store is approved.',
      product: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get All Products (Public - for customers)
exports.getAllProducts = async (req, res) => {
  try {
    const { category, category_id, category_slug, search, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
    const user = req.user;

    if (user && user.role === 'admin') {
      const adminStore = await pool.query(
        'SELECT id FROM stores WHERE owner_id = $1',
        [user.id]
      );
      if (adminStore.rows.length > 0) {
        req.query.store_id = adminStore.rows[0].id;
        return exports.getStoreProducts(req, res);
      }
      return res.json({
        success: true,
        count: 0,
        total: 0,
        page: 1,
        products: [],
        message: 'Products are managed by vendors. Admins manage vendor accounts.'
      });
    }
    const categoryFilter = category_id || category;
    const categorySlug = category_slug;
    const offset = (page - 1) * limit;

    // Debug log
    console.log('🔍 getAllProducts - categoryFilter:', categoryFilter, '| categorySlug:', categorySlug);

    let query = `
      SELECT p.id, p.name, p.slug, p.description, p.base_price, p.discount_price, p.discount_percentage,
             p.stock_quantity, p.thumbnail, p.image_url, p.brand, p.condition,
             CASE 
               WHEN p.image_url IS NOT NULL AND p.image_url != '' THEN ARRAY[p.image_url]
               WHEN p.thumbnail IS NOT NULL AND p.thumbnail != '' THEN ARRAY[p.thumbnail]
               ELSE ARRAY[]::text[]
             END as images,
             s.store_name, s.id as store_id,
             c.name as category_name
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (p.is_active = true OR p.is_active IS NULL)
        AND (p.store_id IS NULL OR s.is_active = true OR s.is_active IS NULL)
        AND (p.store_id IS NULL OR s.is_verified = true OR s.is_verified IS NULL)
    `;
    const params = [];
    let paramCount = 1;

    // Support both category_id (UUID) and category_slug
    if (categoryFilter) {
      console.log('   Using category_id filter:', categoryFilter);
      query += ` AND p.category_id = $${paramCount++}`;
      params.push(categoryFilter);
    } else if (categorySlug) {
      // Filter by category slug
      console.log('   Using category_slug filter:', categorySlug);
      query += ` AND c.slug = $${paramCount++}`;
      params.push(categorySlug);
    }
    console.log('   Query params:', params);
    if (search) {
      query += ` AND (p.name ILIKE $${paramCount++} OR p.description ILIKE $${paramCount - 1})`;
      params.push(`%${search}%`);
    }
    if (minPrice) {
      query += ` AND p.base_price >= $${paramCount++}`;
      params.push(minPrice);
    }
    if (maxPrice) {
      query += ` AND p.base_price <= $${paramCount++}`;
      params.push(maxPrice);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Debug log results
    console.log('   Found', result.rows.length, 'products');
    if (result.rows.length > 0) {
      console.log('   First product:', result.rows[0].name, '| category:', result.rows[0].category_name);
    }

    // Get total count for pagination (without LIMIT/OFFSET)
    let countQuery = `SELECT COUNT(*) FROM products p LEFT JOIN stores s ON p.store_id = s.id LEFT JOIN categories c ON p.category_id = c.id WHERE (p.is_active = true OR p.is_active IS NULL) AND (p.store_id IS NULL OR s.is_active = true OR s.is_active IS NULL) AND (p.store_id IS NULL OR s.is_verified = true OR s.is_verified IS NULL)`;
    const countParams = [];
    let cp = 1;
    if (categoryFilter) { countQuery += ` AND p.category_id = $${cp++}`; countParams.push(categoryFilter); }
    else if (categorySlug) { countQuery += ` AND c.slug = $${cp++}`; countParams.push(categorySlug); }
    if (search) { countQuery += ` AND (p.name ILIKE $${cp++} OR p.description ILIKE $${cp++})`; countParams.push(`%${search}%`); }
    if (minPrice) { countQuery += ` AND p.base_price >= $${cp++}`; countParams.push(minPrice); }
    if (maxPrice) { countQuery += ` AND p.base_price <= $${cp++}`; countParams.push(maxPrice); }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      count: result.rows.length,
      total: total,
      page: parseInt(page),
      products: result.rows
    });

  } catch (error) {
    console.error('getAllProducts error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Product by ID (Public)
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, s.store_name, s.id as store_id, c.name as category_name
       FROM products p
       LEFT JOIN stores s ON p.store_id = s.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1 AND (p.is_active = true OR p.is_active IS NULL)
         AND (p.store_id IS NULL OR s.is_active = true OR s.is_active IS NULL)
         AND (p.store_id IS NULL OR s.is_verified = true OR s.is_verified IS NULL)`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Increment view count
    await pool.query(
      'UPDATE products SET view_count = view_count + 1 WHERE id = $1',
      [id]
    );

    res.json({ success: true, product: result.rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Store Products (Vendor's own products)
exports.getStoreProducts = async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Try to get store_id from stores table
    const storeResult = await pool.query(
      'SELECT id, store_name FROM stores WHERE owner_id = $1',
      [vendorId]
    );

    let storeId = null;
    let storeName = null;
    
    if (storeResult.rows.length > 0) {
      storeId = storeResult.rows[0].id;
      storeName = storeResult.rows[0].store_name;
    }

    // Build query - support both store_id and vendor_id for flexibility
    let query;
    let params;
    
    if (storeId) {
      query = `
        SELECT p.id, p.name, p.slug, p.description, p.base_price, p.discount_price, 
                COALESCE(p.discount_percentage, 0) as discount_percentage, 
                COALESCE(p.stock_quantity, 0) as stock_quantity, 
                p.is_active, 
                COALESCE(p.view_count, 0) as view_count, 
                p.created_at, 
                COALESCE(p.image_url, '') as image_url,
                COALESCE(p.thumbnail, '') as thumbnail, 
                COALESCE(p.brand, '') as brand, 
                p.category_id, p.store_id,
                c.name as category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.store_id = $1
         ORDER BY p.created_at DESC`;
      params = [storeId];
    } else {
      // Fallback: get by vendor_id (for products created before store was set up)
      query = `
        SELECT p.id, p.name, p.slug, p.description, p.base_price, p.discount_price, 
                COALESCE(p.discount_percentage, 0) as discount_percentage, 
                COALESCE(p.stock_quantity, 0) as stock_quantity, 
                p.is_active, 
                COALESCE(p.view_count, 0) as view_count, 
                p.created_at, 
                COALESCE(p.image_url, '') as image_url,
                COALESCE(p.thumbnail, '') as thumbnail, 
                COALESCE(p.brand, '') as brand, 
                p.category_id, p.store_id,
                c.name as category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.vendor_id = $1
         ORDER BY p.created_at DESC`;
      params = [vendorId];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      products: result.rows,
      storeId: storeId,
      storeName: storeName,
      hasStore: !!storeId
    });

  } catch (error) {
    console.error('Error in getStoreProducts:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update Product (Vendor)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;
    const { name, description, basePrice, base_price, price, discountPercentage, discount_percentage, stockQuantity, stock_quantity, isActive, is_active, categoryId, category_id, brand, image_url, thumbnail, images } = req.body;

    // Support both camelCase and snake_case
    const productName = name || null;
    const productDescription = description || null;
    const productPrice = price ?? basePrice ?? base_price ?? null;
    const productDiscountPercentage = discountPercentage ?? discount_percentage ?? null;
    const productStockQuantity = stock_quantity !== undefined ? stock_quantity : (stockQuantity !== undefined ? stockQuantity : null);
    const productIsActive = is_active !== undefined ? is_active : (isActive !== undefined ? isActive : null);
    const productCategoryId = category_id || categoryId || null;
    const productBrand = brand || null;

    // Handle multiple images
    let productImages = images || null;
    if (!productImages || (Array.isArray(productImages) && productImages.length === 0)) {
      productImages = image_url ? [image_url] : null;
    } else if (typeof productImages === 'string') {
      productImages = [productImages];
    }
    const finalThumbnail = thumbnail || (Array.isArray(productImages) && productImages.length > 0 ? productImages[0] : null);
    const finalImageUrl = image_url || finalThumbnail || null;

    // Try to verify product belongs to vendor's store first
    let check = await pool.query(
      `SELECT p.id, p.store_id FROM products p
       LEFT JOIN stores s ON p.store_id = s.id
       WHERE p.id = $1 AND (s.owner_id = $2 OR p.vendor_id = $2)`,
      [id, ownerId]
    );

    // If not found, try direct vendor_id check
    if (check.rows.length === 0) {
      check = await pool.query(
        `SELECT id, vendor_id FROM products WHERE id = $1 AND vendor_id = $2`,
        [id, ownerId]
      );
    }

    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Unauthorized - Product not found' });
    }

    const result = await pool.query(
      `UPDATE products SET updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    const current = result.rows[0];

    const updateFields = [];
    const updateValues = [];
    let paramIdx = 1;

    if (productName !== null) {
      updateFields.push(`name = $${paramIdx++}`);
      updateValues.push(productName);
    }
    if (productDescription !== null) {
      updateFields.push(`description = $${paramIdx++}`);
      updateValues.push(productDescription);
    }
    if (productPrice !== null) {
      updateFields.push(`base_price = $${paramIdx++}`);
      updateValues.push(productPrice);
    }
    if (productDiscountPercentage !== null) {
      updateFields.push(`discount_percentage = $${paramIdx++}`);
      updateValues.push(productDiscountPercentage);
    }
    if (productStockQuantity !== null) {
      updateFields.push(`stock_quantity = $${paramIdx++}`);
      updateValues.push(productStockQuantity);
    }
    if (productIsActive !== null) {
      updateFields.push(`is_active = $${paramIdx++}`);
      updateValues.push(productIsActive);
    }
    if (productCategoryId !== null) {
      updateFields.push(`category_id = $${paramIdx++}`);
      updateValues.push(productCategoryId);
    }
    if (productBrand !== null) {
      updateFields.push(`brand = $${paramIdx++}`);
      updateValues.push(productBrand);
    }
    if (finalImageUrl !== null) {
      updateFields.push(`image_url = $${paramIdx++}`);
      updateValues.push(finalImageUrl);
    }
    if (finalThumbnail !== null) {
      updateFields.push(`thumbnail = $${paramIdx++}`);
      updateValues.push(finalThumbnail);
    }

    // Recalculate discount_price if price or discount changed
    if (productPrice !== null) {
      const existingDisc = parseFloat(current.discount_percentage);
      const discPct = productDiscountPercentage !== null ? productDiscountPercentage : (isNaN(existingDisc) ? 0 : existingDisc);
      const discPrice = discPct > 0 ? productPrice - (productPrice * discPct / 100) : productPrice;
      updateFields.push(`discount_price = $${paramIdx++}`);
      updateValues.push(discPrice);
    }

    if (updateFields.length === 0) {
      return res.json({ success: true, message: 'No changes provided', product: current });
    }

    console.log('UPDATE DEBUG:', JSON.stringify({ updateFields, updateValues, id, body: req.body, productPrice, productName }));

    const finalResult = await pool.query(
      `UPDATE products SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx} RETURNING *`,
      [...updateValues, id]
    );

    res.json({
      success: true,
      message: '✅ Product updated!',
      product: finalResult.rows[0]
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Delete Product (Vendor)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;

    // Try to verify product belongs to vendor's store first
    let check = await pool.query(
      `SELECT p.id FROM products p
       LEFT JOIN stores s ON p.store_id = s.id
       WHERE p.id = $1 AND (s.owner_id = $2 OR p.vendor_id = $2)`,
      [id, ownerId]
    );

    // If not found, try direct vendor_id check
    if (check.rows.length === 0) {
      check = await pool.query(
        `SELECT id FROM products WHERE id = $1 AND vendor_id = $2`,
        [id, ownerId]
      );
    }

    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Unauthorized - Product not found' });
    }

    // First, check if there are any order items for this product
    const orderItemsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM order_items WHERE product_id = $1',
      [id]
    );
    
    // If there are order items, we need to delete them first (this will affect order history)
    if (parseInt(orderItemsCheck.rows[0].count) > 0) {
      console.log(`⚠️ Found ${orderItemsCheck.rows[0].count} order items for this product. Deleting them...`);
      await pool.query('DELETE FROM order_items WHERE product_id = $1', [id]);
      console.log('✅ Deleted order_items referencing this product');
    }

    // Also delete any wishlists referencing this product
    await pool.query('DELETE FROM wishlists WHERE product_id = $1', [id]);
    console.log('✅ Removed product from wishlists');

    // Also delete any cart items referencing this product
    await pool.query('DELETE FROM cart_items WHERE product_id = $1', [id]);
    console.log('✅ Removed product from cart_items');

    // Now delete the product
    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    res.json({ success: true, message: '✅ Product deleted permanently!' });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Featured Products (Public)
exports.getFeaturedProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.description, p.base_price, p.discount_price, p.discount_percentage,
              p.stock_quantity, p.thumbnail, p.image_url, p.brand, p.condition,
              CASE 
                WHEN p.image_url IS NOT NULL AND p.image_url != '' THEN ARRAY[p.image_url]
                WHEN p.thumbnail IS NOT NULL AND p.thumbnail != '' THEN ARRAY[p.thumbnail]
                ELSE ARRAY[]::text[]
              END as images,
              s.store_name, s.id as store_id,
              c.name as category_name
       FROM products p
       LEFT JOIN stores s ON p.store_id = s.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE (p.is_active = true OR p.is_active IS NULL)
         AND (p.store_id IS NULL OR s.is_active = true OR s.is_active IS NULL)
         AND (p.store_id IS NULL OR s.is_verified = true OR s.is_verified IS NULL)
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      count: result.rows.length,
      page: parseInt(page),
      products: result.rows
    });

  } catch (error) {
    console.error('getFeaturedProducts error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get New Arrivals (Public)
exports.getNewArrivals = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.description, p.base_price, p.discount_price, p.discount_percentage,
              p.stock_quantity, p.thumbnail, p.image_url, p.brand, p.condition,
              CASE 
                WHEN p.image_url IS NOT NULL AND p.image_url != '' THEN ARRAY[p.image_url]
                WHEN p.thumbnail IS NOT NULL AND p.thumbnail != '' THEN ARRAY[p.thumbnail]
                ELSE ARRAY[]::text[]
              END as images,
              s.store_name, s.id as store_id,
              c.name as category_name
       FROM products p
       LEFT JOIN stores s ON p.store_id = s.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE (p.is_active = true OR p.is_active IS NULL)
         AND (p.store_id IS NULL OR s.is_active = true OR s.is_active IS NULL)
         AND (p.store_id IS NULL OR s.is_verified = true OR s.is_verified IS NULL)
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      count: result.rows.length,
      page: parseInt(page),
      products: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Deals (Public) - Products with discount
exports.getDeals = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.description, p.base_price, p.discount_price, p.discount_percentage,
              p.stock_quantity, p.thumbnail, p.image_url, p.brand, p.condition,
              CASE 
                WHEN p.image_url IS NOT NULL AND p.image_url != '' THEN ARRAY[p.image_url]
                WHEN p.thumbnail IS NOT NULL AND p.thumbnail != '' THEN ARRAY[p.thumbnail]
                ELSE ARRAY[]::text[]
              END as images,
              s.store_name, s.id as store_id,
              c.name as category_name
       FROM products p
       LEFT JOIN stores s ON p.store_id = s.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE (p.is_active = true OR p.is_active IS NULL)
         AND (p.store_id IS NULL OR s.is_active = true OR s.is_active IS NULL)
         AND (p.store_id IS NULL OR s.is_verified = true OR s.is_verified IS NULL)
         AND p.discount_percentage > 0
       ORDER BY p.discount_percentage DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      count: result.rows.length,
      page: parseInt(page),
      products: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Products by Store (Public)
exports.getProductsByStore = async (req, res) => {
  try {
    const { id: storeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // First check if store exists
    const storeCheck = await pool.query(
      'SELECT id, store_name, is_active, is_verified FROM stores WHERE id = $1',
      [storeId]
    );

    if (storeCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.description, p.base_price, p.discount_price, p.discount_percentage,
              p.stock_quantity, p.thumbnail, p.image_url, p.brand, p.condition,
              CASE 
                WHEN p.image_url IS NOT NULL AND p.image_url != '' THEN ARRAY[p.image_url]
                WHEN p.thumbnail IS NOT NULL AND p.thumbnail != '' THEN ARRAY[p.thumbnail]
                ELSE ARRAY[]::text[]
              END as images,
              s.store_name, s.id as store_id,
              c.name as category_name
       FROM products p
       LEFT JOIN stores s ON p.store_id = s.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.store_id = $1
         AND (p.is_active = true OR p.is_active IS NULL)
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [storeId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p
       WHERE p.store_id = $1
         AND (p.is_active = true OR p.is_active IS NULL)`,
      [storeId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      products: result.rows
    });

  } catch (error) {
    console.error('getProductsByStore error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
