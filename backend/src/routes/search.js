const express = require('express');
const searchController = require('../controllers/searchController');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Full-text search with filters
// GET /api/search?q=laptop&category=xyz&minPrice=1000&maxPrice=50000
router.get('/', searchController.searchProducts);
router.get('/advanced', searchController.searchProducts);

// Autocomplete suggestions
router.get('/suggestions', searchController.getSearchSuggestions);

// Trending searches
router.get('/trending', searchController.getTrendingSearches);

// Get available filter options (brands, price range, categories)
router.get('/filters', searchController.getFilterOptions);

// ==================== CUSTOMER ROUTES (AUTH REQUIRED) ====================

// User's search history
router.get('/history', authMiddleware, searchController.getSearchHistory);

// Clear search history
router.delete('/history', authMiddleware, searchController.clearSearchHistory);

// ==================== ADMIN ROUTES ====================

// Manage search suggestions
router.get('/admin/suggestions', roleMiddleware(['admin']), searchController.adminGetSuggestions);
router.post('/admin/suggestions', roleMiddleware(['admin']), searchController.adminAddSuggestion);
router.put('/admin/suggestions/:id/trending', roleMiddleware(['admin']), searchController.adminToggleTrending);
router.delete('/admin/suggestions/:id', roleMiddleware(['admin']), searchController.adminDeleteSuggestion);

// Search analytics
router.get('/admin/analytics', roleMiddleware(['admin']), searchController.adminGetSearchAnalytics);

module.exports = router;
