/**
 * MyMart Database Cleanup & New Vendor Setup
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

// Use DATABASE_URL from .env or fallback to hardcoded
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.zonwxbsykvckbtckgfdk:Rehman6112006sswt@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

// Create pool with explicit DATABASE_URL
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
});

console.log('🔗 Database: Supabase PostgreSQL');

async function setup() {
  console.log('🗑️  Starting database cleanup and new vendor setup...\n');

  try {
    // Get vendor product IDs first
    const vendorProducts = await pool.query(`
      SELECT id FROM products WHERE vendor_id IN (SELECT id FROM users WHERE role = 'vendor')
    `);
    const productIds = vendorProducts.rows.map(r => r.id);
    
    if (productIds.length > 0) {
      // 1. Delete order_items for vendor products first
      console.log('📦 Deleting order_items for vendor products...');
      await pool.query(`
        DELETE FROM order_items WHERE product_id = ANY($1)
      `, [productIds]);
      console.log('   ✅ Order items deleted');
      
      // 2. Delete products for vendors
      console.log('📦 Deleting products for all vendors...');
      await pool.query(`
        DELETE FROM products 
        WHERE vendor_id IN (SELECT id FROM users WHERE role = 'vendor')
      `);
      console.log('   ✅ Products deleted');
    } else {
      console.log('📦 No products to delete');
    }

    // 3. Delete all stores for vendors  
    console.log('🏪 Deleting stores for all vendors...');
    await pool.query(`
      DELETE FROM stores 
      WHERE owner_id IN (SELECT id FROM users WHERE role = 'vendor')
    `);
    console.log('   ✅ Stores deleted');

    // 4. Delete all vendors
    console.log('👤 Deleting all vendors...');
    await pool.query(`
      DELETE FROM users WHERE role = 'vendor'
    `);
    console.log('   ✅ Vendors deleted\n');

    // 5. Check if email already exists (as customer/admin)
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', ['abdulrehman6112006@gmail.com']);
    
    let vendorId;
    let password = 'Rehman@00';
    let hashedPassword = await bcrypt.hash(password, 10);
    
    if (existingUser.rows.length > 0) {
      // Update existing user to vendor
      console.log('👤 User already exists, updating to vendor...');
      vendorId = existingUser.rows[0].id;
      await pool.query(`
        UPDATE users SET 
          password_hash = $1, 
          first_name = 'Abdul', 
          last_name = 'Rehman',
          role = 'vendor',
          is_active = true,
          updated_at = NOW()
        WHERE email = $2
      `, [hashedPassword, 'abdulrehman6112006@gmail.com']);
      console.log('   ✅ User updated to vendor');
    } else {
      // Create new vendor
      console.log('✨ Creating new vendor...');
      vendorId = uuidv4();
      
      await pool.query(`
        INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        vendorId,
        'abdulrehman6112006@gmail.com',
        hashedPassword,
        'Abdul',
        'Rehman',
        null,
        'vendor',
        true,
        new Date(),
        new Date()
      ]);
      console.log('   ✅ User created');
    }
    
    // 6. Create store for the vendor
    const storeId = uuidv4();
    const storeSlug = 'mymart-store-' + Date.now();

    // 5. Create store
    await pool.query(`
      INSERT INTO stores (id, owner_id, store_name, store_slug, description, email, phone, is_active, is_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      storeId,
      vendorId,
      'MyMart Store',
      storeSlug,
      'Welcome to our store!',
      'abdulrehman6112006@gmail.com',
      null,
      true,
      true,
      new Date(),
      new Date()
    ]);
    console.log('   ✅ Store created\n');

    // 6. Verify
    console.log('📋 VERIFICATION:');
    const user = await pool.query('SELECT * FROM users WHERE email = $1', ['abdulrehman6112006@gmail.com']);
    const store = await pool.query('SELECT * FROM stores WHERE owner_id = $1', [vendorId]);
    
    console.log('\n👤 Vendor User:');
    console.log(`   ID: ${user.rows[0].id}`);
    console.log(`   Email: ${user.rows[0].email}`);
    console.log(`   Role: ${user.rows[0].role}`);
    
    console.log('\n🏪 Vendor Store:');
    console.log(`   ID: ${store.rows[0].id}`);
    console.log(`   Name: ${store.rows[0].store_name}`);
    console.log(`   Slug: ${store.rows[0].store_slug}`);
    console.log(`   Active: ${store.rows[0].is_active}`);
    console.log(`   Verified: ${store.rows[0].is_verified}`);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 SETUP COMPLETE!');
    console.log('='.repeat(50));
    console.log('\n📧 Login Credentials:');
    console.log('   Email: abdulrehman6112006@gmail.com');
    console.log('   Password: Rehman@00');
    console.log('\n🏪 Store is AUTO-APPROVED and active!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

setup();
