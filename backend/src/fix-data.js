require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('./config/database');

async function fix() {
  try {
    console.log('Activating stores...');
    await pool.query("UPDATE stores SET is_active = true WHERE is_active IS NULL OR is_active = false");
    
    console.log('Checking stores status...');
    const result = await pool.query('SELECT id, store_name, is_active FROM stores');
    console.log(result.rows);
    
    console.log('\nDone!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

fix();
