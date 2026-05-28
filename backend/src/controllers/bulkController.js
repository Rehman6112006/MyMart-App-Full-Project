// ==================== BULK OPERATIONS CONTROLLER ====================

const bulkService = require('../services/bulkService');
const pool = require('../config/database');

exports.importProducts = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { storeId, csvData } = req.body;

    if (!csvData) {
      return res.status(400).json({ success: false, error: 'CSV data required' });
    }

    const jobResult = await bulkService.createImportJob(vendorId, storeId, 'products', 'products.csv');
    if (!jobResult.success) {
      return res.status(400).json({ success: false, error: jobResult.error });
    }

    const result = await bulkService.processProductsImport(jobResult.job.id, vendorId, csvData);

    res.json({
      success: true,
      job: jobResult.job,
      results: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateProductsBulk = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'Updates array required' });
    }

    const result = await bulkService.updateProductsBulk(vendorId, updates);

    res.json({
      success: true,
      results: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.deleteProductsBulk = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ success: false, error: 'Product IDs array required' });
    }

    const result = await bulkService.deleteProductsBulk(vendorId, productIds);

    res.json({
      success: true,
      results: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateInventoryBulk = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { inventoryUpdates } = req.body;

    if (!inventoryUpdates || !Array.isArray(inventoryUpdates)) {
      return res.status(400).json({ success: false, error: 'Inventory updates array required' });
    }

    const result = await bulkService.updateInventoryBulk(vendorId, inventoryUpdates);

    res.json({
      success: true,
      results: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.exportProducts = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { storeId, status, categoryId } = req.query;

    const filters = {};
    if (storeId) filters.store_id = storeId;
    if (status) filters.status = status;
    if (categoryId) filters.category_id = categoryId;

    const jobResult = await bulkService.createExportJob(vendorId, storeId, 'products', filters);
    if (!jobResult.success) {
      return res.status(400).json({ success: false, error: jobResult.error });
    }

    const result = await bulkService.exportProducts(vendorId, filters);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    const csv = await bulkService.convertToCSV(result.data);

    res.json({
      success: true,
      data: csv,
      count: result.count,
      filename: `products_export_${Date.now()}.csv`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.exportOrders = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { status, dateFrom, dateTo } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;

    const result = await bulkService.exportOrders(vendorId, filters);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    const csv = await bulkService.convertToCSV(result.data);

    res.json({
      success: true,
      data: csv,
      count: result.count,
      filename: `orders_export_${Date.now()}.csv`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getImportJobs = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { limit } = req.query;

    const result = await bulkService.getImportJobs(vendorId, parseInt(limit) || 20);

    res.json({
      success: true,
      jobs: result.jobs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getExportJobs = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { limit } = req.query;

    const result = await bulkService.getExportJobs(vendorId, parseInt(limit) || 20);

    res.json({
      success: true,
      jobs: result.jobs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// CSV Template for Products Import
exports.getProductsTemplate = async (req, res) => {
  try {
    const template = [
      {
        name: 'Example Product',
        description: 'Product description',
        price: '29.99',
        compare_at_price: '39.99',
        cost_price: '15.00',
        sku: 'PROD-001',
        barcode: '123456789012',
        inventory: '100',
        category: 'Electronics',
        tags: 'sale,featured',
        status: 'active'
      }
    ];

    const csv = await bulkService.convertToCSV(template);

    res.json({
      success: true,
      data: csv,
      filename: 'products_template.csv'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

console.log('✅ Bulk Controller Loaded');
