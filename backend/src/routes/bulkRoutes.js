// ==================== BULK OPERATIONS ROUTES ====================
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const bulkController = require('../controllers/bulkController');

// Products Bulk Operations
router.post('/import/products', auth, bulkController.importProducts);
router.put('/products', auth, bulkController.updateProductsBulk);
router.delete('/products', auth, bulkController.deleteProductsBulk);
router.put('/inventory', auth, bulkController.updateInventoryBulk);

// Export
router.get('/export/products', auth, bulkController.exportProducts);
router.get('/export/orders', auth, bulkController.exportOrders);

// Jobs Status
router.get('/import-jobs', auth, bulkController.getImportJobs);
router.get('/export-jobs', auth, bulkController.getExportJobs);

// Templates
router.get('/template/products', auth, bulkController.getProductsTemplate);

module.exports = router;
