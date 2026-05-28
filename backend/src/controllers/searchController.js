const pool = require('../config/database');

// ==================== ENHANCED SEARCH ====================

// Full-Text Search with Advanced Filters
exports.searchProducts = async (req, res) => {
  try {
    const {
      q,                           // Search query
      category,                    // Category ID
      brand,                       // Brand filter
      minPrice, maxPrice,          // Price range
      minRating,                   // Minimum rating
      condition,                   // New/Used
      inStock,                     // Only in-stock
      sortBy = 'relevance',        // relevance, price_asc, price_desc, rating, newest
      page = 1, limit = 20
    } = req.query;

    const userId = req.user?.id;
    const offset = (page - 1) * limit;

    // Save search to history if user is logged in
    if (userId && q) {
      await pool.query(
        `INSERT INTO search_history (user_id, search_query) VALUES ($1, $2)`,
        [userId, q.trim()]
      );
      
      // Update or insert search suggestion
      await pool.query(
        `INSERT INTO search_suggestions (keyword, search_count, last_searched_at)
         VALUES ($1, 1, NOW())
         ON CONFLICT (keyword) DO UPDATE SET
           search_count = search_suggestions.search_count + 1,
           last_searched_at = NOW()`,
        [q.trim().toLowerCase()]
      );
    }

    // Build dynamic query
    let query = `
      SELECT p.id, p.name, p.slug, p.base_price, p.discount_price, p.discount_percentage,
             p.stock_quantity, p.thumbnail, p.brand, p.condition, p.average_rating, p.review_count,
             s.store_name, s.id as store_id,
             c.name as category_name, c.id as category_id
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true AND s.is_active = true
    `;
    
    const params = [];
    let paramCount = 1;

    // Full-text search (if query provided)
    if (q && q.trim()) {
      query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount} OR p.brand ILIKE $${paramCount})`;
      params.push(`%${q.trim()}%`);
      paramCount++;
    }

    // Category filter
    if (category) {
      query += ` AND p.category_id = $${paramCount++}`;
      params.push(category);
    }

    // Brand filter (supports multiple brands comma-separated)
    if (brand) {
      const brands = brand.split(',').map(b => b.trim());
      query += ` AND p.brand = ANY($${paramCount++})`;
      params.push(brands);
    }

    // Price range
    if (minPrice) {
      query += ` AND p.base_price >= $${paramCount++}`;
      params.push(minPrice);
    }
    if (maxPrice) {
      query += ` AND p.base_price <= $${paramCount++}`;
      params.push(maxPrice);
    }

    // Rating filter
    if (minRating) {
      query += ` AND p.average_rating >= $${paramCount++}`;
      params.push(minRating);
    }

    // Condition filter
    if (condition) {
      query += ` AND p.condition = $${paramCount++}`;
      params.push(condition);
    }

    // Stock filter
    if (inStock === 'true') {
      query += ` AND p.stock_quantity > 0`;
    }

    // Sorting
    switch (sortBy) {
      case 'price_asc':
        query += ` ORDER BY p.discount_price ASC NULLS LAST`;
        break;
      case 'price_desc':
        query += ` ORDER BY p.discount_price DESC NULLS LAST`;
        break;
      case 'rating':
        query += ` ORDER BY p.average_rating DESC NULLS LAST, p.review_count DESC`;
        break;
      case 'newest':
        query += ` ORDER BY p.created_at DESC`;
        break;
      case 'relevance':
      default:
        query += ` ORDER BY p.average_rating DESC NULLS LAST, p.review_count DESC`;
    }

    // Pagination
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.is_active = true AND s.is_active = true
    `;
    const countParams = [];
    let countParamCount = 1;

    if (q && q.trim()) {
      countQuery += ` AND (p.name ILIKE $${countParamCount} OR p.description ILIKE $${countParamCount} OR p.brand ILIKE $${countParamCount})`;
      countParams.push(`%${q.trim()}%`);
      countParamCount++;
    }
    if (category) {
      countQuery += ` AND p.category_id = $${countParamCount++}`;
      countParams.push(category);
    }
    if (brand) {
      const brands = brand.split(',').map(b => b.trim());
      countQuery += ` AND p.brand = ANY($${countParamCount++})`;
      countParams.push(brands);
    }
    if (minPrice) {
      countQuery += ` AND p.base_price >= $${countParamCount++}`;
      countParams.push(minPrice);
    }
    if (maxPrice) {
      countQuery += ` AND p.base_price <= $${countParamCount++}`;
      countParams.push(maxPrice);
    }
    if (minRating) {
      countQuery += ` AND p.average_rating >= $${countParamCount++}`;
      countParams.push(minRating);
    }
    if (condition) {
      countQuery += ` AND p.condition = $${countParamCount++}`;
      countParams.push(condition);
    }
    if (inStock === 'true') {
      countQuery += ` AND p.stock_quantity > 0`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      products: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

// Autocomplete / Search Suggestions
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    // Get matching suggestions (prioritize trending)
    const result = await pool.query(`
      SELECT keyword as suggestion, search_count, is_trending
      FROM search_suggestions
      WHERE keyword ILIKE $1
      ORDER BY is_trending DESC, search_count DESC
      LIMIT $2
    `, [`${q}%`, limit]);

    // Also get matching product names and categories
    const [productsResult, categoriesResult] = await Promise.all([
      pool.query(`
        SELECT DISTINCT name as suggestion, 'product' as type
        FROM products
        WHERE name ILIKE $1 AND is_active = true
        LIMIT 5
      `, [`%${q}%`]),
      pool.query(`
        SELECT DISTINCT name as suggestion, 'category' as type
        FROM categories
        WHERE name ILIKE $1
        LIMIT 3
      `, [`%${q}%`])
    ]);

    // Combine and dedupe
    const suggestions = [
      ...result.rows.map(r => ({ 
        text: r.suggestion, 
        type: r.is_trending ? 'trending' : 'recent',
        count: r.search_count 
      })),
      ...productsResult.rows.map(r => ({ 
        text: r.suggestion, 
        type: 'product' 
      })),
      ...categoriesResult.rows.map(r => ({ 
        text: r.suggestion, 
        type: 'category' 
      }))
    ].slice(0, limit);

    res.json({ success: true, suggestions });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get suggestions' });
  }
};

