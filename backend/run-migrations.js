/**
 * MyMart SQL Migration Runner
 * Reads and executes SQL files from the migrations folder
 * Run: node run-migrations.js
 */
require('dotenv').config();
const pool = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  console.log('🚀 MyMart SQL Migration Runner\n');
  console.log('=' .repeat(50));
  
  try {
    // Read all SQL files from migrations folder
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${files.length} migration files:\n`);
    
    for (const file of files) {
      console.log(`📄 Running: ${file}`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await pool.query(sql);
        console.log(`  ✅ ${file} - SUCCESS\n`);
      } catch (error) {
        // Some errors are expected (like IF NOT EXISTS)
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key')) {
          console.log(`  ⚠️  ${file} - Already applied (skipped)\n`);
        } else {
          console.log(`  ❌ ${file} - ERROR: ${error.message}\n`);
        }
      }
    }
    
    console.log('=' .repeat(50));
    console.log('✅ All migrations completed!\n');
    
    // Verify tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%order%' OR table_name LIKE '%delivery%'
      ORDER BY table_name
    `);
    
    console.log('📊 Order System Tables:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration runner error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigrations();
