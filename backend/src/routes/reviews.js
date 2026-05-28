const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// ==================== PUBLIC ROUTES ====================

// Get product reviews
router.get('/product/:productId', reviewController.getProductReviews);

// Get store rating
router.get('/store/:storeId/rating', reviewController.getStoreRating);

// Get review comments
router.get('/:id/comments', reviewController.getReviewComments);

// ==================== CUSTOMER ROUTES ====================

// Add review
router.post('/', auth, reviewController.addReview);

// Add comment to review
router.post('/:id/comments', auth, reviewController.addComment);

// Report review
router.post('/:id/report', auth, reviewController.reportReview);

// Vote helpful/unhelpful
router.put('/:id/vote', auth, reviewController.voteReview);

// ==================== VENDOR ROUTES ====================

// Vendor response to review
router.put('/:id/response', auth, role(['vendor']), reviewController.vendorResponse);

// Get vendor's store reviews
router.get('/vendor/reviews', auth, role(['vendor']), reviewController.getVendorReviews);

// ==================== ADMIN ROUTES ====================

// Get all reviews (with filters)
router.get('/', auth, role(['admin']), reviewController.getAllReviews);

// Get reported reviews
router.get('/reports/pending', auth, role(['admin']), reviewController.getReportedReviews);

// Review analytics
router.get('/analytics', auth, role(['admin']), reviewController.getReviewAnalytics);

// Approve review
router.put('/:id/approve', auth, role(['admin']), reviewController.approveReview);

// Toggle featured
router.put('/:id/featured', auth, role(['admin']), reviewController.toggleFeatured);

// Resolve report
router.put('/reports/:reportId/resolve', auth, role(['admin']), reviewController.resolveReport);

// Delete review
router.delete('/:id', auth, role(['admin']), reviewController.deleteReview);

module.exports = router;
