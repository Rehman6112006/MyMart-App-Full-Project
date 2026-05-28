const express = require('express');
const storeController = require('../controllers/storeController');
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

const router = express.Router();

// Public routes - only active stores
router.get('/', storeController.getAllStores);

// IMPORTANT: Vendor routes BEFORE /:id to avoid route conflict
// Vendor routes (login required)
router.post('/', authMiddleware, storeController.createStore);
router.get('/vendor/my-store', authMiddleware, storeController.getMyStore);
router.put('/vendor/my-store', authMiddleware, storeController.updateStore);

// Admin routes - returns all stores including pending
router.get('/admin/all', authMiddleware, roleMiddleware(['admin']), storeController.getAllStoresAdmin);
router.put('/:id/approve', authMiddleware, roleMiddleware(['admin']), storeController.approveStore);

// Public routes with :id parameter (must be last)
router.get('/:id', storeController.getStoreById);
router.get('/:id/products', productController.getProductsByStore);

module.exports = router;
