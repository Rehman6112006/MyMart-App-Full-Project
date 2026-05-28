const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const notificationService = require('../services/notificationService');

// Get Shipping Providers (Public)
exports.getShippingProviders = async (req, res) => {
  try {
    const providers = [
      { id: 'dhl', name: 'DHL Express', logo: 'dhl.png', description: 'International & Domestic shipping', tracking_url: 'https://www.dhl.com/track?track=' },
      { id: 'fedex', name: 'FedEx', logo: 'fedex.png', description: 'Fast & reliable shipping', tracking_url: 'https://www.fedex.com/apps/fedextrack/?tracknumbers=' },
      { id: 'ups', name: 'UPS', logo: 'ups.png', description: 'Global logistics partner', tracking_url: 'https://www.ups.com/track?tracknum=' },
      { id: 'usps', name: 'USPS', logo: 'usps.png', description: 'United States Postal Service', tracking_url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' },
      { id: 'tcs', name: 'TCS', logo: 'tcs.png', description: 'Pakistan\'s leading courier', tracking_url: 'https://www.tcsexpress.com/tracking' },
      { id: 'dtexpress', name: 'DTEX Express', logo: 'dtex.png', description: 'Fast local delivery', tracking_url: 'https://dtexpress.pk/track' }
    ];

    res.json({
      success: true,
      count: providers.length,
      providers
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Create Shipment
exports.createShipment = async (req, res) => {
  try {
    const { orderId, carrier, shippingMethod, estimatedDays } = req.body;
    const vendorId = req.user.id;

    if (!orderId || !carrier || !shippingMethod) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order ID, carrier, and shipping method are required!' 
      });
    }

    // Check if vendor owns this order
    const orderCheck = await pool.query(
      `SELECT o.*, oi.store_id 
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN stores s ON oi.store_id = s.id
       WHERE o.id = $1 AND s.owner_id = $2`,
      [orderId, vendorId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Order not found or unauthorized!' });
    }

    // Check if shipment already exists
    const existingShipment = await pool.query(
      'SELECT id FROM shipments WHERE order_id = $1',
      [orderId]
    );

    if (existingShipment.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Shipment already exists for this order!' });
    }

    const trackingNumber = 'TRK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + (estimatedDays || 5));

    const result = await pool.query(
      `INSERT INTO shipments (id, order_id, tracking_number, carrier, shipping_method, 
        estimated_delivery_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'processing')
       RETURNING *`,
      [uuidv4(), orderId, trackingNumber, carrier, shippingMethod, estimatedDelivery]
    );

    // Update order status
    await pool.query(
      'UPDATE orders SET order_status = $1 WHERE id = $2',
      ['shipped', orderId]
    );

    // Notify customer
    const customer = await pool.query('SELECT * FROM users WHERE id = $1', [orderCheck.rows[0].customer_id]);
    
    await notificationService.notifyOrderShipped(
      customer.rows[0],
      orderCheck.rows[0],
      trackingNumber
    );

    res.status(201).json({
      success: true,
      message: '✅ Shipment created!',
      shipment: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get Shipment by Order
exports.getShipmentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await pool.query(
      `SELECT s.*, o.order_number, o.customer_id
       FROM shipments s
       JOIN orders o ON s.order_id = o.id
       WHERE s.order_id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shipment not found!' });
    }

    res.json({
      success: true,
      shipment: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get My Shipments (Customer)
exports.getMyShipments = async (req, res) => {
  try {
    const customerId = req.user.id;

    const result = await pool.query(
      `SELECT s.*, o.order_number
       FROM shipments s
       JOIN orders o ON s.order_id = o.id
       WHERE o.customer_id = $1
       ORDER BY s.created_at DESC`,
      [customerId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      shipments: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get All Shipments (Admin/Vendor)
exports.getAllShipments = async (req, res) => {
  try {
    const { status } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT s.*, o.order_number, o.total_amount,
             u.first_name, u.last_name, u.email,
             v.store_name
      FROM shipments s
      JOIN orders o ON s.order_id = o.id
      JOIN users u ON o.customer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN stores v ON oi.store_id = v.id
    `;

    const params = [];

    // Vendors only see their own shipments
    if (userRole === 'vendor') {
      query += ' WHERE v.owner_id = $1';
      params.push(userId);
    }

    if (status) {
      query += params.length > 0 ? ' AND' : ' WHERE';
      query += ' s.status = $' + (params.length + 1);
      params.push(status);
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      shipments: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update Shipment Status
exports.updateShipmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, location } = req.body;

    const validStatuses = [
      'processing', 'picked', 'in_transit', 'out_for_delivery', 
      'delivered', 'failed', 'returned'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status!' });
    }

    // Update tracking number if provided
    if (trackingNumber) {
      await pool.query(
        'UPDATE shipments SET tracking_number = $1 WHERE id = $2',
        [trackingNumber, id]
      );
    }

    const result = await pool.query(
      `UPDATE shipments 
       SET status = $1, latitude = $2, longitude = $3, last_update = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, location?.latitude || null, location?.longitude || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shipment not found!' });
    }

    // Update order status based on shipment status
    if (status === 'delivered') {
      await pool.query(
        'UPDATE orders SET order_status = $1, actual_delivery_date = NOW() WHERE id = $2',
        ['delivered', result.rows[0].order_id]
      );

      // Notify customer
      const order = await pool.query('SELECT * FROM orders WHERE id = $1', [result.rows[0].order_id]);
      const customer = await pool.query('SELECT * FROM users WHERE id = $1', [order.rows[0].customer_id]);
      
      await notificationService.notifyOrderDelivered(customer.rows[0], order.rows[0]);
    }

    res.json({
      success: true,
      message: `✅ Shipment status updated to: ${status}`,
      shipment: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Track Shipment
exports.trackShipment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT s.*, o.order_number,
              TO_CHAR(s.pickup_date, 'YYYY-MM-DD HH:MI') as pickup_time,
              TO_CHAR(s.actual_delivery_date, 'YYYY-MM-DD HH:MI') as delivery_time,
              TO_CHAR(s.estimated_delivery_date, 'YYYY-MM-DD') as estimated_date
       FROM shipments s
       JOIN orders o ON s.order_id = o.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shipment not found!' });
    }

    // Get tracking history
    const history = await pool.query(
      `SELECT status, location, latitude, longitude, created_at
       FROM shipment_tracking
       WHERE shipment_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      tracking: {
        ...result.rows[0],
        history: history.rows
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Add Tracking Update
exports.addTrackingUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, location, latitude, longitude } = req.body;

    // Add to tracking history
    await pool.query(
      `INSERT INTO shipment_tracking (id, shipment_id, status, location, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), id, status, location || null, latitude || null, longitude || null]
    );

    // Update current status
    await pool.query(
      `UPDATE shipments SET status = $1, last_update = NOW() WHERE id = $2`,
      [status, id]
    );

    res.json({
      success: true,
      message: '✅ Tracking update added!'
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Calculate Shipping Cost
exports.calculateShipping = async (req, res) => {
  try {
    const { weight, city, state, pincode } = req.body;

    // Base shipping rates
    const baseRates = {
      standard: 50,
      express: 100,
      overnight: 200
    };

    // Weight-based calculation
    const weightCharge = Math.max(0, (weight || 1) - 0.5) * 20;

    // Location-based calculation (simplified)
    const metroCities = ['mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad'];
    const isMetro = metroCities.some(city => city.toLowerCase().includes(city.toLowerCase()));
    const locationCharge = isMetro ? 0 : 30;

    const shippingOptions = {
      standard: {
        cost: baseRates.standard + weightCharge + locationCharge,
        estimatedDays: isMetro ? '2-3' : '5-7'
      },
      express: {
        cost: baseRates.express + weightCharge + locationCharge,
        estimatedDays: isMetro ? '1-2' : '3-4'
      },
      overnight: {
        cost: baseRates.overnight + weightCharge + locationCharge,
        estimatedDays: '1'
      }
    };

    res.json({
      success: true,
      options: shippingOptions
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
