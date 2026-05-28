const pool = require('./config/database');

async function addImagesColumn() {
  try {
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB');
    console.log('✅ Added images column to products table');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addImagesColumn();