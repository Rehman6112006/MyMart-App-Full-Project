// ==================== STRIPE PAYMENT SERVICE ====================
// Stripe Payment Gateway Integration

const Stripe = require('stripe');

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-02-24.acacia'
});

const CURRENCY = process.env.STRIPE_CURRENCY || 'usd';

// ==================== CREATE PAYMENT INTENT ====================
// Creates a payment intent for the customer to pay
exports.createPaymentIntent = async ({ amount, currency = CURRENCY, customerId, orderId, paymentMethodId, metadata = {} }) => {
  try {
    // Validate amount (Stripe expects smallest currency unit - cents)
    const amountInCents = Math.round(amount * 100);
    
    if (amountInCents < 50) {
      throw new Error('Amount must be at least 50 cents');
    }

    // Create payment intent params
    const paymentIntentParams = {
      amount: amountInCents,
      currency: currency,
      customer: customerId, // Include customer if provided (required for saved cards)
      metadata: {
        customerId: customerId || '',
        orderId: orderId || '',
        ...metadata
      },
      description: `MyMart Order Payment - ${orderId || 'N/A'}`
    };

    // If paymentMethodId is provided, add it (for saved cards)
    if (paymentMethodId) {
      paymentIntentParams.payment_method = paymentMethodId;
      paymentIntentParams.confirm = true;
      paymentIntentParams.return_url = 'mymart://payment-return';
    } else {
      // Use automatic payment methods for new cards
      paymentIntentParams.automatic_payment_methods = {
        enabled: true
      };
    }

    // If paymentMethodId is provided (saved card), use it directly
    if (paymentMethodId) {
      paymentIntentParams.payment_method = paymentMethodId;
      paymentIntentParams.confirm = true;
      paymentIntentParams.return_url = 'mymart://payment-return';
    } else {
      // Enable automatic payment methods for new cards
      paymentIntentParams.automatic_payment_methods = {
        enabled: true
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    console.log(`✅ Payment Intent created: ${paymentIntent.id}`);

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status
    };

  } catch (error) {
    console.error('❌ Stripe createPaymentIntent error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== RETRIEVE PAYMENT INTENT ====================
exports.retrievePaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return {
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        customerId: paymentIntent.metadata.customerId,
        orderId: paymentIntent.metadata.orderId
      }
    };

  } catch (error) {
    console.error('❌ Stripe retrievePaymentIntent error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== CONFIRM PAYMENT ====================
exports.confirmPayment = async (paymentIntentId, paymentMethodId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId
    });

    console.log(`✅ Payment confirmed: ${paymentIntent.status}`);

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    };

  } catch (error) {
    console.error('❌ Stripe confirmPayment error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== CANCEL PAYMENT INTENT ====================
exports.cancelPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    
    console.log(`✅ Payment cancelled: ${paymentIntent.id}`);

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    };

  } catch (error) {
    console.error('❌ Stripe cancelPaymentIntent error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== CREATE REFUND ====================
exports.createRefund = async ({ paymentIntentId, amount, reason }) => {
  try {
    const refundParams = {
      payment_intent: paymentIntentId,
      reason: reason || 'requested_by_customer'
    };

    // If partial refund, specify amount
    if (amount && amount > 0) {
      refundParams.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(refundParams);

    console.log(`✅ Refund created: ${refund.id}`);

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100, // Convert back to dollars
      status: refund.status
    };

  } catch (error) {
    console.error('❌ Stripe createRefund error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== CREATE CUSTOMER ====================
exports.createCustomer = async ({ email, name, customerId }) => {
  try {
    const customer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: {
        customerId: customerId
      }
    });

    console.log(`✅ Stripe Customer created: ${customer.id}`);

    return {
      success: true,
      customerId: customer.id
    };

  } catch (error) {
    console.error('❌ Stripe createCustomer error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== CREATE SETUP INTENT (for saving cards) ====================
exports.createSetupIntent = async (customerId) => {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    console.log(`✅ Setup Intent created: ${setupIntent.id}`);

    return {
      success: true,
      clientSecret: setupIntent.client_secret
    };

  } catch (error) {
    console.error('❌ Stripe createSetupIntent error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== CREATE EPHEMERAL KEY ====================
exports.createEphemeralKey = async (customerId) => {
  try {
    const ephemeralKey = await stripe.ephemeralKeys.create({
      customer: customerId,
    });

    console.log(`✅ Ephemeral Key created: ${ephemeralKey.id}`);

    return {
      success: true,
      ephemeralKeyId: ephemeralKey.secret
    };

  } catch (error) {
    console.error('❌ Stripe createEphemeralKey error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== LIST PAYMENT METHODS ====================
exports.listPaymentMethods = async (customerId) => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return {
      success: true,
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year
      }))
    };

  } catch (error) {
    console.error('❌ Stripe listPaymentMethods error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== VERIFY WEBHOOK SIGNATURE ====================
exports.verifyWebhookSignature = async (payload, signature) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    return {
      success: true,
      event: event
    };

  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== GET STRIPE BALANCE ====================
exports.getBalance = async () => {
  try {
    const balance = await stripe.balance.retrieve();

    return {
      success: true,
      available: balance.available.map(b => ({
        amount: b.amount / 100,
        currency: b.currency
      })),
      pending: balance.pending.map(b => ({
        amount: b.amount / 100,
        currency: b.currency
      }))
    };

  } catch (error) {
    console.error('❌ Stripe getBalance error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== CREATE PAYMENT LINK ====================
exports.createPaymentLink = async ({ amount, productName, orderId }) => {
  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price_data: {
          currency: CURRENCY,
          product_data: {
            name: productName || 'MyMart Order',
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      metadata: {
        orderId: orderId
      },
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: 'Thank you for your payment! Your order has been confirmed.'
        }
      }
    });

    console.log(`✅ Payment Link created: ${paymentLink.url}`);

    return {
      success: true,
      paymentLinkId: paymentLink.id,
      paymentLinkUrl: paymentLink.url
    };

  } catch (error) {
    console.error('❌ Stripe createPaymentLink error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== CREATE PAYMENT METHOD FROM TOKEN ====================
exports.createPaymentMethodFromToken = async (stripeToken) => {
  try {
    // Create a PaymentMethod using the token
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: stripeToken,
      },
    });

    console.log(`✅ PaymentMethod created from token: ${paymentMethod.id}`);

    return {
      success: true,
      paymentMethodId: paymentMethod.id,
      card: {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year
      }
    };

  } catch (error) {
    console.error('❌ Stripe createPaymentMethodFromToken error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== ATTACH PAYMENT METHOD TO CUSTOMER ====================
exports.attachPaymentMethod = async (paymentMethodId, customerId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    console.log(`✅ PaymentMethod attached to customer: ${paymentMethodId} -> ${customerId}`);

    return {
      success: true,
      paymentMethodId: paymentMethod.id
    };

  } catch (error) {
    console.error('❌ Stripe attachPaymentMethod error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== DETACH PAYMENT METHOD (Delete Card) ====================
exports.detachPaymentMethod = async (paymentMethodId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);

    console.log(`✅ PaymentMethod detached: ${paymentMethodId}`);

    return {
      success: true,
      paymentMethodId: paymentMethod.id
    };

  } catch (error) {
    console.error('❌ Stripe detachPaymentMethod error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== CREATE PAYMENT INTENT WITH METHOD (Confirm Immediately) ====================
exports.createPaymentIntentWithMethod = async ({ amount, currency = CURRENCY, customerId, paymentMethodId, metadata = {}, saveCard = false }) => {
  try {
    const amountInCents = Math.round(amount * 100);
    
    if (amountInCents < 50) {
      throw new Error('Amount must be at least 50 cents');
    }

    const paymentIntentParams = {
      amount: amountInCents,
      currency: currency,
      customer: customerId,
      metadata: {
        customerId: customerId || '',
        ...metadata
      },
      description: 'MyMart Order Payment'
    };

    // If saveCard is requested, set up future usage so Stripe saves the card
    if (saveCard) {
      paymentIntentParams.setup_future_usage = 'off_session';
    }

    if (paymentMethodId) {
      paymentIntentParams.payment_method = paymentMethodId;
      paymentIntentParams.confirm = true;
      paymentIntentParams.return_url = 'mymart://payment-return';
    } else {
      paymentIntentParams.automatic_payment_methods = {
        enabled: true
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    console.log(`✅ Payment Intent created: ${paymentIntent.id}`);
    console.log(`   Status: ${paymentIntent.status}`);
    console.log(`   Amount: ${amountInCents} ${currency}`);
    console.log(`   Save card: ${saveCard}`);

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    };

  } catch (error) {
    console.error('❌ Stripe createPaymentIntentWithMethod error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

console.log('✅ Stripe Payment Service Loaded');
