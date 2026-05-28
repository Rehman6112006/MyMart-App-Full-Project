/**
 * Phase 17: Bulk Operations System
 * Migration for Bulk Product/Order Operations tables
 */

const pool = require('./src/config/database');

async function migrate() {
  console.log('🔄 Starting Phase 17: Bulk Operations System migration...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create bulk_import_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bulk_import_history (
        id SERIAL PRIMARY KEY,
        import_type VARCHAR(50) NOT NULL,
        file_name VARCHAR(255),
        total_rows INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        error_log TEXT,
        imported_by INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending',
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ bulk_import_history table created');

    // Create bulk_export_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bulk_export_history (
        id SERIAL PRIMARY KEY,
        export_type VARCHAR(50) NOT NULL,
        file_name VARCHAR(255),
        file_path VARCHAR(500),
        total_rows INTEGER DEFAULT 0,
        exported_by INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending',
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ bulk_export_history table created');

    // Create bulk_operation_queue table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bulk_operation_queue (
        id SERIAL PRIMARY KEY,
        operation_type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_ids INTEGER[],
        parameters JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        priority INTEGER DEFAULT 5,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        error_message TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ bulk_operation_queue table created');

    // Create product_bulk_updates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_bulk_updates (
        id SERIAL PRIMARY KEY,
        update_type VARCHAR(50) NOT NULL,
        update_data JSONB NOT NULL,
        affected_products INTEGER[],
        success_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        error_log TEXT,
        performed_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ product_bulk_updates table created');

    // Create inventory_bulk_updates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_bulk_updates (
        id SERIAL PRIMARY KEY,
        update_type VARCHAR(50) NOT NULL,
        store_id INTEGER REFERENCES stores(id),
        update_data JSONB NOT NULL,
        affected_items INTEGER[],
        success_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        error_log TEXT,
        performed_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ inventory_bulk_updates table created');

    // Create price_bulk_updates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS price_bulk_updates (
        id SERIAL PRIMARY KEY,
        update_rule VARCHAR(50) NOT NULL,
        adjustment_type VARCHAR(20) NOT NULL,
        adjustment_value DECIMAL(10, 2) NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        affected_products INTEGER[],
        success_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        performed_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ price_bulk_updates table created');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bulk_import_status ON bulk_import_history(status);
      CREATE INDEX IF NOT EXISTS idx_bulk_import_user ON bulk_import_history(imported_by);
      CREATE INDEX IF NOT EXISTS idx_bulk_export_status ON bulk_export_history(status);
      CREATE INDEX IF NOT EXISTS idx_bulk_queue_status ON bulk_operation_queue(status);
      CREATE INDEX IF NOT EXISTS idx_bulk_queue_priority ON bulk_operation_queue(priority, created_at);
      CREATE INDEX IF NOT EXISTS idx_product_bulk_updates_type ON product_bulk_updates(update_type);
      CREATE INDEX IF NOT EXISTS idx_inventory_bulk_updates_store ON inventory_bulk_updates(store_id);
      CREATE INDEX IF NOT EXISTS idx_price_bulk_updates_category ON price_bulk_updates(category_id);
    `);
    console.log('✅ Indexes created');

    await client.query('COMMIT');
    console.log('✅ Phase 17 migration completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
