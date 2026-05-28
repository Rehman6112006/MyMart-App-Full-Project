// ==================== SETTLEMENT & COMMISSION ROUTES ====================
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const settlementController = require('../controllers/settlementController');

// ==================== ADMIN ROUTES ====================

// Commission Configuration
router.get('/admin/commission-configs', auth, settlementController.getCommissionConfigs);
router.post('/admin/commission/global', auth, settlementController.setGlobalCommission);
router.post('/admin/commission/vendor', auth, settlementController.setVendorCommission);
router.post('/admin/commission/category', auth, settlementController.setCategoryCommission);

// Settlements Management
router.get('/admin/settlements', auth, settlementController.getAllSettlements);
router.post('/admin/settlements/generate', auth, settlementController.generateSettlement);
router.put('/admin/settlements/status', auth, settlementController.updateSettlementStatus);

// Payout Requests Management
router.get('/admin/payout-requests', auth, settlementController.getAllPayoutRequests);
router.put('/admin/payout-requests/process', auth, settlementController.processPayoutRequest);

// Dashboard & Reports
router.get('/admin/stats', auth, settlementController.getAdminStats);
router.post('/admin/calculate-commission', auth, settlementController.calculateCommission);

// ==================== VENDOR ROUTES ====================

// Wallet & Earnings
router.get('/vendor/wallet', auth, settlementController.getMyWallet);
router.get('/vendor/earnings', auth, settlementController.getMyEarningsSummary);
router.get('/vendor/transactions', auth, settlementController.getMyTransactions);

// Payout Methods
router.get('/vendor/payout-methods', auth, settlementController.getMyPayoutMethods);
router.post('/vendor/payout-methods', auth, settlementController.addPayoutMethod);

// Payout Requests
router.get('/vendor/payout-requests', auth, settlementController.getMyPayoutRequests);
router.post('/vendor/payout-requests', auth, settlementController.createPayoutRequest);

module.exports = router;
