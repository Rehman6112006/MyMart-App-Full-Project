// Create user_saved_cards table for Stripe saved cards

require('dotenv').config({ path: './.env' });
const pool = require('./src/config/database');

async function createTable() {
  try {
    // Create user_saved_cards table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_saved_cards (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        stripe_customer_id VARCHAR(255),
        stripe_payment_id VARCHAR(255) NOT NULL,
        card_last4 VARCHAR(4) NOT NULL,
        card_brand VARCHAR(50) NOT NULL DEFAULT 'unknown',
        expiry_month INTEGER,
        expiry_year INTEGER,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ user_saved_cards table created successfully!');

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_saved_cards_user_id 
      ON user_saved_cards(user_id)
    `);
    console.log('✅ Index created successfully!');

    // Show existing cards
    const cards = await pool.query('SELECT * FROM user_saved_cards LIMIT 10');
    console.log(`📋 Current saved cards: ${cards.rows.length}`);
    
    if (cards.rows.length > 0) {
      console.log('Cards:', JSON.stringify(cards.rows, null, 2));
    }

    await pool.end();
    console.log('✅ Done!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

createTable();
