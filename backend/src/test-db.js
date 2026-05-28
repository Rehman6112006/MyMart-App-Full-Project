require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('./config/database');

async function test() {
  try {
    console.log('Testing full products query...');
    const result = await pool.query(`
      SELECT p.id, p.name, p.base_price, p.discount_price, p.discount_percentage,
             p.stock_quantity, p.thumbnail, p.brand, p.condition,
             s.store_name, s.id as store_id,
             c.name as category_name
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    console.log('Success:', result.rows);
    
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
}

test();
