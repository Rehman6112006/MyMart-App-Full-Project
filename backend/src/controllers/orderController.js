const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const stripeService = require('../services/stripeService');
const notificationService = require('../services/notificationService');

// ============================================
// DELIVERY ADDRESSES
// ============================================

// Get user's delivery addresses
exports.getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT * FROM delivery_addresses 
       WHERE user_id = $1 
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );
    
    res.json({ success: true, addresses: result.rows });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Add new address
exports.addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, address_line1, address_line2, city, state, postal_code, landmark, is_default } = req.body;
    
    // If this is default, unset other defaults
    if (is_default) {
      await pool.query('UPDATE delivery_addresses SET is_default = false WHERE user_id = $1', [userId]);
    }
    
    const result = await pool.query(
      `INSERT INTO delivery_addresses (user_id, name, phone, address_line1, address_line2, city, state, postal_code, landmark, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [userId, name, phone, address_line1, address_line2, city, state, postal_code, landmark, is_default || false]
    );
    
    res.status(201).json({ success: true, address: result.rows[0] });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update address
exports.updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, phone, address_line1, address_line2, city, state, postal_code, landmark, is_default } = req.body;
    
    // If this is default, unset other defaults
    if (is_default) {
      await pool.query('UPDATE delivery_addresses SET is_default = false WHERE user_id = $1', [userId]);
    }
    
    const result = await pool.query(
      `UPDATE delivery_addresses 
       SET name = $1, phone = $2, address_line1 = $3, address_line2 = $4, city = $5, 
           state = $6, postal_code = $7, landmark = $8, is_default = $9, updated_at = NOW()
       WHERE id = $10 AND user_id = $11
       RETURNING *`,
      [name, phone, address_line1, address_line2, city, state, postal_code, landmark, is_default || false, id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }
    
    res.json({ success: true, address: result.rows[0] });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Delete address
exports.deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM delivery_addresses WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }
    
    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================
// DELIVERY SETTINGS & SLOTS
// ============================================

// Get delivery settings
exports.getDeliverySettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM delivery_settings ORDER BY setting_key');
    
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching delivery settings:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get delivery slots
exports.getDeliverySlots = async (req, res) => {
  try {
    const { date } = req.query;
    let query = 'SELECT * FROM delivery_slots WHERE is_active = true';
    
    // For same day, only show slots that haven't passed
    if (date) {
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        const currentHour = new Date().getHours();
        query += ` AND (slot_type != 'same_day' OR (slot_type = 'same_day' AND start_time > $1::time))`;
      }
    }
    
    query += ' ORDER BY start_time';
    
    const timeParam = date === today ? [`${currentHour}:00`] : [];
    const result = await pool.query(query, timeParam.length ? timeParam : undefined);
    res.json({ success: true, slots: result.rows });
  } catch (error) {
    console.error('Error fetching delivery slots:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================
// ORDERS - CREATE (COMPLETE CHECKOUT FLOW)
// Multi-Vendor Support: Splits cart by vendor/store
// ============================================

exports.createOrder = async (req, res) => {
  try {
    // Ensure all required columns exist in orders table
    try {
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id UUID`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10,2) DEFAULT 0`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address TEXT`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cod'`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_id UUID`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot_id UUID`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255)`);
      // Ensure order_items columns exist
      await pool.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255)`);
      await pool.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_image TEXT`);
      await pool.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) DEFAULT 0`);
      await pool.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2) DEFAULT 0`);
      await pool.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS store_id UUID`);
      // Ensure order_status_history table exists with all columns
      await pool.query(`
        CREATE TABLE IF NOT EXISTS order_status_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID,
          status VARCHAR(50) NOT NULL,
          notes TEXT,
          changed_by UUID,
          updated_by UUID,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(`ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS order_id UUID`);
      await pool.query(`ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS status VARCHAR(50)`);
      await pool.query(`ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS notes TEXT`);
      await pool.query(`ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS changed_by UUID`);
      await pool.query(`ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS updated_by UUID`);
    } catch (e) { /* ignore errors - columns/tables may already exist */ }
    
    const userId = req.user.id;
    const { 
      delivery_address_id, 
      delivery_slot_id, 
      delivery_date,
      delivery_notes,
      payment_method = 'cod',
      coupon_code,
      store_id,
      store_name,
      stripe_payment_intent_id
    } = req.body;
    
    console.log('=== CREATE ORDER DEBUG ===');
    console.log('userId:', userId);
    console.log('delivery_address_id:', delivery_address_id);
    console.log('payment_method:', payment_method);
    
    // Validate delivery address
    if (!delivery_address_id) {
      console.log('Error: Missing delivery_address_id');
      return res.status(400).json({ success: false, error: 'Please select a delivery address' });
    }
    
    // Fetch cart items
    console.log('Querying cart for userId:', userId);
    const cartResult = await pool.query(
      `SELECT ci.*, p.name as product_name, p.thumbnail as product_image, p.base_price as unit_price, p.store_id as cart_store_id,
              s.store_name, s.owner_id as vendor_id
       FROM cart_items ci 
       LEFT JOIN products p ON ci.product_id = p.id 
       LEFT JOIN stores s ON p.store_id = s.id
       WHERE ci.customer_id = $1`,
      [userId]
    );
    
    console.log('Cart items count from DB:', cartResult.rows.length);
    if (cartResult.rows.length > 0) {
      console.log('First cart item customer_id:', cartResult.rows[0].customer_id);
    }
    
    if (cartResult.rows.length === 0) {
      console.log('Error: Cart is empty');
      return res.status(400).json({ success: false, error: 'Your cart is empty' });
    }
    
    // Get delivery address details
    const addrResult = await pool.query(
      'SELECT * FROM delivery_addresses WHERE id = $1 AND user_id = $2',
      [delivery_address_id, userId]
    );
    
    if (addrResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid delivery address' });
    }
    
    const deliveryAddressObj = addrResult.rows[0];
    
    // Format shipping address string
    let shippingAddressStr = `${deliveryAddressObj.name}\n${deliveryAddressObj.phone}\n${deliveryAddressObj.address_line1}`;
    if (deliveryAddressObj.address_line2) shippingAddressStr += `, ${deliveryAddressObj.address_line2}`;
    shippingAddressStr += `\n${deliveryAddressObj.city}`;
    if (deliveryAddressObj.postal_code) shippingAddressStr += `, ${deliveryAddressObj.postal_code}`;
    if (deliveryAddressObj.landmark) shippingAddressStr += `\nLandmark: ${deliveryAddressObj.landmark}`;
    
    // Get delivery settings (use env defaults if not in DB)
    const baseDeliveryCharge = parseFloat(process.env.DELIVERY_BASE_FEE) || 3.00;
    const freeDeliveryThreshold = parseFloat(process.env.FREE_DELIVERY_THRESHOLD) || 35.00;
    const sameDayCharge = 2.00;
    
    // Also check database for any overrides
    try {
      const deliverySettings = await pool.query('SELECT setting_key, setting_value FROM delivery_settings');
      const settings = {};
      deliverySettings.rows.forEach(row => {
        settings[row.setting_key] = parseFloat(row.setting_value);
      });
      if (settings.base_delivery_charge) baseDeliveryCharge = settings.base_delivery_charge;
      if (settings.free_delivery_threshold) freeDeliveryThreshold = settings.free_delivery_threshold;
      if (settings.same_day_delivery_charge) sameDayCharge = settings.same_day_delivery_charge;
    } catch (e) {}
    
    // Calculate slot extra charge
    let slotExtraCharge = 0;
    let slotInfo = null;
    if (delivery_slot_id) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(delivery_slot_id);
      let slotResult;
      
      if (isUUID) {
        slotResult = await pool.query('SELECT * FROM delivery_slots WHERE id = $1', [delivery_slot_id]);
      } else {
        slotResult = await pool.query('SELECT * FROM delivery_slots WHERE slot_name = $1', [delivery_slot_id]);
      }
      
      if (slotResult.rows.length > 0) {
        slotInfo = slotResult.rows[0];
        if (slotInfo.slot_type === 'same_day') {
          slotExtraCharge += sameDayCharge;
        }
        slotExtraCharge += parseFloat(slotInfo.extra_charge || 0);
      }
    }
    
    // Group cart items by store/vendor
    const itemsByStore = {};
    for (const item of cartResult.rows) {
      const storeId = item.cart_store_id || 'default';
      if (!itemsByStore[storeId]) {
        itemsByStore[storeId] = {
          vendorId: item.vendor_id,
          storeName: item.store_name,
          items: []
        };
      }
      itemsByStore[storeId].items.push({
        product_id: item.product_id,
        name: item.product_name || 'Product',
        image: item.product_image,
        quantity: item.quantity,
        price: item.unit_price || 0,
        store_id: item.cart_store_id,
        cart_item_id: item.id
      });
    }
    
    console.log('=== MULTI-VENDOR ORDER SPLITTING ===');
    console.log('Number of stores/vendors:', Object.keys(itemsByStore).length);
    
    // Calculate coupon discount (applies to total cart, will be distributed)
    let discountAmount = 0;
    let couponMinOrder = 0;
    let couponDiscountType = null;
    let couponDiscountValue = 0;
    
    if (coupon_code) {
      const couponResult = await pool.query(
        `SELECT * FROM coupons WHERE code = $1 AND is_active = true AND expires_at > NOW()`,
        [coupon_code]
      );
      if (couponResult.rows.length > 0) {
        const coupon = couponResult.rows[0];
        couponMinOrder = coupon.min_order_amount || 0;
        couponDiscountType = coupon.discount_type;
        couponDiscountValue = parseFloat(coupon.discount_value);
      }
    }
    
    // Create separate orders for each store/vendor
    const createdOrders = [];
    
    for (const [storeId, storeData] of Object.entries(itemsByStore)) {
      // Calculate subtotal for this store
      let subtotal = 0;
      for (const item of storeData.items) {
        subtotal += (item.price || 0) * (item.quantity || 1);
      }
      
      // Calculate discount for this store (proportional)
      let storeDiscount = 0;
      if (coupon_code && couponDiscountType) {
        // Calculate total cart value
        let totalCartValue = 0;
        for (const item of cartResult.rows) {
          totalCartValue += (item.unit_price || 0) * (item.quantity || 1);
        }
        
        if (totalCartValue >= couponMinOrder) {
          if (couponDiscountType === 'percentage') {
            const totalDiscount = Math.round(totalCartValue * (couponDiscountValue / 100) * 100) / 100;
            // Distribute proportionally
            storeDiscount = Math.round((subtotal / totalCartValue) * totalDiscount * 100) / 100;
          } else {
            // Fixed discount - distribute proportionally
            storeDiscount = Math.round((subtotal / totalCartValue) * couponDiscountValue * 100) / 100;
          }
        }
      }
      
      // Calculate delivery charge for this store
      let deliveryCharge = baseDeliveryCharge;
      if (subtotal >= freeDeliveryThreshold) deliveryCharge = 0;
      deliveryCharge += slotExtraCharge;
      
      // Calculate tax
      const taxableAmount = subtotal - storeDiscount;
      const taxAmount = Math.round(taxableAmount * 0.18 * 100) / 100;
      
      // Final total for this store
      const totalAmount = Math.round((subtotal + deliveryCharge + taxAmount - storeDiscount) * 100) / 100;
      
      // Get vendor_id
      let vendorId = storeData.vendorId;
      if (!vendorId) {
        const productResult = await pool.query(
          `SELECT s.owner_id FROM products p
           LEFT JOIN stores s ON p.store_id = s.id
           WHERE p.id = $1`,
          [storeData.items[0].product_id]
        );
        if (productResult.rows.length > 0) {
          vendorId = productResult.rows[0].owner_id;
        }
      }
      if (!vendorId) vendorId = userId;
      
      // Generate unique order number
      const orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
      
      // Re-fetch slot info for order response (if not already fetched)
      let finalSlotInfo = slotInfo;
      if (delivery_slot_id && !finalSlotInfo) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(delivery_slot_id);
        if (isUUID) {
          const slotResult = await pool.query('SELECT * FROM delivery_slots WHERE id = $1', [delivery_slot_id]);
          if (slotResult.rows.length > 0) finalSlotInfo = slotResult.rows[0];
        } else {
          const slotResult = await pool.query('SELECT * FROM delivery_slots WHERE slot_name = $1', [delivery_slot_id]);
          if (slotResult.rows.length > 0) finalSlotInfo = slotResult.rows[0];
        }
      }
      
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(delivery_slot_id);
      const finalSlotId = isValidUUID ? delivery_slot_id : null;
      
      // Create order
      const orderResult = await pool.query(
        `INSERT INTO orders (
          order_number, customer_id, vendor_id, store_id, subtotal, delivery_charge, tax_amount, discount_amount, total_amount,
          delivery_address_id, delivery_slot_id, delivery_date, delivery_notes,
          payment_method, status, shipping_address, stripe_payment_intent_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', $15, $16)
        RETURNING *`,
        [orderNumber, userId, vendorId, storeId, subtotal, deliveryCharge, taxAmount, storeDiscount, totalAmount,
         delivery_address_id, finalSlotId, delivery_date || new Date().toISOString().split('T')[0], 
         delivery_notes, payment_method, shippingAddressStr, stripe_payment_intent_id || null]
      );
      
      const order = orderResult.rows[0];
      
      // If stripe_payment_intent_id provided, create pending payment record
      // (actual payment confirmation happens via Stripe webhook or paymentSuccess callback)
      if (stripe_payment_intent_id) {
        try {
          // Create pending payment record (not marked as paid yet)
          await pool.query(
            `INSERT INTO payments (id, order_id, amount, payment_method, payment_status, transaction_id)
             VALUES ($1, $2, $3, 'card', 'pending', $4)`,
            [require('uuid').v4(), order.id, totalAmount, stripe_payment_intent_id]
          );
          
          console.log(`Created payment record for order ${order.id} with Stripe intent: ${stripe_payment_intent_id}`);
        } catch (e) {
          console.log('Error creating payment record:', e.message);
        }
      }
      
      // Insert order items
      const insertedItems = [];
      for (const item of storeData.items) {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        const itemResult = await pool.query(
          `INSERT INTO order_items (order_id, product_id, store_id, product_name, product_image, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [order.id, item.product_id, storeId, item.name, item.image, item.quantity, item.price, itemTotal]
        );
        insertedItems.push(itemResult.rows[0]);
      }
      
      // Add status history
      await pool.query(
        'INSERT INTO order_status_history (order_id, status, notes, changed_by) VALUES ($1, $2, $3, $4)',
        [order.id, 'pending', 'Order placed successfully', userId]
      );
      
      // Remove this store's items from cart
      await pool.query('DELETE FROM cart_items WHERE customer_id = $1 AND product_id = ANY($2)',
        [userId, storeData.items.map(i => i.product_id)]
      );
      
      createdOrders.push({
        ...order,
        store_name: storeData.storeName,
        items: insertedItems,
        delivery_slot: finalSlotInfo,
        delivery_address: deliveryAddressObj
      });
      
      console.log(`Created order ${orderNumber} for store ${storeData.storeName} with ${storeData.items.length} items`);
    }
    
    console.log('=== ORDER CREATION COMPLETE ===');
    console.log(`Total orders created: ${createdOrders.length}`);
    
    res.status(201).json({ 
      success: true, 
      message: createdOrders.length > 1 
        ? `${createdOrders.length} orders placed successfully - one for each store!`
        : 'Order placed successfully!',
      order: createdOrders[0] || createdOrders, // Return first order for single order, or array for multi
      orders: createdOrders,
      totalOrders: createdOrders.length
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================
// ORDERS - GET USER ORDERS
// ============================================

exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM orders WHERE customer_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].total, 10);
    
    const result = await pool.query(
      `SELECT o.*, 
              da.name as address_name, da.phone as address_phone,
              da.address_line1, da.address_line2, da.city, da.postal_code, da.landmark,
              ds.slot_name, ds.slot_type, ds.start_time, ds.end_time,
              dp.name as delivery_person_name, dp.phone as delivery_person_phone,
              s.store_name
       FROM orders o
       LEFT JOIN delivery_addresses da ON o.delivery_address_id = da.id
       LEFT JOIN delivery_slots ds ON o.delivery_slot_id = ds.id
       LEFT JOIN delivery_persons dp ON o.delivery_person_id = dp.id
       LEFT JOIN stores s ON o.store_id = s.id
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    // Batch fetch items and status history
    const orderIds = result.rows.map(o => o.id);
    
    const itemsResult = orderIds.length > 0
      ? await pool.query('SELECT * FROM order_items WHERE order_id = ANY($1)', [orderIds])
      : { rows: [] };
    const itemsByOrder = {};
    for (const item of itemsResult.rows) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    }
    
    const historyResult = orderIds.length > 0
      ? await pool.query('SELECT * FROM order_status_history WHERE order_id = ANY($1) ORDER BY created_at ASC', [orderIds])
      : { rows: [] };
    const historyByOrder = {};
    for (const h of historyResult.rows) {
      if (!historyByOrder[h.order_id]) historyByOrder[h.order_id] = [];
      historyByOrder[h.order_id].push(h);
    }
    
    // Assign to orders
    for (const order of result.rows) {
      order.items = itemsByOrder[order.id] || [];
      order.status_history = historyByOrder[order.id] || [];
      order.order_status = order.status;
    }
    
    res.json({
      success: true,
      orders: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================
// ORDERS - GET SINGLE ORDER
// ============================================

exports.getOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT o.*, 
              da.name as address_name, da.phone as address_phone,
              da.address_line1, da.address_line2, da.city, da.postal_code, da.landmark,
              ds.slot_name, ds.slot_type, ds.start_time, ds.end_time,
              dp.name as delivery_person_name, dp.phone as delivery_person_phone,
              u.first_name as vendor_first_name, u.last_name as vendor_last_name,
              s.store_name
       FROM orders o
       LEFT JOIN delivery_addresses da ON o.delivery_address_id = da.id
       LEFT JOIN delivery_slots ds ON o.delivery_slot_id = ds.id
       LEFT JOIN delivery_persons dp ON o.delivery_person_id = dp.id
       LEFT JOIN users u ON o.vendor_id = u.id
       LEFT JOIN stores s ON o.store_id = s.id
       WHERE o.id = $1 AND o.customer_id = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const order = result.rows[0];
    
    const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = ANY($1)', [[order.id]]);
    const historyResult = await pool.query(
      'SELECT * FROM order_status_history WHERE order_id = ANY($1) ORDER BY created_at ASC', [[order.id]]
    );
    
    order.items = itemsResult.rows;
    order.status_history = historyResult.rows;
    order.order_status = order.status;
    
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================
// ORDERS - CANCEL ORDER (User)
// ============================================

exports.cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;
    
    // Only pending orders can be cancelled by user
    const result = await pool.query(
      `UPDATE orders 
       SET status = 'cancelled', cancellation_reason = $1, cancelled_by = $2, updated_at = NOW() 
       WHERE id = $3 AND customer_id = $4 AND status = 'pending' 
       RETURNING *`,
      [reason || 'Cancelled by user', userId, id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order cannot be cancelled. Only pending orders can be cancelled.' 
      });
    }

    const cancelledOrder = result.rows[0];
    
    await pool.query(
      'INSERT INTO order_status_history (order_id, status, notes, changed_by) VALUES ($1, $2, $3, $4)',
      [id, 'cancelled', reason || 'Cancelled by user', userId]
    );

    // Auto-refund on user cancellation
    try {
      const paymentResult = await pool.query(
        `SELECT * FROM payments WHERE order_id = $1 AND payment_status = 'completed' ORDER BY created_at DESC LIMIT 1`,
        [id]
      );

      if (paymentResult.rows.length > 0) {
        const payment = paymentResult.rows[0];

        const refundResult = await stripeService.createRefund({
          paymentIntentId: payment.transaction_id,
          amount: cancelledOrder.total_amount || payment.amount,
          reason: 'requested_by_customer'
        });

        if (refundResult.success) {
          await pool.query(
            `UPDATE payments SET payment_status = 'refunded', refund_date = NOW() WHERE id = $1`,
            [payment.id]
          );

          await pool.query(
            `UPDATE orders SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1`,
            [id]
          );

          await pool.query(
            `INSERT INTO notifications (id, user_id, type, title, message, data)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              uuidv4(),
              userId,
              'order_refund',
              'Refund Processed',
              `Your order #${cancelledOrder.order_number || id.slice(-8)} has been cancelled and refunded.`,
              JSON.stringify({ order_id: id, amount: payment.amount })
            ]
          );

          // Send email notification
          try {
            const userResult = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length > 0) {
              await notificationService.sendEmail({
                to: userResult.rows[0].email,
                subject: `Refund Processed - Order #${cancelledOrder.order_number || id.slice(-8)}`,
                html: `
                  <h2>Order Cancelled & Refunded</h2>
                  <p>Hi ${userResult.rows[0].first_name},</p>
                  <p>Your order #${cancelledOrder.order_number || id.slice(-8)} has been cancelled.</p>
                  <p>A refund of <strong>$${payment.amount}</strong> has been initiated and will be credited back to your original payment method within 5-10 business days.</p>
                `
              });
            }
          } catch (emailErr) {
            console.error('Email notification error on cancellation:', emailErr.message);
          }
        }
      }
    } catch (refundErr) {
      console.error('Auto-refund error on user cancellation:', refundErr.message);
    }
    
    res.json({ success: true, message: 'Order cancelled and refunded', order: result.rows[0] });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================
