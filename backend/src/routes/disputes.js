const express = require('express');
const router = express.Router();
const disputeController = require('../controllers/disputeController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Customer routes
router.post('/', auth, disputeController.createDispute);
router.get('/my', auth, disputeController.getMyDisputes);
router.get('/:id', auth, disputeController.getDisputeDetail);
router.put('/:id/respond', auth, role(['vendor']), disputeController.vendorResponse);

// Admin routes
router.get('/', auth, role(['admin']), disputeController.getAllDisputes);
router.put('/:id', auth, role(['admin']), disputeController.updateDispute);
router.post('/:id/response', auth, role(['admin']), disputeController.addDisputeResponse);

// Vendor routes
router.get('/vendor/disputes', auth, role(['vendor']), disputeController.getVendorDisputes);

module.exports = router;
