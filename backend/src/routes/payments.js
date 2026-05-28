const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const stripePaymentController = require('../controllers/stripePaymentController');
const stripeService = require('../services/stripeService');
const authenticate = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const isAdmin = roleMiddleware(['admin']);

// Stripe Card Payment - Real Stripe integration
router.post('/stripe', authenticate, async (req, res) => {
  try {
    const { card_number, expiry, cvv, name, amount, order_id } = req.body;
    
    // Validate inputs
    if (!card_number || !expiry || !cvv || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Card details are required'
      });
    }

    const userId = req.user.id;
    
    // Get user info
    const userResult = await pool.query(
      'SELECT email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Create payment intent with Stripe
    const paymentResult = await stripeService.createPaymentIntent({
      amount: amount,
      currency: 'usd',
      customerId: userId,
      metadata: {
        customerEmail: user.email,
        customerName: `${user.first_name} ${user.last_name}`,
        orderId: order_id || ''
      }
    });

    if (!paymentResult.success) {
      console.error('❌ Stripe payment error:', paymentResult.error);
      return res.status(400).json({
        success: false,
        error: paymentResult.error || 'Payment processing failed'
      });
    }

    console.log('✅ Stripe Payment Intent created:', {
      paymentIntentId: paymentResult.paymentIntentId,
      amount: amount,
      orderId: order_id
    });

    res.json({
      success: true,
      transaction_id: paymentResult.paymentIntentId,
      payment_intent_id: paymentResult.paymentIntentId,
      client_secret: paymentResult.clientSecret,
      status: 'requires_payment_method',
      message: 'Payment intent created. Complete payment with Stripe.'
    });
    
  } catch (error) {
    console.error('❌ Stripe payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment processing failed'
    });
  }
});

// ==================== SAVE CARD (Create SetupIntent) ====================
router.post('/stripe/save-card', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user info and Stripe customer ID
    const userResult = await pool.query(
      'SELECT email, first_name, last_name, stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.rows[0];
    let stripeCustomerId = user.stripe_customer_id;

    // Create Stripe customer if not exists
    if (!stripeCustomerId) {
      const customerResult = await stripeService.createCustomer({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        customerId: userId
      });

      if (customerResult.success) {
        stripeCustomerId = customerResult.customerId;
        await pool.query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [stripeCustomerId, userId]
        );
        console.log(`✅ Created Stripe customer for save-card: ${stripeCustomerId}`);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Failed to create Stripe customer'
        });
      }
    }

    // Create SetupIntent for saving card
    const setupResult = await stripeService.createSetupIntent(stripeCustomerId);

    if (!setupResult.success) {
      return res.status(400).json({
        success: false,
        error: setupResult.error || 'Failed to create setup intent'
      });
    }

    res.json({
      success: true,
      clientSecret: setupResult.clientSecret,
      message: 'Setup intent created. Complete card saving with Stripe.'
    });

  } catch (error) {
    console.error('❌ Save card error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save card'
    });
  }
});

// ==================== PAY WITH SAVED CARD ====================
router.post('/stripe/saved-card-pay', authenticate, async (req, res) => {
  try {
    const { payment_method_id, amount, order_id } = req.body;
    
    if (!payment_method_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Payment method ID and amount are required'
      });
    }

    const userId = req.user.id;

    // Get user info and Stripe customer ID
    const userResult = await pool.query(
      'SELECT email, first_name, last_name, stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.rows[0];
    let stripeCustomerId = user.stripe_customer_id;

    // Create Stripe customer if not exists
    if (!stripeCustomerId) {
      const customerResult = await stripeService.createCustomer({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        customerId: userId
      });

      if (customerResult.success) {
        stripeCustomerId = customerResult.customerId;
        await pool.query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [stripeCustomerId, userId]
        );
      }
    }

    if (!stripeCustomerId) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe customer found'
      });
    }

    // Create payment intent with saved payment method
    const paymentResult = await stripeService.createPaymentIntent({
      amount: amount,
      currency: 'usd',
      customerId: stripeCustomerId,
      paymentMethodId: payment_method_id,
      orderId: order_id,
      metadata: {
        paymentType: 'saved_card',
        customerEmail: user.email
      }
    });

    if (!paymentResult.success) {
      console.error('❌ Saved card payment error:', paymentResult.error);
      return res.status(400).json({
        success: false,
        error: paymentResult.error || 'Payment processing failed'
      });
    }

    console.log('✅ Saved Card Payment Intent created:', {
      paymentIntentId: paymentResult.paymentIntentId,
      amount: amount,
      paymentMethodId: payment_method_id,
      status: paymentResult.status
    });

    // If payment was automatically confirmed (succeeded)
    if (paymentResult.status === 'succeeded') {
      // Only create payment record and update order if order_id is provided
      // For saved card payments without order_id, the order will be created later
      // and payment record will be created by the order creation process
      if (order_id) {
        // Update order status
        await pool.query(
          `UPDATE orders SET payment_status = 'paid', order_status = 'confirmed', payment_method = 'card', updated_at = NOW() WHERE id = $1`,
          [order_id]
        );
        
        // Create payment record
        await pool.query(
          `INSERT INTO payments (id, order_id, amount, payment_method, payment_status, transaction_id, created_at)
           VALUES ($1, $2, $3, 'card', 'completed', $4, NOW())`,
          [uuidv4(), order_id, amount, paymentResult.paymentIntentId]
        );
      }

      return res.json({
        success: true,
        payment_intent_id: paymentResult.paymentIntentId,
        transaction_id: paymentResult.paymentIntentId,
        status: 'succeeded',
        message: 'Payment successful!'
      });
    }

    // If payment requires additional action (3D Secure, etc)
    res.json({
      success: true,
      payment_intent_id: paymentResult.paymentIntentId,
      client_secret: paymentResult.clientSecret,
      status: paymentResult.status,
      message: 'Payment initiated. Complete if required.'
    });

  } catch (error) {
    console.error('❌ Saved card payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment processing failed'
    });
  }
});

