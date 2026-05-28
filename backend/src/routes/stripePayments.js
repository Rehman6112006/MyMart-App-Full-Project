// ==================== STRIPE PAYMENT ROUTES ====================
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const stripePayment = require('../controllers/stripePaymentController');

// Public routes
// GET /api/stripe/config - Get Stripe publishable key (for frontend)
router.get('/config', stripePayment.getPublishableKey);

// POST /api/stripe/webhook - Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), stripePayment.stripeWebhook);

// Protected routes (require authentication)
router.post('/create-intent', auth, stripePayment.createPaymentIntent);
router.post('/confirm', auth, stripePayment.confirmPayment);
router.post('/success', auth, stripePayment.paymentSuccess);
router.post('/cancel', auth, stripePayment.cancelPayment);
router.post('/refund', auth, stripePayment.processRefund);
router.get('/cards', auth, stripePayment.getSavedCards);
router.delete('/cards/:card_id', auth, stripePayment.deleteSavedCard);
router.post('/setup-intent', auth, stripePayment.createSetupIntent);

module.exports = router;
