const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const notificationService = require('../services/notificationService');
const { notifyAdminDispute, notifyCustomerDispute } = require('./notificationController');

// Create Dispute
exports.createDispute = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { orderId, reason, description, evidence } = req.body;

    if (!orderId || !reason || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order ID, reason, and description are required!' 
      });
    }

    // Check if order belongs to customer
    const orderCheck = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND customer_id = $2',
      [orderId, customerId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found!' });
    }

    // Check if dispute already exists
    const existingDispute = await pool.query(
      'SELECT id FROM disputes WHERE order_id = $1 AND customer_id = $2 AND status != $3',
      [orderId, customerId, 'resolved']
    );

    if (existingDispute.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dispute already exists for this order!' 
      });
    }

    // Create dispute
    const result = await pool.query(
      `INSERT INTO disputes (id, order_id, customer_id, reason, description, evidence, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open')
       RETURNING *`,
      [uuidv4(), orderId, customerId, reason, description, JSON.stringify(evidence || [])]
    );

    const dispute = result.rows[0];
    
    // Get order details
    const orderResult = await pool.query('SELECT order_number FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];

    // Notify admin
    const admins = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins.rows) {
      await notifyAdminDispute(admin.id, `${customerId}`, order.order_number, reason);
    }

    // Notify vendor
    const vendor = await pool.query(
      `SELECT v.id FROM users v
       JOIN order_items oi ON oi.store_id = (SELECT store_id FROM order_items WHERE order_id = $1 LIMIT 1)
       JOIN stores s ON oi.store_id = s.id
       WHERE s.owner_id = v.id
       LIMIT 1`,
      [orderId]
    );
    if (vendor.rows.length > 0) {
      await createNotification(vendor.rows[0].id, {
        type: 'dispute',
        title: 'New Dispute! ⚠️',
        message: `A dispute has been filed for order #${order.order_number}. Reason: ${reason}`,
        data: { disputeId: dispute.id }
      });
    }

    res.status(201).json({
      success: true,
      message: '✅ Dispute created! Admin will review shortly.',
      dispute
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get My Disputes
exports.getMyDisputes = async (req, res) => {
  try {
    const customerId = req.user.id;

    const result = await pool.query(
      `SELECT d.id, d.reason, d.description, d.status, d.resolution, d.created_at, d.updated_at,
              o.order_number, o.total_amount
       FROM disputes d
       JOIN orders o ON d.order_id = o.id
       WHERE d.customer_id = $1
       ORDER BY d.created_at DESC`,
      [customerId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      disputes: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Dispute Detail
exports.getDisputeDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT d.*, o.order_number, o.total_amount, o.shipping_address,
             u.first_name, u.last_name, u.email, u.phone,
             v.store_name, v.email as vendor_email
      FROM disputes d
      JOIN orders o ON d.order_id = o.id
      JOIN users u ON d.customer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN stores v ON oi.store_id = v.id
      WHERE d.id = $1
    `;

    const params = [id];

    // Customers can only see their own disputes
    if (userRole !== 'admin') {
      query += ' AND d.customer_id = $2';
      params.push(userId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dispute not found!' });
    }

    res.json({
      success: true,
      dispute: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get All Disputes (Admin)
exports.getAllDisputes = async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT d.id, d.reason, d.description, d.status, d.resolution, d.created_at,
             o.order_number, o.total_amount,
             u.first_name, u.last_name, u.email,
             v.store_name
      FROM disputes d
      JOIN orders o ON d.order_id = o.id
      JOIN users u ON d.customer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN stores v ON oi.store_id = v.id
    `;

    const params = [];
    if (status) {
      query += ' WHERE d.status = $1';
      params.push(status);
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      disputes: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update Dispute Status (Admin)
exports.updateDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, refundAmount } = req.body;

    const validStatuses = ['open', 'under_review', 'resolved', 'rejected', 'escalated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status!' });
    }

    // Get dispute
    const disputeData = await pool.query('SELECT * FROM disputes WHERE id = $1', [id]);

    if (disputeData.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dispute not found!' });
    }

    const result = await pool.query(
      `UPDATE disputes 
       SET status = $1, resolution = $2, refund_amount = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, resolution || null, refundAmount || null, id]
    );

    res.json({
      success: true,
      message: `✅ Dispute updated to: ${status}`,
      dispute: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Add Response to Dispute (Admin)
exports.addDisputeResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required!' });
    }

    const result = await pool.query(
      `UPDATE disputes 
       SET admin_response = $1, status = 'under_review', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [message, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dispute not found!' });
    }

    res.json({
      success: true,
      message: '✅ Response added!',
      dispute: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Vendor Response to Dispute
exports.vendorResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const vendorId = req.user.id;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required!' });
    }

    // Check if vendor owns this dispute's order
    const disputeCheck = await pool.query(
      `SELECT d.*, oi.store_id 
       FROM disputes d
       JOIN order_items oi ON d.order_id = oi.order_id
       JOIN stores s ON oi.store_id = s.id
       WHERE d.id = $1 AND s.owner_id = $2`,
      [id, vendorId]
    );

    if (disputeCheck.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'You are not authorized to respond to this dispute!' 
      });
    }

    const result = await pool.query(
      `UPDATE disputes 
       SET vendor_response = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [message, id]
    );

    res.json({
      success: true,
      message: '✅ Response submitted!',
      dispute: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Vendor Disputes (Vendor only)
exports.getVendorDisputes = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { status } = req.query;

    let query = `
      SELECT DISTINCT d.id, d.reason, d.description, d.status, d.resolution,
              d.vendor_response, d.admin_response, d.created_at, d.updated_at,
              o.order_number, o.total_amount,
              u.first_name, u.last_name, u.email
      FROM disputes d
      JOIN orders o ON d.order_id = o.id
      JOIN users u ON d.customer_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN stores s ON oi.store_id = s.id
      WHERE s.owner_id = $1
    `;

    const params = [vendorId];

    if (status) {
      query += ` AND d.status = $2`;
      params.push(status);
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      disputes: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
