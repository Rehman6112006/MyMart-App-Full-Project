const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

pool.on('connect', () => {
  console.log('📦 New database connection established');
});

const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully!');
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
};

testConnection();

module.exports = pool;