// Get Trending Searches
exports.getTrendingSearches = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(`
      SELECT keyword, search_count
      FROM search_suggestions
      WHERE last_searched_at > NOW() - INTERVAL '7 days'
      ORDER BY search_count DESC
      LIMIT $1
    `, [limit]);

    res.json({
      success: true,
      trending: result.rows
    });

  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ success: false, error: 'Failed to get trending searches' });
  }
};

// User Search History
exports.getSearchHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const result = await pool.query(`
      SELECT DISTINCT ON (search_query) search_query, results_count, searched_at
      FROM search_history
      WHERE user_id = $1
      ORDER BY search_query, searched_at DESC
      LIMIT $2
    `, [userId, limit]);

    res.json({
      success: true,
      history: result.rows
    });

  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ success: false, error: 'Failed to get search history' });
  }
};

// Clear Search History
exports.clearSearchHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query('DELETE FROM search_history WHERE user_id = $1', [userId]);

    res.json({
      success: true,
      message: 'Search history cleared'
    });

  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear history' });
  }
};

// Get Filter Options (Available brands, price range, etc.)
exports.getFilterOptions = async (req, res) => {
  try {
    const { category } = req.query;

    let query = `
      SELECT 
        (SELECT MIN(base_price) FROM products WHERE is_active = true) as min_price,
        (SELECT MAX(base_price) FROM products WHERE is_active = true) as max_price,
        (SELECT ARRAY_AGG(DISTINCT brand) FROM products WHERE brand IS NOT NULL AND is_active = true) as brands,
        (SELECT ARRAY_AGG(DISTINCT condition) FROM products WHERE is_active = true) as conditions,
        (SELECT JSON_AGG(JSON_BUILD_OBJECT('id', id, 'name', name)) FROM categories) as categories
    `;

    const result = await pool.query(query);
    const data = result.rows[0];

    res.json({
      success: true,
      filters: {
        priceRange: {
          min: data.min_price || 0,
          max: data.max_price || 100000
        },
        brands: (data.brands || []).filter(Boolean),
        conditions: (data.conditions || []).filter(Boolean),
        categories: data.categories || []
      }
    });

  } catch (error) {
    console.error('Filter options error:', error);
    res.status(500).json({ success: false, error: 'Failed to get filter options' });
  }
};

