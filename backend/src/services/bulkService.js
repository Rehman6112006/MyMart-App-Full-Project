// ==================== BULK OPERATIONS SERVICE ====================

const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');

exports.createImportJob = async (vendorId, storeId, jobType, fileName) => {
  try {
    const result = await pool.query(
      `INSERT INTO bulk_import_jobs (vendor_id, store_id, job_type, file_name, status)
       VALUES ($1, $2, $3, $4, 'processing') RETURNING *`,
      [vendorId, storeId, jobType, fileName]
    );
    return { success: true, job: result.rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.processProductsImport = async (jobId, vendorId, csvData) => {
  const errors = [];
  let successCount = 0;
  let failCount = 0;

  try {
    const records = await parseCSV(csvData);

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + 2;

      try {
        const productData = {
          vendor_id: vendorId,
          store_id: row.store_id || null,
          name: row.name || row.product_name,
          description: row.description || '',
          price: parseFloat(row.price) || 0,
          compare_at_price: parseFloat(row.compare_at_price) || null,
          cost_price: parseFloat(row.cost_price) || null,
          sku: row.sku,
          barcode: row.barcode,
          inventory: parseInt(row.inventory) || 0,
          category_name: row.category || row.category_name,
          tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
          status: row.status === 'active' ? 'active' : 'draft',
          images: row.images ? row.images.split(',').map(img => img.trim()) : []
        };

        if (!productData.name) {
          throw new Error('Product name is required');
        }

        // Get or create category
        let categoryId = null;
        if (productData.category_name) {
          const catResult = await pool.query(
            `INSERT INTO categories (name, slug, description)
             VALUES ($1, $2, $3) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [
              productData.category_name,
              productData.category_name.toLowerCase().replace(/\s+/g, '-'),
              productData.category_name
            ]
          );
          categoryId = catResult.rows[0].id;
        }

        // Insert product
        await pool.query(
          `INSERT INTO products (vendor_id, store_id, name, description, price, compare_at_price, 
                                cost_price, sku, barcode, inventory, category_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            productData.vendor_id, productData.store_id, productData.name,
            productData.description, productData.price, productData.compare_at_price,
            productData.cost_price, productData.sku, productData.barcode,
            productData.inventory, categoryId, productData.status
          ]
        );

        // Add tags
        if (productData.tags.length > 0 && categoryId) {
          for (const tag of productData.tags) {
            await pool.query(
              `INSERT INTO product_tags (product_id, tag) 
               SELECT p.id, $2 FROM products p WHERE p.vendor_id = $1 AND p.name = $3
               ON CONFLICT DO NOTHING`,
              [vendorId, tag, productData.name]
            );
          }
        }

        successCount++;
      } catch (rowError) {
        failCount++;
        errors.push({
          row: rowNumber,
          data: row,
          error: rowError.message
        });
      }

      // Update progress
      await pool.query(
        `UPDATE bulk_import_jobs SET processed_rows = $1, success_rows = $2, failed_rows = $3, errors = $4
         WHERE id = $5`,
        [i + 1, successCount, failCount, JSON.stringify(errors), jobId]
      );
    }

    await pool.query(
      `UPDATE bulk_import_jobs SET status = 'completed', processed_rows = $1, 
       success_rows = $2, failed_rows = $3, completed_at = NOW()
       WHERE id = $4`,
      [records.length, successCount, failCount, jobId]
    );

    return {
      success: true,
      total: records.length,
      success: successCount,
      failed: failCount,
      errors
    };
  } catch (error) {
    await pool.query(
      `UPDATE bulk_import_jobs SET status = 'failed', errors = $1 WHERE id = $2`,
      [JSON.stringify([{ error: error.message }]), jobId]
    );
    return { success: false, error: error.message };
  }
};

exports.updateProductsBulk = async (vendorId, updates) => {
  const results = { success: 0, failed: 0, errors: [] };

  try {
    for (const update of updates) {
      try {
        const { product_id, ...fields } = update;

        if (!product_id) {
          throw new Error('Product ID required');
        }

        // Verify ownership
        const product = await pool.query(
          'SELECT id FROM products WHERE id = $1 AND vendor_id = $2',
          [product_id, vendorId]
        );

        if (product.rows.length === 0) {
          throw new Error('Product not found or not owned by vendor');
        }

        const allowedFields = ['name', 'description', 'price', 'compare_at_price', 
                               'cost_price', 'inventory', 'status', 'sku', 'barcode'];
        
        const setClauses = [];
        const values = [];
        let idx = 1;

        for (const [key, value] of Object.entries(fields)) {
          if (allowedFields.includes(key) && value !== undefined) {
            setClauses.push(`${key} = $${idx}`);
            values.push(value);
            idx++;
          }
        }

        if (setClauses.length > 0) {
          values.push(product_id);
          await pool.query(
            `UPDATE products SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
            values
          );
        }

        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push({ id: update.product_id, error: e.message });
      }
    }

    return results;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.deleteProductsBulk = async (vendorId, productIds) => {
  const results = { success: 0, failed: 0, errors: [] };

  try {
    for (const productId of productIds) {
      try {
        const result = await pool.query(
          `DELETE FROM products WHERE id = $1 AND vendor_id = $2 RETURNING id`,
          [productId, vendorId]
        );

        if (result.rowCount > 0) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({ id: productId, error: 'Product not found' });
        }
      } catch (e) {
        results.failed++;
        results.errors.push({ id: productId, error: e.message });
      }
    }

    return results;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.createExportJob = async (vendorId, storeId, jobType, filters) => {
  try {
    const result = await pool.query(
      `INSERT INTO bulk_export_jobs (vendor_id, store_id, job_type, filters, status)
       VALUES ($1, $2, $3, $4, 'processing') RETURNING *`,
      [vendorId, storeId, jobType, JSON.stringify(filters || {})]
    );
    return { success: true, job: result.rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.exportProducts = async (vendorId, filters = {}) => {
  try {
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.store_id IN (SELECT id FROM stores WHERE owner_id = $1)
    `;
    const params = [vendorId];
    let idx = 2;

    if (filters.store_id) {
      query += ` AND p.store_id = $${idx}`;
      params.push(filters.store_id);
      idx++;
    }

    if (filters.status) {
      query += ` AND p.is_active = $${idx}`;
      params.push(filters.status === 'active');
      idx++;
    }

    if (filters.category_id) {
      query += ` AND p.category_id = $${idx}`;
      params.push(filters.category_id);
      idx++;
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);

    const csvData = result.rows.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.base_price,
      compare_at_price: p.discount_price || '',
      sku: p.sku || '',
      inventory: p.stock_quantity,
      category: p.category_name || '',
      status: p.is_active ? 'active' : 'draft',
      created_at: p.created_at
    }));

    return { success: true, data: csvData, count: csvData.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.exportOrders = async (vendorId, filters = {}) => {
  try {
    let query = `
      SELECT o.*, u.first_name, u.last_name, u.email
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      WHERE o.customer_id = $1 OR o.id IN (
        SELECT order_id FROM order_items WHERE store_id IN (
          SELECT id FROM stores WHERE owner_id = $1
        )
      )
    `;
    const params = [vendorId];
    let idx = 2;

    if (filters.status) {
      query += ` AND o.order_status = $${idx}`;
      params.push(filters.status);
      idx++;
    }

    if (filters.date_from) {
      query += ` AND o.created_at >= $${idx}`;
      params.push(filters.date_from);
      idx++;
    }

    if (filters.date_to) {
      query += ` AND o.created_at <= $${idx}`;
      params.push(filters.date_to);
      idx++;
    }

    query += ' ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);

    const csvData = result.rows.map(o => ({
      order_id: o.id,
      order_number: o.order_number,
      customer: `${o.first_name || ''} ${o.last_name || ''}`.trim(),
      email: o.email || '',
      total: o.total_amount,
      status: o.order_status,
      payment_status: o.payment_status,
      created_at: o.created_at
    }));

    return { success: true, data: csvData, count: csvData.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.getImportJobs = async (vendorId, limit = 20) => {
  try {
    const result = await pool.query(
      `SELECT * FROM bulk_import_jobs WHERE vendor_id = $1 
       ORDER BY created_at DESC LIMIT $2`,
      [vendorId, limit]
    );
    return { success: true, jobs: result.rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.getExportJobs = async (vendorId, limit = 20) => {
  try {
    const result = await pool.query(
      `SELECT * FROM bulk_export_jobs WHERE vendor_id = $1 
       ORDER BY created_at DESC LIMIT $2`,
      [vendorId, limit]
    );
    return { success: true, jobs: result.rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.updateInventoryBulk = async (vendorId, inventoryUpdates) => {
  const results = { success: 0, failed: 0, errors: [] };

  try {
    for (const update of inventoryUpdates) {
      try {
        const { product_id, adjustment, set_value } = update;

        if (!product_id) {
          throw new Error('Product ID required');
        }

        let newInventory;
        if (set_value !== undefined) {
          newInventory = set_value;
        } else if (adjustment !== undefined) {
          const current = await pool.query(
            'SELECT inventory FROM products WHERE id = $1 AND vendor_id = $2',
            [product_id, vendorId]
          );
          if (current.rows.length === 0) {
            throw new Error('Product not found');
          }
          newInventory = Math.max(0, current.rows[0].inventory + adjustment);
        } else {
          throw new Error('Either adjustment or set_value required');
        }

        await pool.query(
          'UPDATE products SET inventory = $1, updated_at = NOW() WHERE id = $2',
          [newInventory, product_id]
        );

        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push({ id: update.product_id, error: e.message });
      }
    }

    return results;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper function to parse CSV
function parseCSV(csvData) {
  return new Promise((resolve, reject) => {
    const records = [];
    const parser = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    parser.on('error', reject);
    parser.on('end', () => resolve(records));
  });
}

// Helper function to convert to CSV
exports.convertToCSV = (data) => {
  return new Promise((resolve, reject) => {
    stringify(data, { header: true }, (err, output) => {
      if (err) reject(err);
      else resolve(output);
    });
  });
};

console.log('✅ Bulk Service Loaded');
