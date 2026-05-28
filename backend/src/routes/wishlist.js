const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const auth = require('../middleware/auth');

// ==================== WISHLIST LISTS ====================

// Create a new wishlist
router.post('/lists', auth, wishlistController.createList);

// Get all my wishlists
router.get('/lists', auth, wishlistController.getMyLists);

// Update a wishlist
router.put('/lists/:id', auth, wishlistController.updateList);

// Delete a wishlist
router.delete('/lists/:id', auth, wishlistController.deleteList);

// Get shared wishlist (public)
router.get('/shared/:shareToken', wishlistController.getSharedList);

// ==================== WISHLIST ITEMS ====================

// Add to wishlist
router.post('/', auth, wishlistController.addToWishlist);

// Get my wishlist (default or by list)
router.get('/', auth, wishlistController.getMyWishlist);

// Move all items to cart (MUST be before :wishlistId route)
router.post('/move-all-to-cart', auth, wishlistController.moveAllToCart);

// Clear wishlist
router.delete('/', auth, wishlistController.clearWishlist);

// Check if product is in wishlist
router.get('/check/:productId', auth, wishlistController.checkWishlist);

// Remove from wishlist
router.delete('/:id', auth, wishlistController.removeFromWishlist);

// Move to cart
router.post('/:wishlistId/move-to-cart', auth, wishlistController.moveToCart);

// ==================== ALERTS ====================

// Set price alert
router.post('/alerts/price', auth, wishlistController.setPriceAlert);

// Get all active alerts
router.get('/alerts', auth, wishlistController.getAlerts);

// Get price drops
router.get('/price-drops', auth, wishlistController.getPriceDrops);

// ==================== ANALYTICS ====================

// Get wishlist analytics
router.get('/analytics', auth, wishlistController.getAnalytics);

// ==================== SHARED WISHLIST ====================

// Add item from shared wishlist
router.post('/shared/:shareToken/add', auth, wishlistController.addFromShared);

module.exports = router;
