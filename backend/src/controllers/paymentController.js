const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Create Payment Record
exports.createPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod, transactionId } = req.body;
    const customerId = req.user.id;

    // Verify order belongs to customer
    const order = await pool.query(
      'SELECT id, total_amount, payment_status FROM orders WHERE id = $1 AND customer_id = $2',
      [orderId, customerId]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found!' });
    }

    if (order.rows[0].payment_status === 'paid') {
      return res.status(400).json({ success: false, error: 'Order already paid!' });
    }

    // For card payments, set status to 'pending' until Stripe confirms; COD is immediate
    const paymentStatus = paymentMethod === 'card' ? 'pending' : 'completed';

    // Create payment record
    const result = await pool.query(
      `INSERT INTO payments (id, order_id, amount, payment_method, payment_status, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [uuidv4(), orderId, order.rows[0].total_amount, paymentMethod, paymentStatus, transactionId || null]
    );

    // Only mark order as paid for non-card payments (card is verified via Stripe)
    if (paymentMethod !== 'card') {
      await pool.query(
        "UPDATE orders SET payment_status = 'paid', order_status = 'confirmed', updated_at = NOW() WHERE id = $1",
        [orderId]
      );
    }

    res.status(201).json({
      success: true,
      message: '✅ Payment recorded successfully!',
      payment: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Payment by Order ID
exports.getPaymentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user.id;

    // Verify order belongs to customer
    const order = await pool.query(
      'SELECT id FROM orders WHERE id = $1 AND customer_id = $2',
      [orderId, customerId]
    );

    if (order.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found!' });
    }

    const result = await pool.query(
      'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC',
      [orderId]
    );

    res.json({ success: true, payments: result.rows });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get All Payments (Admin)
exports.getAllPayments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.amount, p.payment_method, p.payment_status, p.transaction_id, p.created_at,
              o.order_number, u.first_name, u.last_name, u.email
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       JOIN users u ON o.customer_id = u.id
       ORDER BY p.created_at DESC`
    );

    res.json({ success: true, count: result.rows.length, payments: result.rows });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
