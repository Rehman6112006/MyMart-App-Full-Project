const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Customer routes
router.post('/', auth, returnController.createReturn);
router.get('/my', auth, returnController.getMyReturns);
router.get('/:id', auth, returnController.getReturnDetail);
router.delete('/:id', auth, returnController.cancelReturn);

// Admin routes
router.get('/', auth, role(['admin']), returnController.getAllReturns);
router.put('/:id/status', auth, role(['admin']), returnController.updateReturnStatus);

// Vendor routes
router.get('/vendor/returns', auth, role(['vendor']), returnController.getVendorReturns);
router.put('/vendor/returns/:id/status', auth, role(['vendor']), returnController.updateVendorReturnStatus);

module.exports = router;
