const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

// ============================================
// PUBLIC ROUTES
// ============================================

// Get all active banners
router.get('/', bannerController.getBanners);

// Get active banners (alias for Flutter app)
router.get('/active', bannerController.getBanners);

// ============================================
// OFFERS ROUTES (MUST COME BEFORE /:id)
// ============================================

// Get all active offers
router.get('/offers/all', bannerController.getOffers);

// Get all offers admin
router.get('/offers/admin/all', authMiddleware, roleMiddleware(['admin']), bannerController.getAllOffersAdmin);

// Create offer
router.post('/offers', authMiddleware, roleMiddleware(['admin']), bannerController.createOffer);

// Update offer
router.put('/offers/:id', authMiddleware, roleMiddleware(['admin']), bannerController.updateOffer);

// Delete offer
router.delete('/offers/:id', authMiddleware, roleMiddleware(['admin']), bannerController.deleteOffer);

// ============================================
// ADMIN ROUTES (MUST COME BEFORE /:id)
// ============================================

// Get all banners (including inactive)
router.get('/admin/all', authMiddleware, roleMiddleware(['admin']), bannerController.getAllBannersAdmin);

// ============================================
// PARAM ROUTES (MUST COME LAST)
// ============================================

// Get single banner by ID
router.get('/:id', bannerController.getBannerById);

// Create banner
router.post('/', authMiddleware, roleMiddleware(['admin']), bannerController.createBanner);

// Update banner by ID
router.put('/:id', authMiddleware, roleMiddleware(['admin']), bannerController.updateBanner);

// Delete banner by ID
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), bannerController.deleteBanner);

// Validate coupon code
router.post('/validate-coupon', bannerController.validateCoupon);

module.exports = router;
