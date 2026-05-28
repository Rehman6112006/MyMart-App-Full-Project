const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');
const { strictAdmin } = require('../middleware/admin');

// All routes require admin authentication
router.use(authMiddleware, strictAdmin);

// Get all orders
router.get('/', orderController.getAllOrders);

// Get order stats
router.get('/stats', orderController.getOrderStats);

// Update order status
router.put('/:id/status', orderController.updateOrderStatus);

// Assign delivery person
router.put('/:id/assign-delivery', orderController.assignDeliveryPerson);

// Delivery settings
router.put('/delivery-settings', orderController.updateDeliverySettings);

// Delivery persons
router.get('/delivery-persons', orderController.getDeliveryPersons);
router.post('/delivery-persons', orderController.addDeliveryPerson);
router.delete('/delivery-persons/:id', orderController.deleteDeliveryPerson);

module.exports = router;
