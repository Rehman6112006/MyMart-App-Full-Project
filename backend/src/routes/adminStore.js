const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { strictAdmin } = require('../middleware/admin');
const adminStoreController = require('../controllers/adminStoreController');

router.use(auth);
router.use(strictAdmin);

router.get('/', adminStoreController.getAdminStore);
router.post('/', adminStoreController.createAdminStore);
router.put('/', adminStoreController.updateAdminStore);

router.get('/products', adminStoreController.getAdminStoreProducts);
router.post('/products', adminStoreController.createAdminStoreProduct);
router.put('/products/:id', adminStoreController.updateAdminStoreProduct);
router.delete('/products/:id', adminStoreController.deleteAdminStoreProduct);

router.get('/orders', adminStoreController.getAdminStoreOrders);
router.get('/orders/stats', adminStoreController.getAdminStoreOrderStats);
router.put('/orders/:id/status', adminStoreController.updateAdminStoreOrderStatus);
router.put('/orders/:id/payment-status', adminStoreController.markAdminStorePaymentReceived);

module.exports = router;
