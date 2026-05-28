const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');
const { vendorOnly, customerOnly } = require('../middleware/auth');
const { strictAdmin } = require('../middleware/admin');

router.get('/delivery-settings', orderController.getDeliverySettings);
router.get('/delivery-slots', orderController.getDeliverySlots);
router.get('/delivery-persons', orderController.getDeliveryPersons);

router.get('/addresses', authMiddleware, orderController.getAddresses);
router.post('/addresses', authMiddleware, orderController.addAddress);
router.put('/addresses/:id', authMiddleware, orderController.updateAddress);
router.delete('/addresses/:id', authMiddleware, orderController.deleteAddress);

router.post('/', authMiddleware, customerOnly, orderController.createOrder);
router.get('/', authMiddleware, orderController.getUserOrders);
router.get('/:id', authMiddleware, orderController.getOrder);
router.put('/:id/cancel', authMiddleware, customerOnly, orderController.cancelOrder);

router.get('/vendor/orders', authMiddleware, vendorOnly, orderController.getVendorOrders);
router.put('/vendor/orders/:id/status', authMiddleware, vendorOnly, orderController.updateVendorOrderStatus);
router.put('/vendor/orders/:id/payment-status', authMiddleware, vendorOnly, orderController.markVendorPaymentReceived);

module.exports = router;