// VENDOR ORDER MANAGEMENT
// ============================================

exports.getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Get vendor's store ID first
    const storeResult = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [vendorId]);
    let storeId = null;
    if (storeResult.rows.length > 0) {
      storeId = storeResult.rows[0].id;
    }
    
    let query = `
      SELECT o.*, 
             u.first_name, u.last_name, u.phone as user_phone, u.email as user_email,
             da.name as address_name, da.phone as address_phone,
             da.address_line1, da.address_line2, da.city, da.postal_code, da.landmark,
             ds.slot_name, ds.slot_type, ds.start_time, ds.end_time,
             st.store_name
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN delivery_addresses da ON o.delivery_address_id = da.id
      LEFT JOIN delivery_slots ds ON o.delivery_slot_id = ds.id
      LEFT JOIN stores st ON COALESCE(o.store_id, o.vendor_id::uuid) = st.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filter by store_id OR vendor_id
    if (storeId) {
      query += ` AND (o.store_id = $${params.length + 1} OR o.vendor_id = $${params.length + 1})`;
      params.push(storeId);
    } else {
      query += ` AND o.vendor_id = $${params.length + 1}`;
      params.push(vendorId);
    }
    
    if (status) {
      query += ` AND o.status = $${params.length + 1}`;
      params.push(status);
    }
    
    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Batch fetch items and status history
    const orderIds = result.rows.map(o => o.id);
    
    const itemsResult = orderIds.length > 0
      ? await pool.query(`
          SELECT oi.*, p.name as product_name, p.thumbnail as product_image, p.store_id,
                 s.store_name
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          LEFT JOIN stores s ON p.store_id = s.id
          WHERE oi.order_id = ANY($1)`,
        [orderIds])
      : { rows: [] };
    const itemsByOrder = {};
    for (const item of itemsResult.rows) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    }
    
    const historyResult = orderIds.length > 0
      ? await pool.query('SELECT * FROM order_status_history WHERE order_id = ANY($1) ORDER BY created_at ASC', [orderIds])
      : { rows: [] };
    const historyByOrder = {};
    for (const h of historyResult.rows) {
      if (!historyByOrder[h.order_id]) historyByOrder[h.order_id] = [];
      historyByOrder[h.order_id].push(h);
    }
    
    // Assign to orders
    for (const order of result.rows) {
      const items = itemsByOrder[order.id] || [];
      order.items = items;
      order.status_history = historyByOrder[order.id] || [];
      order.order_status = order.status;
      
      // Get store name from first item if not found
      if (!order.store_name && items.length > 0) {
        order.store_name = items[0].store_name || 'My Store';
      }
    }
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM orders WHERE vendor_id = $1';
    const countParams = [vendorId];
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }
    const countResult = await pool.query(countQuery, countParams);
    
    // Get pending count for notifications
    const pendingResult = await pool.query(
      'SELECT COUNT(*) FROM orders WHERE vendor_id = $1 AND status = $2',
      [vendorId, 'pending']
    );
    
    // Get status counts for vendor dashboard stats
    const statusCounts = await pool.query(
      "SELECT status, COUNT(*) as count FROM orders WHERE vendor_id = $1 GROUP BY status",
      [vendorId]
    );
    
    const stats = { 
      pending: 0, confirmed: 0, preparing: 0, 
      out_for_delivery: 0, delivered: 0, cancelled: 0 
    };
    statusCounts.rows.forEach(row => {
      if (stats.hasOwnProperty(row.status)) {
        stats[row.status] = parseInt(row.count);
      }
    });
    
    res.json({ 
      success: true, 
      orders: result.rows,
      total: parseInt(countResult.rows[0].count),
      pendingCount: parseInt(pendingResult.rows[0].count),
      stats: stats,
      page: parseInt(page),
      pages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateVendorOrderStatus = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Define valid status transitions for vendor
    const validStatuses = ['pending', 'confirmed', 'processing', 'preparing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    
    // Only delivered orders can be refunded
    if (status === 'refunded') {
      const isDelivered = await pool.query(
        "SELECT status FROM orders WHERE id = $1",
        [id]
      );
      if (isDelivered.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      if (isDelivered.rows[0].status !== 'delivered') {
        return res.status(400).json({ success: false, error: 'Only delivered orders can be refunded' });
      }
    }
    
    // Convert frontend statuses to DB statuses
    const dbStatus = status === 'shipped' ? 'out_for_delivery' 
                   : status === 'processing' ? 'preparing' 
                   : status;
    
    // Get vendor's store
    const storeResult = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [vendorId]);
    let storeId = null;
    if (storeResult.rows.length > 0) {
      storeId = storeResult.rows[0].id;
    }
    
    // Check order exists and belongs to vendor
    let checkQuery = 'SELECT * FROM orders WHERE id = $1 AND (vendor_id = $2';
    const params = [id, vendorId];
    
    if (storeId) {
      checkQuery += ' OR store_id = $3';
      params.push(storeId);
    }
    checkQuery += ')';
    
    const checkResult = await pool.query(checkQuery, params);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const currentOrder = checkResult.rows[0];
    
    // Validate status transition (allow shipped as alias for out_for_delivery)
    const allowedTransitions = {
      'pending': ['confirmed', 'preparing', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['out_for_delivery', 'shipped', 'cancelled'],
      'out_for_delivery': ['delivered'],
      'shipped': ['delivered'],
      'delivered': ['refunded']
    };
    
    const allowed = allowedTransitions[currentOrder.status] || [];
    if (!allowed.includes(status) && !allowed.includes(dbStatus)) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot change status from '${currentOrder.status}' to '${status}'` 
      });
    }
    
    // Update order status
    let updateQuery = 'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2';
    let updateParams = [dbStatus, id];
    
    if (storeId) {
      updateQuery += ' AND (vendor_id = $3 OR store_id = $3)';
      updateParams.push(vendorId);
    } else {
      updateQuery += ' AND vendor_id = $3';
      updateParams.push(vendorId);
    }
    
    const result = await pool.query(updateQuery + ' RETURNING *', updateParams);
    
    // Auto-mark payment as received when delivered
    if (dbStatus === 'delivered') {
      await pool.query(
        "UPDATE orders SET payment_status = 'paid' WHERE id = $1",
        [id]
      );
      // Fix all existing delivered COD orders that were missed
      await pool.query(
        "UPDATE orders SET payment_status = 'paid' WHERE status = 'delivered' AND payment_method = 'cod' AND payment_status = 'pending'"
      );
    }
    
    // Add status history
    const statusMessages = {
      'confirmed': 'Order confirmed by vendor',
      'preparing': 'Order is being prepared',
      'out_for_delivery': 'Order out for delivery',
      'delivered': 'Order delivered',
      'cancelled': 'Order cancelled by vendor',
      'refunded': 'Order refunded by vendor'
    };
    
    await pool.query(
      'INSERT INTO order_status_history (order_id, status, notes, changed_by) VALUES ($1, $2, $3, $4)',
      [id, status, statusMessages[status] || 'Status updated', vendorId]
    );

    // Auto-refund on cancellation
    if (status === 'cancelled') {
      try {
        const paymentResult = await pool.query(
          `SELECT * FROM payments WHERE order_id = $1 AND payment_status = 'completed' ORDER BY created_at DESC LIMIT 1`,
          [id]
        );

        if (paymentResult.rows.length > 0) {
          const payment = paymentResult.rows[0];

          const refundResult = await stripeService.createRefund({
            paymentIntentId: payment.transaction_id,
            amount: currentOrder.total_amount || payment.amount,
            reason: 'requested_by_customer'
          });

          if (refundResult.success) {
            await pool.query(
              `UPDATE payments SET payment_status = 'refunded', refund_date = NOW() WHERE id = $1`,
              [payment.id]
            );

            await pool.query(
              `UPDATE orders SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1`,
              [id]
            );

            // Insert in-app notification
            await pool.query(
              `INSERT INTO notifications (id, user_id, type, title, message, data)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                uuidv4(),
                currentOrder.customer_id,
                'order_refund',
                'Refund Processed',
                `Your order #${currentOrder.order_number || id.slice(-8)} has been cancelled and refunded.`,
                JSON.stringify({ order_id: id, amount: payment.amount })
              ]
            );

            // Send email notification
            const customer = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [currentOrder.customer_id]);
            if (customer.rows.length > 0) {
              await notificationService.sendEmail({
                to: customer.rows[0].email,
                subject: `Refund Processed - Order #${currentOrder.order_number}`,
                html: `
                  <h2>Order Cancelled & Refunded</h2>
                  <p>Hi ${customer.rows[0].first_name},</p>
                  <p>Your order #${currentOrder.order_number} has been cancelled by the vendor.</p>
                  <p>A refund of <strong>$${payment.amount}</strong> has been initiated and will be credited back to your original payment method within 5-10 business days.</p>
                `
              });
            }
          }
        }
      } catch (refundErr) {
        console.error('Auto-refund error on cancellation:', refundErr.message);
      }
    }

    // Notify customer on refund
    if (status === 'refunded') {
      try {
        const refundPaymentResult = await pool.query(
          `SELECT * FROM payments WHERE order_id = $1 AND payment_status = 'refunded' ORDER BY created_at DESC LIMIT 1`,
          [id]
        );
        const refundAmt = refundPaymentResult.rows.length > 0 ? refundPaymentResult.rows[0].amount : currentOrder.total_amount;

        // In-app notification
        await pool.query(
          `INSERT INTO notifications (id, user_id, type, title, message, data)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            uuidv4(),
            currentOrder.customer_id,
            'order_refund',
            'Refund Completed',
            `Your refund for order #${currentOrder.order_number || id.slice(-8)} has been processed.`,
            JSON.stringify({ order_id: id, amount: refundAmt })
          ]
        );

        // Email notification
        const refundCustomer = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [currentOrder.customer_id]);
        if (refundCustomer.rows.length > 0) {
          await notificationService.sendEmail({
            to: refundCustomer.rows[0].email,
            subject: `Refund Completed - Order #${currentOrder.order_number || id.slice(-8)}`,
            html: `
              <h2>Refund Completed</h2>
              <p>Hi ${refundCustomer.rows[0].first_name},</p>
              <p>Your refund for order #${currentOrder.order_number || id.slice(-8)} has been processed successfully.</p>
              <p>Amount refunded: <strong>$${refundAmt}</strong></p>
              <p>The funds will appear in your original payment method within 5-10 business days.</p>
            `
          });
        }
      } catch (refundNotifyErr) {
        console.error('Refund notification error:', refundNotifyErr.message);
      }
    }
    
    res.json({ success: true, message: 'Order status updated', order: result.rows[0] });
  } catch (error) {
    console.error('Error updating vendor order:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================
// COD PAYMENT — Mark as Received (Vendor)
// ============================================

exports.markVendorPaymentReceived = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;

    const storeResult = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [vendorId]);
    let storeId = null;
    if (storeResult.rows.length > 0) storeId = storeResult.rows[0].id;

    let checkQuery = 'SELECT * FROM orders WHERE id = $1 AND (vendor_id = $2';
    const params = [id, vendorId];
    if (storeId) {
      checkQuery += ' OR store_id = $3';
      params.push(storeId);
    }
    checkQuery += ')';

    const checkResult = await pool.query(checkQuery, params);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = checkResult.rows[0];

    if (order.payment_method !== 'cod') {
      return res.status(400).json({ success: false, error: 'Only COD orders can be marked as payment received' });
    }
    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, error: 'Order must be delivered before marking payment as received' });
    }

    const result = await pool.query(
      `UPDATE orders SET payment_status = 'paid', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    await pool.query(
      'INSERT INTO order_status_history (order_id, status, notes, changed_by) VALUES ($1, $2, $3, $4)',
      [id, 'payment_received', 'Payment collected for COD order', vendorId]
    );

    res.json({ success: true, message: 'Payment marked as received', order: result.rows[0] });
  } catch (error) {
    console.error('Error marking payment received:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================
// ADMIN ORDER MANAGEMENT
// ============================================

exports.getAllOrders = async (req, res) => {
  try {
    const adminId = req.user.id;

    const adminStore = await pool.query(
      'SELECT id FROM stores WHERE owner_id = $1',
      [adminId]
    );

    if (adminStore.rows.length > 0) {
      req.user.storeId = adminStore.rows[0].id;
      return exports.getVendorOrders(req, res);
    }

    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) as total
      FROM orders
    `);

    const revenueResult = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'completed'), 0) as total_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'), 0) as revenue_period
      FROM orders
    `);

    res.json({
      success: true,
      summaryOnly: true,
      message: 'Orders are managed by individual vendors. Admin can view order summaries only.',
      stats: statsResult.rows[0],
      revenue: revenueResult.rows[0],
      orders: []
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { status, delivery_person_id } = req.body;
    
    let updateFields = 'status = $1, updated_at = NOW()';
    const params = [status, id];
    
    if (delivery_person_id) {
      updateFields += ', delivery_person_id = $3';
      params.push(delivery_person_id);
    }
    
    const result = await pool.query(
      `UPDATE orders SET ${updateFields} WHERE id = $2 RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    // Auto-mark payment as received when delivered
    if (status === 'delivered') {
      await pool.query(
        "UPDATE orders SET payment_status = 'paid' WHERE id = $1",
        [id]
      );
      await pool.query(
        "UPDATE orders SET payment_status = 'paid' WHERE status = 'delivered' AND payment_method = 'cod' AND payment_status = 'pending'"
      );
    }
    
    // Add status history
    const notes = {
      'confirmed': 'Order confirmed by admin',
      'preparing': 'Order preparation started',
      'out_for_delivery': 'Assigned for delivery',
      'delivered': 'Order delivered',
      'cancelled': 'Order cancelled by admin'
    };
    
    await pool.query(
      'INSERT INTO order_status_history (order_id, status, notes, updated_by) VALUES ($1, $2, $3, $4)',
      [id, status, notes[status] || 'Status updated by admin', adminId]
    );
    
    res.json({ success: true, message: 'Order status updated', order: result.rows[0] });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateDeliverySettings = async (req, res) => {
  try {
    const { settings } = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO delivery_settings (setting_key, setting_value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = NOW()`,
        [key, String(value)]
      );
    }
    
    res.json({ success: true, message: 'Delivery settings updated successfully' });
  } catch (error) {
    console.error('Error updating delivery settings:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getDeliveryPersons = async (req, res) => {
  try {
    // If called from admin routes, show all. Otherwise show only active.
    const showAll = req.path.includes('/admin') || (req.user && req.user.role === 'admin');
    let query = 'SELECT * FROM delivery_persons';
    if (!showAll) {
      query += ' WHERE is_active = true';
    }
    query += ' ORDER BY name';
    
    const result = await pool.query(query);
    res.json({ success: true, delivery_persons: result.rows });
  } catch (error) {
    console.error('Error fetching delivery persons:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.addDeliveryPerson = async (req, res) => {
  try {
    const { name, phone, email, vehicle_number } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Name and phone are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO delivery_persons (name, phone, email, vehicle_number)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, phone, email, vehicle_number]
    );
    
    res.status(201).json({ success: true, delivery_person: result.rows[0] });
  } catch (error) {
    console.error('Error adding delivery person:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.deleteDeliveryPerson = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE delivery_persons SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Delivery person not found' });
    }
    
    res.json({ success: true, message: 'Delivery person removed' });
  } catch (error) {
    console.error('Error deleting delivery person:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.assignDeliveryPerson = async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_person_id } = req.body;
    
    if (!delivery_person_id) {
      return res.status(400).json({ success: false, error: 'Delivery person ID is required' });
    }
    
    // Get delivery person details
    const dpResult = await pool.query(
      'SELECT * FROM delivery_persons WHERE id = $1 AND is_active = true',
      [delivery_person_id]
    );
    
    if (dpResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Delivery person not found or inactive' });
    }
    
    const deliveryPerson = dpResult.rows[0];
    
    // Update order with delivery person
    const result = await pool.query(
      `UPDATE orders 
       SET delivery_person_id = $1, 
           delivery_person_name = $2,
           delivery_person_phone = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [delivery_person_id, deliveryPerson.name, deliveryPerson.phone, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    // Add status history entry
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, notes, updated_by)
       VALUES ($1, 'out_for_delivery', $2, $3)`,
      [id, `Delivery assigned: ${deliveryPerson.name}`, 'admin']
    );
    
    res.json({ success: true, message: 'Delivery person assigned successfully', order: result.rows[0] });
  } catch (error) {
    console.error('Error assigning delivery person:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================
// ORDER STATS
// ============================================

exports.getOrderStats = async (req, res) => {
  try {
    const stats = {};
    
    // Total orders
    const totalResult = await pool.query('SELECT COUNT(*) FROM orders');
    stats.total_orders = parseInt(totalResult.rows[0].count);
    
    // Orders by status
    const statusResult = await pool.query(
      'SELECT status, COUNT(*) FROM orders GROUP BY status'
    );
    stats.by_status = {};
    statusResult.rows.forEach(row => {
      stats.by_status[row.status] = parseInt(row.count);
    });
    
    // Today's orders
    const todayResult = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE"
    );
    stats.today_orders = parseInt(todayResult.rows[0].count);
    
    // Pending orders count
    const pendingResult = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE status = 'pending'"
    );
    stats.pending_orders = parseInt(pendingResult.rows[0].count);
    
    // Revenue (from delivered + COD orders)
    const revenueResult = await pool.query(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = 'paid' OR (payment_method = 'cod' AND status != 'cancelled')"
    );
    stats.total_revenue = parseFloat(revenueResult.rows[0].total || 0);
    
    // This week orders
    const weekResult = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)"
    );
    stats.week_orders = parseInt(weekResult.rows[0].count);
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
