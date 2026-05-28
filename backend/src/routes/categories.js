const express = require('express');
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

const router = express.Router();

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/tree', categoryController.getCategoryTree);
router.get('/featured', categoryController.getFeaturedCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin only
router.post('/', authMiddleware, roleMiddleware(['admin']), categoryController.createCategory);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), categoryController.updateCategory);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), categoryController.deleteCategory);

module.exports = router;
