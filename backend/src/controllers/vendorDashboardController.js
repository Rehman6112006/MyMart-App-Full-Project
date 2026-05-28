// ==================== VENDOR DASHBOARD CONTROLLER - PHASE 9 ====================
const pool = require('../config/database');

// ==================== DASHBOARD OVERVIEW ====================

// Get Dashboard Overview
exports.getDashboard = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { period = '30' } = req.query; // days

    // Ensure order_items has store_id column
    await pool.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS store_id UUID`);

    // Get store ID
    const store = await pool.query('SELECT id, is_verified FROM stores WHERE owner_id = $1', [vendorId]);
    if (store.rows.length === 0) {
      return res.status(200).json({ 
        success: true, 
        needsStore: true,
        message: 'Please create your store first.'
      });
    }
    
    const storeData = store.rows[0];
    if (!storeData.is_verified) {
      return res.status(200).json({ 
        success: true, 
        storePending: true,
        message: 'Your store is pending admin approval.'
      });
    }
    
    const storeId = storeData.id;

    // Get date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Order statistics - use products table to filter by store
    const orderStats = await pool.query(
      `SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue,
        COUNT(DISTINCT CASE WHEN COALESCE(o.order_status, o.status) = 'delivered' THEN o.id END) as completed_orders,
        COUNT(DISTINCT CASE WHEN COALESCE(o.order_status, o.status) = 'pending' THEN o.id END) as pending_orders,
        COUNT(DISTINCT CASE WHEN COALESCE(o.order_status, o.status) = 'processing' THEN o.id END) as processing_orders,
        COUNT(DISTINCT CASE WHEN COALESCE(o.order_status, o.status) = 'cancelled' THEN o.id END) as cancelled_orders,
        COUNT(DISTINCT o.customer_id) as unique_customers,
        AVG(oi.quantity * oi.unit_price) as avg_order_value
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.store_id = $1 AND o.created_at >= $2`,
      [storeId, startDate.toISOString()]
    );

    // Product statistics
    const productStats = await pool.query(
      `SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN p.stock_quantity > 0 THEN 1 END) as in_stock,
        COUNT(CASE WHEN p.stock_quantity = 0 THEN 1 END) as out_of_stock,
        COALESCE(AVG(p.average_rating), 0) as avg_rating
       FROM products p
       WHERE p.store_id = $1`,
      [storeId]
    );

    // Recent orders - use products table to filter by store
    const recentOrders = await pool.query(
      `SELECT o.id, o.order_number, o.total_amount, COALESCE(o.order_status, o.status) as order_status, o.created_at,
              u.first_name, u.last_name
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       JOIN users u ON o.customer_id = u.id
       WHERE p.store_id = $1
       GROUP BY o.id, u.first_name, u.last_name
       ORDER BY o.created_at DESC
       LIMIT 5`,
      [storeId]
    );

    // Low stock products
    const lowStock = await pool.query(
      `SELECT id, name, stock_quantity, base_price
       FROM products
       WHERE store_id = $1 AND stock_quantity < 10
       ORDER BY stock_quantity ASC
       LIMIT 5`,
      [storeId]
    );

    // Get previous period stats for comparison
    const prevStart = new Date(startDate);
    prevStart.setDate(prevStart.getDate() - parseInt(period));
    
    const prevStats = await pool.query(
      `SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.store_id = $1 AND o.created_at >= $2 AND o.created_at < $3`,
      [storeId, prevStart.toISOString(), startDate.toISOString()]
    );

    const current = orderStats.rows[0];
    const previous = prevStats.rows[0];

    // Calculate growth percentages
    const orderGrowth = previous.total_orders > 0 
      ? ((current.total_orders - previous.total_orders) / previous.total_orders * 100).toFixed(1)
      : 0;
    const revenueGrowth = previous.total_revenue > 0
      ? ((current.total_revenue - previous.total_revenue) / previous.total_revenue * 100).toFixed(1)
      : 0;

    // Pending payments (COD orders)
    const pendingPaymentsResult = await pool.query(
      `SELECT 
        COUNT(*)::int as count,
        COALESCE(SUM(o.total_amount), 0) as total_amount
       FROM orders o
       WHERE o.store_id = $1 AND o.payment_method = 'cod' AND COALESCE(o.order_status, o.status) != 'cancelled'`,
      [storeId]
    );

    res.json({
      success: true,
      period: `${period} days`,
      summary: {
        orders: {
          total: parseInt(current.total_orders) || 0,
          completed: parseInt(current.completed_orders) || 0,
          pending: parseInt(current.pending_orders) || 0,
          processing: parseInt(current.processing_orders) || 0,
          cancelled: parseInt(current.cancelled_orders) || 0,
          growth: parseFloat(orderGrowth) || 0
        },
        revenue: {
          total: parseFloat(current.total_revenue) || 0,
          avgOrderValue: parseFloat(current.avg_order_value || 0),
          growth: parseFloat(revenueGrowth) || 0
        },
        customers: {
          unique: parseInt(current.unique_customers) || 0,
          new: parseInt(current.unique_customers) || 0
        },
        products: {
          total: parseInt(productStats.rows[0].total_products) || 0,
          inStock: parseInt(productStats.rows[0].in_stock) || 0,
          outOfStock: parseInt(productStats.rows[0].out_of_stock) || 0,
          avgRating: parseFloat(productStats.rows[0].avg_rating) || 0
        }
      },
      pendingPayments: {
        count: pendingPaymentsResult.rows[0].count,
        totalAmount: parseFloat(pendingPaymentsResult.rows[0].total_amount)
      },
      recentOrders: recentOrders.rows,
      lowStockAlerts: lowStock.rows
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== SALES REPORTS ====================

// Get Sales Report
exports.getSalesReport = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const store = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [vendorId]);
    if (store.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found!' });
    }
    const storeId = store.rows[0].id;

    // Date filter
    let dateFilter = '';
    const params = [storeId];

    if (startDate && endDate) {
      params.push(startDate, endDate);
      dateFilter = `AND o.created_at >= $2 AND o.created_at <= $3`;
    }

    // Group by interval
    let dateGroup;
    if (groupBy === 'month') dateGroup = "TO_CHAR(o.created_at, 'YYYY-MM')";
    else if (groupBy === 'week') dateGroup = "DATE_TRUNC('week', o.created_at)::date";
    else dateGroup = "DATE(o.created_at)";

    const salesData = await pool.query(
      `SELECT 
        ${dateGroup} as date,
        COUNT(DISTINCT o.id) as orders,
        SUM(oi.quantity) as items_sold,
        SUM(oi.quantity * oi.unit_price) as revenue,
        COUNT(DISTINCT o.customer_id) as customers
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.store_id = $1 ${dateFilter}
       GROUP BY ${dateGroup}
       ORDER BY date ASC`,
      params
    );

    // Summary stats
    const summary = await pool.query(
      `SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        SUM(oi.quantity) as total_items,
        SUM(oi.quantity * oi.unit_price) as total_revenue,
        AVG(oi.quantity * oi.unit_price) as avg_order_value,
        COUNT(DISTINCT o.customer_id) as total_customers
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.store_id = $1 ${dateFilter}`,
      params
    );

    res.json({
      success: true,
      groupBy,
      salesData: salesData.rows,
      summary: {
        totalOrders: parseInt(summary.rows[0].total_orders),
        totalItems: parseInt(summary.rows[0].total_items),
        totalRevenue: parseFloat(summary.rows[0].total_revenue || 0),
        avgOrderValue: parseFloat(summary.rows[0].avg_order_value || 0),
        totalCustomers: parseInt(summary.rows[0].total_customers)
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== PRODUCT PERFORMANCE ====================

// Get Product Performance Report
exports.getProductPerformance = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { sortBy = 'revenue', limit = 20, period = '30' } = req.query;

    const store = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [vendorId]);
    if (store.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found!' });
    }
    const storeId = store.rows[0].id;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Validate sortBy against whitelist to prevent SQL injection
    const allowedSortColumns = ['units_sold', 'revenue'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'revenue';

    const result = await pool.query(
      `SELECT 
        p.id, p.name, p.base_price, p.stock_quantity, p.average_rating,
        COUNT(DISTINCT oi.order_id) as order_count,
        SUM(oi.quantity) as units_sold,
        SUM(oi.quantity * oi.unit_price) as revenue,
        COUNT(DISTINCT o.customer_id) as unique_buyers
       FROM products p
       LEFT JOIN order_items oi ON p.id = oi.product_id
       LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= $2
       WHERE p.store_id = $1
       GROUP BY p.id, p.name, p.base_price, p.stock_quantity, p.average_rating
       ORDER BY ${sortColumn} DESC
       LIMIT $3`,
      [storeId, startDate.toISOString(), parseInt(limit)]
    );

    res.json({
      success: true,
      period: `${period} days`,
      sortBy,
      products: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== ORDER REPORTS ====================

// Get Order Report
exports.getOrderReport = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const store = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [vendorId]);
    if (store.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found!' });
    }
    const storeId = store.rows[0].id;

    let query = `
      SELECT o.id, o.order_number, o.total_amount, o.order_status, o.payment_status,
             o.created_at, o.updated_at,
             u.first_name, u.last_name, u.email,
             COUNT(oi.id) as items_count,
             SUM(oi.quantity * oi.unit_price) as items_total
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.customer_id = u.id
      WHERE p.store_id = $1
    `;

    const params = [storeId];

    if (status) {
      params.push(status);
      query += ` AND o.order_status = $${params.length}`;
    }

    if (startDate && endDate) {
      params.push(startDate, endDate);
      query += ` AND o.created_at >= $${params.length - 1} AND o.created_at <= $${params.length}`;
    }

    query += ` GROUP BY o.id, u.first_name, u.last_name, u.email ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get totals
    const totalsParams = [storeId];
    let totalsQuery = `SELECT COUNT(DISTINCT o.id) as total, SUM(oi.quantity * oi.unit_price) as revenue FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE p.store_id = $1`;
    if (status) {
      totalsParams.push(status);
      totalsQuery += ` AND o.order_status = $${totalsParams.length}`;
    }
    const totals = await pool.query(totalsQuery, totalsParams);

    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totals.rows[0].total)
      },
      statusBreakdown: {
        total: parseInt(totals.rows[0].total),
        revenue: parseFloat(totals.rows[0].revenue || 0)
      },
      orders: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== CUSTOMER INSIGHTS ====================

