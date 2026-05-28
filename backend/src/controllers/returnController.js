const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const notificationService = require('../services/notificationService');
const { notifyAdminReturn, notifyVendorReturn } = require('./notificationController');

// Create Return Request
exports.createReturn = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { orderId, orderItemId, reason, description, images } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({ success: false, error: 'Order ID and reason are required!' });
    }

    const orderCheck = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND customer_id = $2',
      [orderId, customerId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found!' });
    }

    if (orderCheck.rows[0].status !== 'delivered') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only delivered orders can be returned!' 
      });
    }

    const existingReturn = await pool.query(
      'SELECT id FROM returns WHERE order_id = $1 AND status NOT IN ($2, $3)',
      [orderId, 'rejected', 'cancelled']
    );

    if (existingReturn.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Return request already exists for this order!' 
      });
    }

    const imagesArray = Array.isArray(images) ? JSON.stringify(images) : '[]';

    const result = await pool.query(
      `INSERT INTO returns (id, order_id, order_item_id, customer_id, reason, description, images, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [uuidv4(), orderId, orderItemId || null, customerId, reason, description || null, imagesArray]
    );

    if (orderItemId) {
      await pool.query(
        'UPDATE order_items SET item_status = $1 WHERE id = $2',
        ['return_requested', orderItemId]
      );
    }

    const admins = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    const returnData = result.rows[0];
    for (const admin of admins.rows) {
      try { await notifyAdminReturn(admin.id, 'A customer', reason); } catch (_) {}
    }

    const vendor = await pool.query(
      `SELECT u.id FROM users u
       JOIN stores s ON s.owner_id = u.id
       JOIN order_items oi ON oi.store_id = s.id
       WHERE oi.order_id = $1
       LIMIT 1`,
      [orderId]
    );
    if (vendor.rows.length > 0) {
      try { await notifyVendorReturn(vendor.rows[0].id, reason, orderId); } catch (_) {}
    }

    res.status(201).json({
      success: true,
      message: '✅ Return request submitted!',
      returnRequest: returnData
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get My Returns & Refunds
exports.getMyReturns = async (req, res) => {
  try {
    const customerId = req.user.id;

    const result = await pool.query(
      `SELECT r.id, r.reason, r.description, r.status, r.created_at, r.refund_amount,
              r.vendor_notes, r.resolved_at,
              o.order_number, o.total_amount,
              p.name as product_name, p.image_url as product_image,
              'return' as entry_type
       FROM returns r
       JOIN orders o ON r.order_id = o.id
       LEFT JOIN LATERAL (
         SELECT oi.product_id
         FROM order_items oi
         WHERE (r.order_item_id IS NOT NULL AND oi.id = r.order_item_id)
            OR (r.order_item_id IS NULL AND oi.order_id = r.order_id)
         ORDER BY oi.id = r.order_item_id DESC NULLS LAST
         LIMIT 1
       ) oi ON true
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE r.customer_id = $1
       UNION ALL
       SELECT o.id || '-refund' as id, NULL as reason, NULL as description, 'completed' as status,
              o.updated_at as created_at, p2.amount as refund_amount,
              NULL as vendor_notes, o.updated_at as resolved_at,
              o.order_number, o.total_amount,
              NULL as product_name, NULL as product_image,
              'refund' as entry_type
       FROM orders o
       LEFT JOIN LATERAL (
         SELECT amount FROM payments
         WHERE order_id = o.id AND payment_status = 'refunded'
         ORDER BY created_at DESC LIMIT 1
       ) p2 ON true
       WHERE o.customer_id = $2
         AND (o.status = 'refunded' OR o.payment_status = 'refunded')
         AND NOT EXISTS (
           SELECT 1 FROM returns r2
           WHERE r2.order_id = o.id AND r2.status NOT IN ('rejected', 'cancelled')
         )
       ORDER BY created_at DESC`,
      [customerId, customerId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      returns: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Return Detail
exports.getReturnDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;

    const result = await pool.query(
      `SELECT r.*, o.order_number, o.total_amount, o.shipping_address,
              p.name as product_name, p.images
       FROM returns r
       JOIN orders o ON r.order_id = o.id
       LEFT JOIN order_items oi ON r.order_item_id = oi.id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE r.id = $1 AND r.customer_id = $2`,
      [id, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Return not found!' });
    }

    res.json({
      success: true,
      return: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get All Returns (Admin)
exports.getAllReturns = async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT r.id, r.reason, r.description, r.status, r.created_at,
             o.order_number, o.total_amount,
             u.first_name, u.last_name, u.email,
             p.name as product_name
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      JOIN users u ON r.customer_id = u.id
      LEFT JOIN order_items oi ON r.order_item_id = oi.id
      LEFT JOIN products p ON oi.product_id = p.id
    `;

    const params = [];
    if (status) {
      query += ' WHERE r.status = $1';
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      returns: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update Return Status (Admin)
exports.updateReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected', 'received', 'refund_processing', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status!' });
    }

    // Get return details
    const returnData = await pool.query(
      'SELECT * FROM returns WHERE id = $1',
      [id]
    );

    if (returnData.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Return not found!' });
    }

    const result = await pool.query(
      `UPDATE returns 
       SET status = $1, admin_notes = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, adminNotes || null, id]
    );

    // If approved, trigger refund
    if (status === 'approved' || status === 'refund_processing') {
      const order = await pool.query('SELECT * FROM orders WHERE id = $1', [returnData.rows[0].order_id]);
      const customer = await pool.query('SELECT * FROM users WHERE id = $1', [order.rows[0].customer_id]);
      
      await notificationService.notifyRefundProcessed(
        customer.rows[0],
        order.rows[0].total_amount,
        order.rows[0].order_number
      );
    }

    res.json({
      success: true,
      message: `✅ Return status updated to: ${status}`,
      returnRequest: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Cancel Return Request
exports.cancelReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;

    const returnData = await pool.query(
      'SELECT * FROM returns WHERE id = $1 AND customer_id = $2',
      [id, customerId]
    );

    if (returnData.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Return not found!' });
    }

    if (returnData.rows[0].status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot cancel return after it has been processed!' 
      });
    }

    await pool.query('DELETE FROM returns WHERE id = $1', [id]);

    res.json({ success: true, message: '✅ Return cancelled!' });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update Return Status (Vendor only) - vendors can approve/reject/refund
exports.updateVendorReturnStatus = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;
    const { status, vendorNotes, refundAmount } = req.body;

    const validStatuses = ['approved', 'rejected', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Vendors can only approve, reject or refund returns' });
    }

    const check = await pool.query(
      `SELECT r.id, r.customer_id, r.order_id FROM returns r
       JOIN orders o ON r.order_id = o.id
       JOIN order_items oi ON o.id = oi.order_id
       JOIN stores s ON oi.store_id = s.id
       WHERE r.id = $1 AND s.owner_id = $2
       LIMIT 1`,
      [id, vendorId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Return not found or not associated with your store' });
    }

    let result;
    if (status === 'refunded') {
      // Full refund: set refund_amount, mark completed, set resolved_at
      const defaultRefund = refundAmount || null;
      result = await pool.query(
        `UPDATE returns SET status = 'completed', refund_amount = $1, vendor_notes = $2, 
         resolved_at = NOW(), updated_at = NOW() WHERE id = $3 RETURNING *`,
        [defaultRefund, vendorNotes || 'Refund processed by vendor', id]
      );

      // Notify customer about refund
      try {
        const returnData = check.rows[0];
        const customerResult = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [returnData.customer_id]);
        if (customerResult.rows.length > 0) {
          // In-app notification
          await pool.query(
            `INSERT INTO notifications (id, user_id, type, title, message, data)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              uuidv4(),
              returnData.customer_id,
              'order_refund',
              'Refund Completed',
              `Your return refund has been processed successfully.`,
              JSON.stringify({ return_id: id, order_id: returnData.order_id, amount: defaultRefund })
            ]
          );

          // Email notification
          await notificationService.sendEmail({
            to: customerResult.rows[0].email,
            subject: `Refund Completed - Return Request`,
            html: `
              <h2>Refund Completed</h2>
              <p>Hi ${customerResult.rows[0].first_name},</p>
              <p>Your return refund has been processed successfully.</p>
              ${defaultRefund ? `<p>Amount refunded: <strong>$${defaultRefund}</strong></p>` : ''}
              <p>The funds will appear in your original payment method within 5-10 business days.</p>
            `
          });
        }
      } catch (refundNotifyErr) {
        console.error('Return refund notification error:', refundNotifyErr.message);
      }
    } else {
      result = await pool.query(
        `UPDATE returns SET status = $1, vendor_notes = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [status, vendorNotes || `Vendor ${status} this return request`, id]
      );
    }

    res.json({ success: true, message: `Return ${status === 'refunded' ? 'refunded' : status}!`, returnRequest: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Vendor Returns (Vendor only)
exports.getVendorReturns = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { status } = req.query;

    let query = `
      SELECT r.id, r.reason, r.description, r.status, r.created_at, r.updated_at,
             r.refund_amount, r.vendor_notes, r.images, r.resolved_at,
             o.order_number, o.total_amount, o.vendor_id,
             u.id as customer_id, u.first_name, u.last_name, u.email,
             p.name as product_name, p.image_url as product_image
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      JOIN users u ON r.customer_id = u.id
      LEFT JOIN LATERAL (
        SELECT oi.product_id, oi.store_id
        FROM order_items oi
        WHERE (r.order_item_id IS NOT NULL AND oi.id = r.order_item_id)
           OR (r.order_item_id IS NULL AND oi.order_id = r.order_id)
        ORDER BY oi.id = r.order_item_id DESC NULLS LAST
        LIMIT 1
      ) oi ON true
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN stores s ON oi.store_id = s.id
      WHERE s.owner_id = $1 OR o.vendor_id = $1
    `;

    const params = [vendorId];

    if (status) {
      query += ` AND r.status = $2`;
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      returns: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
