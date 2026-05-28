const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/vendorDashboardController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// All routes require vendor or admin role
router.use(auth, role(['vendor', 'admin']));

// ==================== MAIN DASHBOARD ====================

// Dashboard overview
router.get('/dashboard', dashboardController.getDashboard);

// ==================== REPORTS ====================

// Sales report (with date range & grouping)
router.get('/reports/sales', dashboardController.getSalesReport);

// Product performance
router.get('/reports/products', dashboardController.getProductPerformance);

// Order report
router.get('/reports/orders', dashboardController.getOrderReport);

// Customer insights
router.get('/reports/customers', dashboardController.getCustomerInsights);

// Revenue breakdown
router.get('/reports/revenue', dashboardController.getRevenueBreakdown);

// Comparison report
router.get('/reports/comparison', dashboardController.getComparisonReport);

// Export sales report (CSV)
router.get('/reports/export', dashboardController.exportSalesReport);

module.exports = router;
