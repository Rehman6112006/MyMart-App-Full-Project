const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function setupAdmin() {
  console.log('🔧 Setting up MyMart Admin User...\n');

  const adminEmail = 'admin@mymart.com';
  const adminPassword = 'Admin@123';
  const adminFirstName = 'Super';
  const adminLastName = 'Admin';

  try {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const result = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE
      SET password_hash = $2, first_name = $3, last_name = $4, role = $5, updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, first_name, last_name, role
    `, [adminEmail, hashedPassword, adminFirstName, adminLastName, 'admin', true]);

    console.log('✅ Admin user created/updated successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('👤 Name:', adminFirstName, adminLastName);
    console.log('🎭 Role: admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 Use these credentials to login to Admin Dashboard');
    console.log('🌐 URL: http://localhost:5000 (or your server URL)');
    console.log('\n⚠️ Please change this password after first login!\n');

  } catch (error) {
    console.error('❌ Error setting up admin:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

setupAdmin();
