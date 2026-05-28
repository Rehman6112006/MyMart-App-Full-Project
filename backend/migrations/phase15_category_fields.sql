-- Add ALL missing columns to categories table
-- Run this FIRST before any other category operations

-- Add missing columns
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📦';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366F1';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Set default values for existing rows
UPDATE categories SET 
  icon = '📦',
  color = '#6366F1',
  is_featured = false,
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE icon IS NULL OR icon = '';

-- Verify columns were added
SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'categories' ORDER BY ordinal_position;
