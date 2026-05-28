const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Public routes
router.get('/providers', shippingController.getShippingProviders);
router.post('/calculate-cost', shippingController.calculateShipping);

// Customer routes
router.get('/my', auth, shippingController.getMyShipments);
router.get('/order/:orderId', auth, shippingController.getShipmentByOrder);
router.post('/track', auth, shippingController.trackShipment); // POST version
router.get('/:id/track', auth, shippingController.trackShipment);

// Vendor/Admin routes
router.post('/', auth, role(['admin', 'vendor']), shippingController.createShipment);
router.get('/', auth, role(['admin', 'vendor']), shippingController.getAllShipments);
router.put('/:id/status', auth, role(['admin', 'vendor']), shippingController.updateShipmentStatus);
router.post('/:id/tracking', auth, role(['admin', 'vendor']), shippingController.addTrackingUpdate);

module.exports = router;
