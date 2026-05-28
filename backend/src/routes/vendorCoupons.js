const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const auth = require('../middleware/auth');
const { vendorOnly } = require('../middleware/auth');

router.use(auth);
router.use(vendorOnly);

router.get('/', couponController.getVendorCoupons);
router.post('/', couponController.createVendorCoupon);
router.put('/:id', couponController.updateVendorCoupon);
router.delete('/:id', couponController.deleteVendorCoupon);

module.exports = router;