// ==================== ADMIN: MANAGE SUGGESTIONS ====================

// Admin: Get All Suggestions
exports.adminGetSuggestions = async (req, res) => {
  try {
    const { page = 1, limit = 50, sortBy = 'search_count' } = req.query;
    const offset = (page - 1) * limit;

    let orderClause = 'ORDER BY search_count DESC';
    if (sortBy === 'recent') orderClause = 'ORDER BY last_searched_at DESC';
    if (sortBy === 'trending') orderClause = 'ORDER BY is_trending DESC, search_count DESC';

    const [suggestionsResult, totalResult] = await Promise.all([
      pool.query(`
        SELECT s.*, c.name as category_name
        FROM search_suggestions s
        LEFT JOIN categories c ON s.category_id = c.id
        ${orderClause}
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query('SELECT COUNT(*) as total FROM search_suggestions')
    ]);

    res.json({
      success: true,
      suggestions: suggestionsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalResult.rows[0].total),
        totalPages: Math.ceil(totalResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Admin suggestions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get suggestions' });
  }
};

// Admin: Toggle Trending
exports.adminToggleTrending = async (req, res) => {
  try {
    const { id } = req.params;
    const { isTrending } = req.body;

    const result = await pool.query(
      'UPDATE search_suggestions SET is_trending = $1 WHERE id = $2 RETURNING *',
      [isTrending, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Suggestion not found' });
    }

    res.json({
      success: true,
      message: `Suggestion marked as ${isTrending ? 'trending' : 'not trending'}`,
      suggestion: result.rows[0]
    });

  } catch (error) {
    console.error('Toggle trending error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle trending' });
  }
};

// Admin: Delete Suggestion
exports.adminDeleteSuggestion = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM search_suggestions WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Suggestion deleted'
    });

  } catch (error) {
    console.error('Delete suggestion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete suggestion' });
  }
};

// Admin: Add Custom Suggestion
exports.adminAddSuggestion = async (req, res) => {
  try {
    const { keyword, isTrending = false, categoryId } = req.body;

    const result = await pool.query(
      `INSERT INTO search_suggestions (keyword, is_trending, category_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (keyword) DO UPDATE SET is_trending = $2, category_id = $3
       RETURNING *`,
      [keyword.toLowerCase().trim(), isTrending, categoryId || null]
    );

    res.json({
      success: true,
      message: 'Suggestion added',
      suggestion: result.rows[0]
    });

  } catch (error) {
    console.error('Add suggestion error:', error);
    res.status(500).json({ success: false, error: 'Failed to add suggestion' });
  }
};

// Admin: Get Search Analytics
exports.adminGetSearchAnalytics = async (req, res) => {
  try {
    const { period = '7 days' } = req.query;

    const [searchesResult, topQueriesResult, noResultsResult] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) as total_searches, 
               COUNT(DISTINCT user_id) as unique_users,
               COUNT(DISTINCT search_query) as unique_queries
        FROM search_history
        WHERE searched_at > NOW() - INTERVAL $1
      `, [period]),
      pool.query(`
        SELECT search_query, COUNT(*) as count, 
               AVG(results_count)::INTEGER as avg_results
        FROM search_history
        WHERE searched_at > NOW() - INTERVAL $1
        GROUP BY search_query
        ORDER BY count DESC
        LIMIT 20
      `, [period]),
      pool.query(`
        SELECT search_query, COUNT(*) as count
        FROM search_history
        WHERE searched_at > NOW() - INTERVAL $1 AND results_count = 0
        GROUP BY search_query
        ORDER BY count DESC
        LIMIT 10
      `, [period])
    ]);

    const searches = searchesResult.rows[0];

    res.json({
      success: true,
      analytics: {
        period,
        totalSearches: parseInt(searches.total_searches),
        uniqueUsers: parseInt(searches.unique_users),
        uniqueQueries: parseInt(searches.unique_queries),
        topQueries: topQueriesResult.rows,
        noResultQueries: noResultsResult.rows
      }
    });

  } catch (error) {
    console.error('Search analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to get analytics' });
  }
};
