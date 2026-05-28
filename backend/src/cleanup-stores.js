// Script to delete mymartofficial store and its products
const pool = require('./src/config/database');

async function cleanupStores() {
  try {
    // Find the store
    const storeResult = await pool.query(
      "SELECT id, store_name FROM stores WHERE store_name ILIKE '%mymart%official%' OR store_name ILIKE '%official%'"
    );
    
    console.log('Found stores:', storeResult.rows);
    
    for (const store of storeResult.rows) {
      console.log(`Deleting store: ${store.store_name} (${store.id})`);
      
      // Delete products
      await pool.query('DELETE FROM products WHERE store_id = $1', [store.id]);
      console.log('Products deleted');
      
      // Delete store
      await pool.query('DELETE FROM stores WHERE id = $1', [store.id]);
      console.log('Store deleted');
    }
    
    console.log('Cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupStores();