const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const authenticate = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

const isAdmin = roleMiddleware(['admin']);

// ==================== PUBLIC ROUTES ====================

// Get available coupons (Public - no auth required)
router.get('/available', couponController.getAvailableCoupons);

// ==================== CUSTOMER ROUTES ====================

// Validate coupon before applying
router.post('/validate', authenticate, couponController.validateCoupon);

// Get my coupon usage history
router.get('/my-usage', authenticate, couponController.getMyCouponHistory);

// ==================== ADMIN ROUTES ====================

// Get all coupons
router.get('/', authenticate, isAdmin, couponController.getAllCoupons);

// Get coupon analytics
router.get('/analytics', authenticate, isAdmin, couponController.getCouponAnalytics);

// Get single coupon details
router.get('/:id', authenticate, isAdmin, couponController.getCouponById);

// Create new coupon
router.post('/', authenticate, isAdmin, couponController.createCoupon);

// Update coupon
router.put('/:id', authenticate, isAdmin, couponController.updateCoupon);

// Delete coupon
router.delete('/:id', authenticate, isAdmin, couponController.deleteCoupon);

// Toggle coupon active status
router.put('/:id/toggle', authenticate, isAdmin, couponController.toggleCouponStatus);

module.exports = router;
