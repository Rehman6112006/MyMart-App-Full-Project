/**
 * Phase 16: Staff Management System
 * Migration for Staff Management tables and indexes
 */

const pool = require('./src/config/database');

async function migrate() {
  console.log('🔄 Starting Phase 16: Staff Management System migration...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create staff_profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) UNIQUE,
        department VARCHAR(100),
        position VARCHAR(100),
        hire_date DATE DEFAULT CURRENT_DATE,
        salary DECIMAL(10, 2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, store_id)
      )
    `);
    console.log('✅ staff_profiles table created');

    // Create staff_attendance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_attendance (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
        check_in TIMESTAMP,
        check_out TIMESTAMP,
        work_hours DECIMAL(4, 2) GENERATED ALWAYS AS (
          CASE WHEN check_in IS NOT NULL AND check_out IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (check_out - check_in)) / 3600 
          ELSE NULL END
        ) STORED,
        status VARCHAR(20) DEFAULT 'present',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ staff_attendance table created');

    // Create staff_leaves table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_leaves (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ staff_leaves table created');

    // Create staff_shifts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_shifts (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
        shift_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ staff_shifts table created');

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_staff_profiles_user ON staff_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_staff_profiles_store ON staff_profiles(store_id);
      CREATE INDEX IF NOT EXISTS idx_staff_profiles_active ON staff_profiles(is_active);
      CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff ON staff_attendance(staff_id);
      CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(created_at);
      CREATE INDEX IF NOT EXISTS idx_staff_leaves_staff ON staff_leaves(staff_id);
      CREATE INDEX IF NOT EXISTS idx_staff_leaves_status ON staff_leaves(status);
      CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff ON staff_shifts(staff_id);
      CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON staff_shifts(shift_date);
    `);
    console.log('✅ Indexes created');

    await client.query('COMMIT');
    console.log('✅ Phase 16 migration completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
