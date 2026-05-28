// ==================== STRIPE PAYMENT CONTROLLER ====================
// Handles Stripe payment operations

const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const stripeService = require('../services/stripeService');
const notificationService = require('../services/notificationService');

// ==================== GET STRIPE PUBLISHABLE KEY ====================
exports.getPublishableKey = async (req, res) => {
  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey || publishableKey === 'pk_test_your_publishable_key_here') {
      return res.status(400).json({
        success: false,
        error: 'Stripe not configured. Please add STRIPE_PUBLISHABLE_KEY to .env'
      });
    }

    res.json({
      success: true,
      publishableKey: publishableKey
    });

  } catch (error) {
    console.error('Get publishable key error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== CREATE PAYMENT INTENT ====================
exports.createPaymentIntent = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { amount, currency = 'usd', stripe_token, card_last4, card_brand, save_card } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    // Get or create Stripe customer
    const userResult = await pool.query(
      'SELECT email, first_name, last_name, stripe_customer_id FROM users WHERE id = $1',
      [customerId]
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
        customerId: customerId
      });

      if (customerResult.success) {
        stripeCustomerId = customerResult.customerId;
        await pool.query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [stripeCustomerId, customerId]
        );
        console.log(`✅ Created Stripe customer for user ${customerId}: ${stripeCustomerId}`);
      }
    }

    let paymentMethodId = null;

    // Handle card saving: either from stripe_token (old flow) or from PaymentSheet (new flow)
    if (stripe_token && stripe_token.startsWith('tok_')) {
      console.log(`🔵 Processing card payment with token: ${stripe_token}`);
      
      // Create PaymentMethod from token
      const pmResult = await stripeService.createPaymentMethodFromToken(stripe_token);
      
      if (!pmResult.success) {
        return res.status(400).json({
          success: false,
          error: pmResult.error || 'Failed to process card'
        });
      }
      
      paymentMethodId = pmResult.paymentMethodId;
      console.log(`✅ Created PaymentMethod: ${paymentMethodId}`);
      
      // Attach PaymentMethod to customer
      await stripeService.attachPaymentMethod(paymentMethodId, stripeCustomerId);
    }

    // Save card to database if requested (works for both old and PaymentSheet flows)
    if (save_card && stripeCustomerId) {
      // Get the most recent PaymentMethods for this customer
      const recentPMs = await stripeService.listPaymentMethods(stripeCustomerId);
      if (recentPMs.success && recentPMs.paymentMethods.length > 0) {
        const latestPM = recentPMs.paymentMethods[0];
        await saveCardToDatabase({
          userId: customerId,
          stripeCustomerId: stripeCustomerId,
          stripePaymentId: paymentMethodId || latestPM.id,
          cardLast4: latestPM.last4 || card_last4 || '****',
          cardBrand: latestPM.brand || card_brand || 'unknown',
          expMonth: latestPM.expMonth || req.body.exp_month || 12,
          expYear: latestPM.expYear || req.body.exp_year || 2025
        });
      }
    }

    // Create payment intent with PaymentMethod (if provided) or automatic payment methods
    const paymentResult = await stripeService.createPaymentIntentWithMethod({
      amount: amount,
      currency: currency,
      customerId: stripeCustomerId,
      paymentMethodId: paymentMethodId,
      saveCard: !!save_card,
      metadata: {
        customerEmail: user.email,
        customerName: `${user.first_name} ${user.last_name}`
      }
    });

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: paymentResult.error
      });
    }

    console.log(`✅ Payment Intent created: ${paymentResult.paymentIntentId}`);

    res.json({
      success: true,
      clientSecret: paymentResult.clientSecret,
      paymentIntentId: paymentResult.paymentIntentId,
      paymentMethodId: paymentMethodId,
      status: paymentResult.status
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== CONFIRM PAYMENT ====================
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment Intent ID is required'
      });
    }

    // Retrieve payment status
    const paymentResult = await stripeService.retrievePaymentIntent(paymentIntentId);

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: paymentResult.error
      });
    }

    res.json({
      success: true,
      status: paymentResult.paymentIntent.status,
      paymentIntent: paymentResult.paymentIntent
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== PAYMENT SUCCESS (Webhook alternative - for frontend) ====================
exports.paymentSuccess = async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;
    const customerId = req.user.id;

    // Verify payment intent
    const paymentResult = await stripeService.retrievePaymentIntent(paymentIntentId);

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: paymentResult.error
      });
    }

    if (paymentResult.paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: `Payment not completed. Status: ${paymentResult.paymentIntent.status}`
      });
    }

    // Update order payment status
    if (orderId) {
      await pool.query(
        `UPDATE orders 
         SET payment_status = 'paid', 
             order_status = 'confirmed', 
             payment_method = 'card',
             updated_at = NOW() 
         WHERE id = $1`,
        [orderId]
      );

      // Create payment record
      await pool.query(
        `INSERT INTO payments (id, order_id, amount, payment_method, payment_status, transaction_id)
         VALUES ($1, $2, $3, 'card', 'completed', $4)`,
        [uuidv4(), orderId, paymentResult.paymentIntent.amount / 100, paymentIntentId]
      );

      // Get order details for notification
      const orderResult = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [orderId]
      );

      if (orderResult.rows.length > 0) {
        const order = orderResult.rows[0];
        
        // Send payment confirmation email
        const user = await pool.query(
          'SELECT * FROM users WHERE id = $1',
          [customerId]
        );

        if (user.rows.length > 0) {
          await notificationService.sendEmail({
            to: user.rows[0].email,
            subject: `Payment Confirmed - Order #${order.order_number}`,
            html: `
              <h2>Payment Received! 💳</h2>
              <p>Your payment of $${paymentResult.paymentIntent.amount / 100} has been confirmed.</p>
              <p><strong>Order:</strong> #${order.order_number}</p>
              <p>Your order is being processed!</p>
            `
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully!',
      paymentIntentId: paymentIntentId
    });

  } catch (error) {
    console.error('Payment success error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== CANCEL PAYMENT ====================
exports.cancelPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment Intent ID is required'
      });
    }

    const cancelResult = await stripeService.cancelPaymentIntent(paymentIntentId);

    if (!cancelResult.success) {
      return res.status(400).json({
        success: false,
        error: cancelResult.error
      });
    }

    res.json({
      success: true,
      message: 'Payment cancelled',
      paymentIntentId: paymentIntentId
    });

  } catch (error) {
    console.error('Cancel payment error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== PROCESS REFUND ====================
exports.processRefund = async (req, res) => {
  try {
    const { orderId, amount, reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify order exists and belongs to customer or user is admin
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check authorization
    if (userRole !== 'admin' && order.customer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Check if payment was made via Stripe
    const paymentResult = await pool.query(
      `SELECT * FROM payments 
       WHERE order_id = $1 AND payment_status = 'completed' 
       ORDER BY created_at DESC LIMIT 1`,
      [orderId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe payment found for this order'
      });
    }

    const payment = paymentResult.rows[0];

    // Process refund via Stripe
    const refundResult = await stripeService.createRefund({
      paymentIntentId: payment.transaction_id,
      amount: amount || order.total_amount,
      reason: reason || 'requested_by_customer'
    });

    if (!refundResult.success) {
      return res.status(400).json({
        success: false,
        error: refundResult.error
      });
    }

    // Update payment status
    await pool.query(
      `UPDATE payments 
       SET payment_status = 'refunded', 
           refund_date = NOW() 
       WHERE id = $1`,
      [payment.id]
    );

    // Update order status
    await pool.query(
      `UPDATE orders 
       SET payment_status = 'refunded', 
           order_status = 'cancelled', 
           updated_at = NOW() 
       WHERE id = $1`,
      [orderId]
    );

    // Notify customer
    const customer = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [order.customer_id]
    );

    if (customer.rows.length > 0) {
      await notificationService.sendEmail({
        to: customer.rows[0].email,
        subject: `Refund Processed - Order #${order.order_number}`,
        html: `
          <h2>Refund Processed! 💵</h2>
          <p>Your refund of $${refundResult.amount} for order #${order.order_number} has been processed.</p>
          <p>The amount will be credited to your account within 5-10 business days.</p>
        `
      });
    }

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refundId: refundResult.refundId,
      amount: refundResult.amount
    });

  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== GET SAVED CARDS ====================
exports.getSavedCards = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Get user info and Stripe customer ID
    const userResult = await pool.query(
      'SELECT email, first_name, last_name, stripe_customer_id FROM users WHERE id = $1',
      [customerId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.rows[0];
    let stripeCustomerId = user.stripe_customer_id;

    // Create Stripe customer if not exists (so we can start saving cards)
    if (!stripeCustomerId) {
      const customerResult = await stripeService.createCustomer({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        customerId: customerId
      });

      if (customerResult.success) {
        stripeCustomerId = customerResult.customerId;
        await pool.query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [stripeCustomerId, customerId]
        );
        console.log(`✅ Created Stripe customer for user ${customerId}: ${stripeCustomerId}`);
      }
    }

    if (!stripeCustomerId) {
      return res.json({
        success: true,
        cards: []
      });
    }

    const cardsResult = await stripeService.listPaymentMethods(stripeCustomerId);

    if (!cardsResult.success) {
      return res.status(400).json({
        success: false,
        error: cardsResult.error
      });
    }

    res.json({
      success: true,
      cards: cardsResult.paymentMethods
    });

  } catch (error) {
    console.error('Get saved cards error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== CREATE SETUP INTENT (for saving cards) ====================
exports.createSetupIntent = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Get user info and Stripe customer ID
    const userResult = await pool.query(
      'SELECT email, first_name, last_name, stripe_customer_id FROM users WHERE id = $1',
      [customerId]
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
        customerId: customerId
      });

      if (customerResult.success) {
        stripeCustomerId = customerResult.customerId;
        await pool.query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [stripeCustomerId, customerId]
        );
        console.log(`✅ Created Stripe customer for user ${customerId}: ${stripeCustomerId}`);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Failed to create Stripe customer'
        });
      }
    }

    const setupResult = await stripeService.createSetupIntent(stripeCustomerId);

    if (!setupResult.success) {
      return res.status(400).json({
        success: false,
        error: setupResult.error
      });
    }

    // Create ephemeral key for the customer
    const ephemeralKeyResult = await stripeService.createEphemeralKey(stripeCustomerId);

    res.json({
      success: true,
      clientSecret: setupResult.clientSecret,
      customerId: stripeCustomerId,
      ephemeralKey: ephemeralKeyResult.success ? ephemeralKeyResult.ephemeralKeyId : null
    });

  } catch (error) {
    console.error('Create setup intent error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== SAVE CARD TO DATABASE ====================
async function saveCardToDatabase({ userId, stripeCustomerId, stripePaymentId, cardLast4, cardBrand, expMonth, expYear }) {
  try {
    // Check if card already exists
    const existingCard = await pool.query(
      'SELECT id FROM user_saved_cards WHERE user_id = $1 AND stripe_payment_id = $2',
      [userId, stripePaymentId]
    );

    if (existingCard.rows.length > 0) {
      console.log('Card already saved, skipping...');
      return { success: true, message: 'Card already exists' };
    }

    // Check if this is the first card (make it default)
    const existingCards = await pool.query(
      'SELECT COUNT(*) FROM user_saved_cards WHERE user_id = $1',
      [userId]
    );
    const isDefault = parseInt(existingCards.rows[0].count) === 0;

    // Insert new card
    const result = await pool.query(
      `INSERT INTO user_saved_cards 
       (user_id, stripe_customer_id, stripe_payment_id, card_last4, card_brand, expiry_month, expiry_year, is_default, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [userId, stripeCustomerId, stripePaymentId, cardLast4, cardBrand, expMonth, expYear, isDefault]
    );

    console.log(`✅ Card saved to database: ${result.rows[0].id} (****${cardLast4})`);
    return { success: true, cardId: result.rows[0].id };

  } catch (error) {
    console.error('❌ Error saving card to database:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// ==================== DELETE SAVED CARD ====================
exports.deleteSavedCard = async (req, res) => {
  try {
    const { card_id } = req.params;

    // card_id is Stripe PaymentMethod ID (pm_xxx) from getSavedCards
    // Detach from Stripe directly
    if (card_id && card_id.startsWith('pm_')) {
      const result = await stripeService.detachPaymentMethod(card_id);
      if (result.success) {
        console.log(`✅ Deleted PaymentMethod from Stripe: ${card_id}`);
      } else {
        console.log('⚠️ Could not detach from Stripe:', result.error);
      }
    }

    // Clean up database record if exists
    try {
      await pool.query('DELETE FROM user_saved_cards WHERE stripe_payment_id = $1', [card_id]);
      console.log(`✅ Cleaned up database record for: ${card_id}`);
    } catch (e) {
      console.log('⚠️ Database cleanup skipped:', e.message);
    }

    res.json({
      success: true,
      message: 'Card deleted successfully'
    });

  } catch (error) {
    console.error('Delete saved card error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== STRIPE WEBHOOK ====================
exports.stripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];

    const result = await stripeService.verifyWebhookSignature(
      req.body,
      signature
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const event = result.event;

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('💳 Payment succeeded:', event.data.object.id);
        // Handle successful payment
        break;

      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed:', event.data.object.id);
        // Handle failed payment
        break;

      case 'charge.refunded':
        console.log('💰 Refund processed:', event.data.object.id);
        // Handle refund
        break;

      case 'customer.created':
        console.log('👤 New customer created:', event.data.object.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

console.log('✅ Stripe Payment Controller Loaded');