// ==================== LIST SAVED CARDS ====================
router.get('/stripe/cards', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user info and Stripe customer ID
    const userResult = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const stripeCustomerId = userResult.rows[0].stripe_customer_id;

    // If no Stripe customer, return empty cards
    if (!stripeCustomerId) {
      return res.json({
        success: true,
        cards: []
      });
    }

    // Get saved cards from Stripe
    const cardsResult = await stripeService.listPaymentMethods(stripeCustomerId);

    if (!cardsResult.success) {
      return res.status(400).json({
        success: false,
        error: cardsResult.error || 'Failed to get saved cards'
      });
    }

    res.json({
      success: true,
      cards: cardsResult.paymentMethods
    });

  } catch (error) {
    console.error('❌ List cards error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get saved cards'
    });
  }
});

// Confirm Stripe Payment
router.post('/stripe/confirm', authenticate, async (req, res) => {
  try {
    const { payment_intent_id, order_id, amount } = req.body;
    
    if (!payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required'
      });
    }

    // Verify payment with Stripe
    const paymentResult = await stripeService.retrievePaymentIntent(payment_intent_id);

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: paymentResult.error
      });
    }

    // Check if payment succeeded
    if (paymentResult.paymentIntent.status === 'succeeded') {
      // Only create payment record and update order if order_id is provided
      if (order_id) {
        // Create payment record
        await pool.query(
          `INSERT INTO payments (id, order_id, amount, payment_method, payment_status, transaction_id, created_at)
           VALUES ($1, $2, $3, 'card', 'completed', $4, NOW())`,
          [uuidv4(), order_id, amount || (paymentResult.paymentIntent.amount / 100), payment_intent_id]
        );

        // Update order status
        await pool.query(
          `UPDATE orders SET payment_status = 'paid', order_status = 'confirmed', payment_method = 'card', updated_at = NOW() WHERE id = $1`,
          [order_id]
        );
      }

      console.log('✅ Stripe Payment confirmed:', payment_intent_id);

      return res.json({
        success: true,
        status: 'succeeded',
        message: 'Payment confirmed successfully!'
      });
    }

    // Payment not succeeded yet
    res.json({
      success: true,
      status: paymentResult.paymentIntent.status,
      message: 'Payment not yet completed'
    });

  } catch (error) {
    console.error('❌ Confirm payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to confirm payment'
    });
  }
});

// ==================== DELETE SAVED CARD ====================
router.delete('/stripe/cards/:card_id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { card_id } = req.params;

    // Get card from database
    const cardResult = await pool.query(
      'SELECT * FROM user_saved_cards WHERE id = $1 AND user_id = $2',
      [card_id, userId]
    );

    if (cardResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    const card = cardResult.rows[0];

    // Delete from Stripe
    if (card.stripe_payment_id && card.stripe_payment_id.startsWith('pm_')) {
      try {
        await stripeService.detachPaymentMethod(card.stripe_payment_id);
        console.log(`✅ Deleted PaymentMethod from Stripe: ${card.stripe_payment_id}`);
      } catch (e) {
        console.log('⚠️ Could not delete from Stripe:', e.message);
      }
    }

    // Delete from database
    await pool.query('DELETE FROM user_saved_cards WHERE id = $1', [card_id]);

    console.log(`✅ Card deleted: ${card_id}`);

    res.json({
      success: true,
      message: 'Card deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete card error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete card'
    });
  }
});

router.post('/', authenticate, paymentController.createPayment);
router.get('/order/:orderId', authenticate, paymentController.getPaymentByOrder);
router.get('/', authenticate, isAdmin, paymentController.getAllPayments);

module.exports = router;