// Get Customer Insights
exports.getCustomerInsights = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { limit = 10 } = req.query;

    const store = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [vendorId]);
    if (store.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found!' });
    }
    const storeId = store.rows[0].id;

    // Top customers by revenue
    const topCustomers = await pool.query(
      `SELECT 
        u.id, u.first_name, u.last_name, u.email,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity * oi.unit_price) as total_spent,
        AVG(oi.quantity * oi.unit_price) as avg_order_value,
        MAX(o.created_at) as last_order_date
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       JOIN users u ON o.customer_id = u.id
       WHERE p.store_id = $1
       GROUP BY u.id, u.first_name, u.last_name, u.email
       ORDER BY total_spent DESC
       LIMIT $2`,
      [storeId, parseInt(limit)]
    );

    // Customer retention stats
    const retention = await pool.query(
      `WITH customer_orders AS (
        SELECT 
          o.customer_id,
          COUNT(DISTINCT o.id) as order_count,
          SUM(oi.quantity * oi.unit_price) as total_spent
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE p.store_id = $1
        GROUP BY o.customer_id
      )
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN order_count = 1 THEN 1 END) as one_time,
        COUNT(CASE WHEN order_count = 2 THEN 1 END) as returning,
        COUNT(CASE WHEN order_count > 2 THEN 1 END) as loyal,
        AVG(total_spent) as avg_lifetime_value
      FROM customer_orders`,
      [storeId]
    );

    // Geographic distribution
    const geography = await pool.query(
      `SELECT 
        COALESCE(u.state, 'Unknown') as state,
        COUNT(DISTINCT o.customer_id) as customers,
        COUNT(DISTINCT o.id) as orders,
        SUM(oi.quantity * oi.unit_price) as revenue
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       JOIN users u ON o.customer_id = u.id
       WHERE p.store_id = $1
       GROUP BY u.state
       ORDER BY revenue DESC
       LIMIT 10`,
      [storeId]
    );

    res.json({
      success: true,
      topCustomers: topCustomers.rows,
      retention: {
        totalCustomers: parseInt(retention.rows[0].total_customers),
        oneTime: parseInt(retention.rows[0].one_time),
        returning: parseInt(retention.rows[0].returning),
        loyal: parseInt(retention.rows[0].loyal),
        avgLifetimeValue: parseFloat(retention.rows[0].avg_lifetime_value || 0)
      },
      geography: geography.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== REVENUE BREAKDOWN ====================

// Get Revenue Breakdown
exports.getRevenueBreakdown = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { period = '30' } = req.query;

    const store = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [vendorId]);
    if (store.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found!' });
    }
    const storeId = store.rows[0].id;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Revenue by category
    const byCategory = await pool.query(
      `SELECT 
        c.name as category,
        SUM(oi.quantity * oi.unit_price) as revenue,
        SUM(oi.quantity) as units_sold,
        COUNT(DISTINCT o.id) as orders
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       WHERE p.store_id = $1 AND o.created_at >= $2
       GROUP BY c.id, c.name
       ORDER BY revenue DESC`,
      [storeId, startDate.toISOString()]
    );

    // Revenue by payment method
    const byPayment = await pool.query(
      `SELECT 
        o.payment_method,
        COUNT(DISTINCT o.id) as orders,
        SUM(oi.quantity * oi.unit_price) as revenue
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.store_id = $1 AND o.created_at >= $2
       GROUP BY o.payment_method
       ORDER BY revenue DESC`,
      [storeId, startDate.toISOString()]
    );

    // Top selling products
    const topProducts = await pool.query(
      `SELECT 
        p.name,
        p.base_price,
        SUM(oi.quantity) as units_sold,
        SUM(oi.quantity * oi.unit_price) as revenue,
        COUNT(DISTINCT o.id) as orders
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.store_id = $1 AND o.created_at >= $2
       GROUP BY p.id, p.name, p.base_price
       ORDER BY revenue DESC
       LIMIT 10`,
      [storeId, startDate.toISOString()]
    );

    const totalRevenue = byCategory.rows.reduce((sum, r) => sum + parseFloat(r.revenue), 0);

    res.json({
      success: true,
      period: `${period} days`,
      totalRevenue,
      byCategory: byCategory.rows.map(r => ({
        ...r,
        revenue: parseFloat(r.revenue),
        percentage: totalRevenue > 0 ? ((parseFloat(r.revenue) / totalRevenue) * 100).toFixed(1) : 0
      })),
      byPayment: byPayment.rows.map(r => ({
        ...r,
        revenue: parseFloat(r.revenue)
      })),
      topProducts: topProducts.rows.map(r => ({
        ...r,
        revenue: parseFloat(r.revenue)
      }))
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== EXPORT REPORTS ====================

// Export Sales Report (CSV format)
exports.exportSalesReport = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { startDate, endDate } = req.query;

    const store = await pool.query('SELECT id, store_name FROM stores WHERE owner_id = $1', [vendorId]);
    if (store.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found!' });
    }
    const storeId = store.rows[0].id;

    let dateFilter = '';
    const params = [storeId];

    if (startDate && endDate) {
      params.push(startDate, endDate);
      dateFilter = `AND o.created_at >= $2 AND o.created_at <= $3`;
    }

    const data = await pool.query(
      `SELECT 
        o.order_number,
        o.created_at,
        o.order_status,
        o.payment_status,
        u.first_name || ' ' || u.last_name as customer,
        u.email,
        p.name as product,
        oi.quantity,
        oi.unit_price,
        (oi.quantity * oi.unit_price) as item_total
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       JOIN users u ON o.customer_id = u.id
       WHERE p.store_id = $1 ${dateFilter}
       ORDER BY o.created_at DESC`,
      params
    );

    // Generate CSV
    const headers = ['Order #', 'Date', 'Status', 'Payment', 'Customer', 'Email', 'Product', 'Qty', 'Price', 'Total'];
    const rows = data.rows.map(r => [
      r.order_number,
      new Date(r.created_at).toISOString().split('T')[0],
      r.order_status,
      r.payment_status,
      r.customer,
      r.email,
      r.product,
      r.quantity,
      r.unit_price,
      r.item_total
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${store.rows[0].store_name}.csv`);
    res.send(csv);

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ==================== COMPARISON REPORT ====================

// Get Comparison Report
exports.getComparisonReport = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { period1 = '30', period2 = '60' } = req.query;

    const store = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [vendorId]);
    if (store.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Store not found!' });
    }
    const storeId = store.rows[0].id;

    const now = new Date();
    const p1Start = new Date(now.getTime() - parseInt(period1) * 24 * 60 * 60 * 1000);
    const p2Start = new Date(now.getTime() - parseInt(period2) * 24 * 60 * 60 * 1000);
    const p2End = p1Start;

    // Period 1 stats
    const period1Stats = await pool.query(
      `SELECT 
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue,
        COUNT(DISTINCT o.customer_id) as customers
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.store_id = $1 AND o.created_at >= $2`,
      [storeId, p1Start.toISOString()]
    );

    // Period 2 stats
    const period2Stats = await pool.query(
      `SELECT 
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue,
        COUNT(DISTINCT o.customer_id) as customers
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.store_id = $1 AND o.created_at >= $2 AND o.created_at < $3`,
      [storeId, p2Start.toISOString(), p2End.toISOString()]
    );

    const p1 = period1Stats.rows[0];
    const p2 = period2Stats.rows[0];

    const calculateChange = (current, previous) => {
      if (previous == 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    res.json({
      success: true,
      comparison: {
        period1: {
          label: `Last ${period1} days`,
          orders: parseInt(p1.orders),
          revenue: parseFloat(p1.revenue),
          customers: parseInt(p1.customers)
        },
        period2: {
          label: `Previous ${parseInt(period2) - parseInt(period1)} days`,
          orders: parseInt(p2.orders),
          revenue: parseFloat(p2.revenue),
          customers: parseInt(p2.customers)
        },
        change: {
          orders: parseFloat(calculateChange(p1.orders, p2.orders)),
          revenue: parseFloat(calculateChange(p1.revenue, p2.revenue)),
          customers: parseFloat(calculateChange(p1.customers, p2.customers))
        }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
