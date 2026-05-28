const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminDashboardController');
const auth = require('../middleware/auth');
const { strictAdmin } = require('../middleware/admin');

router.use(auth);
router.use(strictAdmin);

router.get('/dashboard/stats', adminController.getDashboardStats);

router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

router.get('/vendors', adminController.getAllVendors);
router.put('/vendors/:id/approve', adminController.approveVendor);
router.put('/vendors/:id/suspend', adminController.suspendVendor);
router.put('/vendors/:id/reactivate', adminController.reactivateVendor);

router.put('/stores/:id/approve', adminController.approveStore);

router.get('/categories', adminController.getAllCategories);
router.get('/categories/:id/products', adminController.getProductsByCategory);

router.get('/commissions', adminController.getCommissionSummary);
router.post('/payouts', adminController.processPayout);

router.post('/reports/generate', adminController.generateReport);
router.get('/reports', adminController.getReports);

router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSetting);

router.get('/analytics/sales', adminController.getSalesAnalytics);
router.get('/analytics/top-products', adminController.getTopProducts);

module.exports = router;
