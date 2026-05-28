const pool = require('./config/database');

async function fixColumns() {
  try {
    await pool.query('ALTER TABLE products ALTER COLUMN image_url TYPE TEXT');
    await pool.query('ALTER TABLE products ALTER COLUMN thumbnail TYPE TEXT');
    console.log('✅ Fixed image columns');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixColumns();