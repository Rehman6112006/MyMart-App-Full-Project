const express = require('express');
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');
const { vendorOnly, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, productController.getAllProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/new-arrivals', productController.getNewArrivals);
router.get('/deals', productController.getDeals);

router.post('/', authMiddleware, vendorOnly, productController.createProduct);
router.get('/vendor/my-products', authMiddleware, vendorOnly, productController.getStoreProducts);

router.get('/:id', productController.getProductById);
router.put('/:id', authMiddleware, vendorOnly, productController.updateProduct);
router.delete('/:id', authMiddleware, vendorOnly, productController.deleteProduct);

module.exports = router;
