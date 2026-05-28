// ==================== ENHANCED REVIEW CONTROLLER - PHASE 8 ====================
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const notificationService = require('../services/notificationService');

// ==================== CUSTOMER APIS ====================

// Add Review
exports.addReview = async (req, res) => {
  try {
    const { productId, orderId, rating, reviewText, comment, images } = req.body;
    const customerId = req.user.id;

    if (!productId || !rating) {
      return res.status(400).json({ success: false, error: 'Product ID and rating are required!' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5!' });
    }

    // Check if already reviewed
    const existing = await pool.query(
      'SELECT id FROM reviews WHERE customer_id = $1 AND product_id = $2',
      [customerId, productId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'You already reviewed this product!' });
    }

    // Check if verified purchase
    let verifiedPurchase = false;
    if (orderId) {
      const orderCheck = await pool.query(
        'SELECT id FROM orders WHERE id = $1 AND customer_id = $2 AND order_status = $3',
        [orderId, customerId, 'delivered']
      );
      verifiedPurchase = orderCheck.rows.length > 0;
    }

    const result = await pool.query(
      `INSERT INTO reviews (id, product_id, customer_id, order_id, rating, review_text, 
        is_approved, verified_purchase, images)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
       RETURNING *`,
      [uuidv4(), productId, customerId, orderId || null, rating, (reviewText || comment || null), 
       verifiedPurchase, JSON.stringify(images || [])]
    );

    // Update product rating
    await updateProductRating(productId);

    // Check for first review badge
    await checkAndAwardBadge(customerId, 'first_review', 'First Review');

    // Notify vendor
    const product = await pool.query('SELECT store_id, name FROM products WHERE id = $1', [productId]);
    if (product.rows.length > 0) {
      const vendor = await pool.query(
        `SELECT u.id, u.email, s.store_name FROM stores s JOIN users u ON s.owner_id = u.id WHERE s.id = $1`,
        [product.rows[0].store_id]
      );
      if (vendor.rows.length > 0) {
        await notificationService.notifyVendorReview(
          { email: vendor.rows[0].email },
          product.rows[0].name,
          rating
        );
      }
    }

    res.status(201).json({
      success: true,
      message: '✅ Review submitted! It will be visible on the product page.',
      review: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Add Comment to Review
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentText } = req.body;
    const userId = req.user.id;

    if (!commentText || commentText.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Comment text is required!' });
    }

    // Check review exists
    const review = await pool.query('SELECT id FROM reviews WHERE id = $1', [id]);
    if (review.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Review not found!' });
    }

    const result = await pool.query(
      `INSERT INTO review_comments (id, review_id, user_id, comment_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [uuidv4(), id, userId, commentText.trim()]
    );

    res.status(201).json({
      success: true,
      message: '✅ Comment added!',
      comment: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Review Comments
exports.getReviewComments = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT rc.*, u.first_name, u.last_name
       FROM review_comments rc
       JOIN users u ON rc.user_id = u.id
       WHERE rc.review_id = $1
       ORDER BY rc.created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      comments: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Report Review
exports.reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    const reporterId = req.user.id;

    const validReasons = ['spam', 'inappropriate', 'fake', 'harassment', 'off_topic', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ success: false, error: 'Valid reason is required!' });
    }

    // Check if already reported
    const existing = await pool.query(
      'SELECT id FROM review_reports WHERE review_id = $1 AND reporter_id = $2',
      [id, reporterId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'You already reported this review!' });
    }

    // Update report count on review
    await pool.query(
      'UPDATE reviews SET report_count = report_count + 1 WHERE id = $1',
      [id]
    );

    const result = await pool.query(
      `INSERT INTO review_reports (id, review_id, reporter_id, reason, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [uuidv4(), id, reporterId, reason, description || null]
    );

    res.status(201).json({
      success: true,
      message: '✅ Report submitted. Thank you for helping us maintain quality content!',
      report: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Vote Helpful/Unhelpful
exports.voteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { vote } = req.body;
    const userId = req.user.id;

    if (!['helpful', 'unhelpful'].includes(vote)) {
      return res.status(400).json({ success: false, error: 'Vote must be "helpful" or "unhelpful"!' });
    }

    // Check if already voted
    const existingVote = await pool.query(
      'SELECT id FROM review_votes WHERE review_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingVote.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'You already voted on this review!' });
    }

    // Add vote
    await pool.query(
      'INSERT INTO review_votes (id, review_id, user_id, vote_type) VALUES ($1, $2, $3, $4)',
      [uuidv4(), id, userId, vote]
    );

    // Update counts
    const column = vote === 'helpful' ? 'helpful_count' : 'unhelpful_count';
    await pool.query(`UPDATE reviews SET ${column} = ${column} + 1 WHERE id = $1`, [id]);

    // Award badge for helpful votes
    if (vote === 'helpful') {
      const helpfulCount = await pool.query(
        'SELECT COUNT(*) FROM review_votes WHERE user_id = $1 AND vote_type = $2',
        [userId, 'helpful']
      );
      if (parseInt(helpfulCount.rows[0].count) >= 10) {
        await checkAndAwardBadge(userId, 'helpful_expert', 'Helpful Expert');
      }
    }

    res.json({ success: true, message: '✅ Vote recorded!' });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== PUBLIC APIS ====================

// Get Product Reviews
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;
    const offset = (page - 1) * limit;

    let orderBy = 'r.created_at DESC';
    if (sort === 'helpful') orderBy = 'r.helpful_count DESC, r.created_at DESC';
    if (sort === 'highest') orderBy = 'r.rating DESC, r.created_at DESC';
    if (sort === 'lowest') orderBy = 'r.rating ASC, r.created_at DESC';

    const result = await pool.query(
      `SELECT r.id, r.rating, r.review_text, r.helpful_count, r.unhelpful_count,
              r.images, r.verified_purchase, r.vendor_response, r.created_at,
              u.first_name, u.last_name,
              (SELECT COUNT(*) FROM review_comments WHERE review_id = r.id) as comment_count
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       WHERE r.product_id = $1
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    );

    // Get stats
    const stats = await pool.query(
      `SELECT 
        COALESCE(AVG(rating)::numeric(2,1), 0) as avg_rating,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM reviews WHERE product_id = $1`,
      [productId]
    );

    res.json({
      success: true,
      averageRating: parseFloat(stats.rows[0].avg_rating),
      totalReviews: parseInt(stats.rows[0].total_reviews),
      distribution: {
        five: parseInt(stats.rows[0].five_star),
        four: parseInt(stats.rows[0].four_star),
        three: parseInt(stats.rows[0].three_star),
        two: parseInt(stats.rows[0].two_star),
        one: parseInt(stats.rows[0].one_star)
      },
      reviews: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Store Rating
exports.getStoreRating = async (req, res) => {
  try {
    const { storeId } = req.params;

    const result = await pool.query(
      `SELECT 
        COALESCE(AVG(r.rating)::numeric(2,1), 0) as avg_rating,
        COUNT(r.id) as total_reviews,
        COUNT(CASE WHEN r.rating >= 4 THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN r.rating <= 2 THEN 1 END) as negative_reviews
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       WHERE p.store_id = $1`,
      [storeId]
    );

    res.json({
      success: true,
      storeId,
      averageRating: parseFloat(result.rows[0].avg_rating),
      totalReviews: parseInt(result.rows[0].total_reviews),
      positiveReviews: parseInt(result.rows[0].positive_reviews),
      negativeReviews: parseInt(result.rows[0].negative_reviews),
      ratingPercentage: result.rows[0].total_reviews > 0 
        ? Math.round((result.rows[0].positive_reviews / result.rows[0].total_reviews) * 100)
        : 0
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== VENDOR APIS ====================

// Vendor Response to Review
exports.vendorResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const vendorId = req.user.id;

    if (!response) {
      return res.status(400).json({ success: false, error: 'Response is required!' });
    }

    // Check if vendor owns this product
    const reviewCheck = await pool.query(
      `SELECT r.*, p.store_id 
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       JOIN stores s ON p.store_id = s.id
       WHERE r.id = $1 AND s.owner_id = $2`,
      [id, vendorId]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Not authorized!' });
    }

    await pool.query(
      'UPDATE reviews SET vendor_response = $1, updated_at = NOW() WHERE id = $2',
      [response, id]
    );

    res.json({ success: true, message: '✅ Response added!' });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get My Store Reviews
exports.getVendorReviews = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.id, r.rating, r.review_text, r.helpful_count, r.unhelpful_count,
             r.is_approved, r.verified_purchase, r.vendor_response, r.created_at,
             u.first_name, u.last_name, u.email,
             p.name as product_name, p.id as product_id,
             s.store_name, s.id as store_id
      FROM reviews r
      JOIN users u ON r.customer_id = u.id
      JOIN products p ON r.product_id = p.id
      JOIN stores s ON p.store_id = s.id
      WHERE s.owner_id = $1
    `;

    const params = [vendorId];

    if (status === 'pending') {
      query += ` AND r.is_approved = false`;
    } else if (status === 'approved') {
      query += ` AND r.is_approved = true`;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({ success: true, count: result.rows.length, reviews: result.rows });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== ADMIN APIS ====================

// Get All Reviews
exports.getAllReviews = async (req, res) => {
  try {
    const { status, productId, storeId, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.id, r.rating, r.review_text, r.helpful_count, r.unhelpful_count,
             r.is_approved, r.verified_purchase, r.vendor_response, r.report_count,
             r.created_at,
             u.first_name, u.last_name, u.email,
             p.name as product_name, p.id as product_id,
             s.store_name, s.id as store_id
      FROM reviews r
      JOIN users u ON r.customer_id = u.id
      JOIN products p ON r.product_id = p.id
      JOIN stores s ON p.store_id = s.id
      WHERE 1=1
    `;

    const params = [];

    if (status === 'pending') query += ` AND r.is_approved = false`;
    else if (status === 'approved') query += ` AND r.is_approved = true`;
    else if (status === 'reported') query += ` AND r.report_count > 0`;

    if (productId) {
      params.push(productId);
      query += ` AND r.product_id = $${params.length}`;
    }

    if (storeId) {
      params.push(storeId);
      query += ` AND p.store_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (r.review_text ILIKE $${params.length} OR u.first_name ILIKE $${params.length})`;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({ success: true, count: result.rows.length, reviews: result.rows });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Approve Review
exports.approveReview = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE reviews SET is_approved = true WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Review not found!' });
    }

    await updateProductRating(result.rows[0].product_id);

    res.json({ success: true, message: '✅ Review approved!', review: result.rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Toggle Featured Review
exports.toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE reviews SET is_featured = NOT is_featured WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Review not found!' });
    }

    res.json({ 
      success: true, 
      message: `✅ Review ${result.rows[0].is_featured ? 'featured' : 'unfeatured'}!`,
      review: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Reported Reviews
exports.getReportedReviews = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rr.*, r.review_text, r.rating, r.report_count,
              u.first_name, u.last_name, u.email,
              p.name as product_name
       FROM review_reports rr
       JOIN reviews r ON rr.review_id = r.id
       JOIN users u ON rr.reporter_id = u.id
       JOIN products p ON r.product_id = p.id
       WHERE rr.status = 'pending'
       ORDER BY rr.created_at DESC`
    );

    res.json({ success: true, count: result.rows.length, reports: result.rows });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Resolve Report
exports.resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNotes } = req.body;
    const adminId = req.user.id;

    if (!['dismissed', 'reviewed'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Valid action required!' });
    }

    const result = await pool.query(
      `UPDATE review_reports 
       SET status = $1, admin_notes = $2, reviewed_at = NOW(), reviewed_by = $3
       WHERE id = $4 RETURNING *`,
      [action, adminNotes || null, adminId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Report not found!' });
    }

    // If reviewed (action taken against review), unapprove it
    if (action === 'reviewed') {
      await pool.query('UPDATE reviews SET is_approved = false WHERE id = $1', 
        [result.rows[0].review_id]);
    }

    res.json({ success: true, message: `✅ Report ${action}!`, report: result.rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Delete Review (Admin)
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM reviews WHERE id = $1 RETURNING id, product_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Review not found!' });
    }

    // Update product rating
    await updateProductRating(result.rows[0].product_id);

    res.json({ success: true, message: '✅ Review deleted!' });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Review Analytics
exports.getReviewAnalytics = async (req, res) => {
  try {
    const { storeId } = req.query;

    let productFilter = '';
    const params = [];

    if (storeId) {
      params.push(storeId);
      productFilter = `WHERE p.store_id = $1`;
    }

    const overall = await pool.query(
      `SELECT 
        COUNT(*) as total_reviews,
        COUNT(*) FILTER (WHERE is_approved = true) as approved,
        COUNT(*) FILTER (WHERE is_approved = false) as pending,
        COUNT(*) FILTER (WHERE report_count > 0) as reported,
        AVG(rating)::numeric(2,1) as avg_rating,
        COUNT(DISTINCT customer_id) as unique_reviewers
       FROM reviews`
    );

    const byRating = await pool.query(
      `SELECT rating, COUNT(*) as count FROM reviews WHERE is_approved = true GROUP BY rating ORDER BY rating`
    );

    const topReviewers = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, COUNT(r.id) as review_count,
              AVG(r.rating)::numeric(2,1) as avg_rating
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY review_count DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      overall: overall.rows[0],
      byRating: byRating.rows,
      topReviewers: topReviewers.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== HELPER FUNCTIONS ====================

// Update product average rating
async function updateProductRating(productId) {
  await pool.query(
    `UPDATE products 
     SET average_rating = (
       SELECT COALESCE(AVG(rating)::numeric(2,1), 0) 
       FROM reviews 
       WHERE product_id = $1
     )
     WHERE id = $1`,
    [productId]
  );
}

// Check and award badge
async function checkAndAwardBadge(userId, badgeType, badgeName) {
  try {
    await pool.query(
      `INSERT INTO user_badges (id, user_id, badge_type, badge_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, badge_type) DO NOTHING`,
      [uuidv4(), userId, badgeType, badgeName]
    );
  } catch (error) {
    console.error('Badge award error:', error);
  }
}
