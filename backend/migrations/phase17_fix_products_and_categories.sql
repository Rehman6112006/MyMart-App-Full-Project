-- Fix Products Table - Add missing columns and fix categories
-- Run this in Supabase SQL Editor

-- Step 1: Add missing columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS thumbnail TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'new';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Step 2: Add missing columns to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Step 3: Set products category to NULL for old non-grocery categories
UPDATE products SET category_id = NULL 
WHERE category_id IN (
  SELECT id FROM categories 
  WHERE slug IN ('beauty', 'books', 'clothing', 'electronics', 'home-garden', 'sports', 'toys', 'footwear')
  OR name ILIKE '%beauty%' OR name ILIKE '%books%' OR name ILIKE '%clothing%' 
  OR name ILIKE '%electronics%' OR name ILIKE '%sports%' OR name ILIKE '%toys%' OR name ILIKE '%footwear%'
);

-- Step 4: Update existing categories to grocery types
UPDATE categories SET 
  icon = '🥬', color = '#22C55E', is_featured = true, is_active = true,
  description = 'Fresh vegetables from local farms', updated_at = NOW()
WHERE slug = 'beauty' OR name ILIKE '%vegetable%';

UPDATE categories SET 
  icon = '🍎', color = '#EF4444', is_featured = true, is_active = true,
  description = 'Fresh fruits and seasonal produce', updated_at = NOW()
WHERE slug = 'books' OR name ILIKE '%fruit%';

UPDATE categories SET 
  icon = '🍗', color = '#B45309', is_featured = true, is_active = true,
  description = 'Fresh poultry, meat and eggs', updated_at = NOW()
WHERE slug = 'clothing' OR name ILIKE '%meat%';

UPDATE categories SET 
  icon = '🥛', color = '#3B82F6', is_featured = true, is_active = true,
  description = 'Milk, cheese, yogurt and dairy items', updated_at = NOW()
WHERE slug = 'electronics' OR name ILIKE '%dairy%';

UPDATE categories SET 
  icon = '🍚', color = '#F59E0B', is_featured = true, is_active = true,
  description = 'Rice, flour, pulses and staples', updated_at = NOW()
WHERE slug = 'home-garden' OR name ILIKE '%grocery%';

UPDATE categories SET 
  icon = '🍿', color = '#8B5CF6', is_featured = true, is_active = true,
  description = 'Chips, cookies, drinks and beverages', updated_at = NOW()
WHERE slug = 'sports' OR name ILIKE '%snack%';

UPDATE categories SET 
  icon = '🥐', color = '#EC4899', is_featured = true, is_active = true,
  description = 'Bread, pastries, cereals and breakfast items', updated_at = NOW()
WHERE slug = 'toys' OR name ILIKE '%bakery%';

UPDATE categories SET 
  icon = '🧊', color = '#06B6D4', is_featured = true, is_active = true,
  description = 'Frozen meals, ice cream and frozen snacks', updated_at = NOW()
WHERE slug = 'footwear' OR name ILIKE '%frozen%';

UPDATE categories SET 
  icon = '🧴', color = '#10B981', is_featured = true, is_active = true,
  description = 'Soap, shampoo, toothpaste and cosmetics', updated_at = NOW()
WHERE name ILIKE '%personal%' OR name ILIKE '%care%';

UPDATE categories SET 
  icon = '🏠', color = '#6366F1', is_featured = true, is_active = true,
  description = 'Kitchenware, utensils and home essentials', updated_at = NOW()
WHERE name ILIKE '%home%' OR name ILIKE '%kitchen%';

-- Step 5: Insert missing grocery categories
INSERT INTO categories (id, name, slug, description, icon, color, is_active, is_featured, created_at, updated_at)
SELECT gen_random_uuid(), name, slug, description, icon, color, true, true, NOW(), NOW()
FROM (VALUES
  ('Fresh Vegetables', 'fresh-vegetables', 'Fresh vegetables from local farms', '🥬', '#22C55E'),
  ('Fresh Fruits', 'fresh-fruits', 'Fresh fruits and seasonal produce', '🍎', '#EF4444'),
  ('Chicken/Meat/Eggs', 'chicken-meat-eggs', 'Fresh poultry, meat and eggs', '🍗', '#B45309'),
  ('Dairy Products', 'dairy-products', 'Milk, cheese, yogurt and dairy items', '🥛', '#3B82F6'),
  ('Dry Grocery', 'dry-grocery', 'Rice, flour, pulses and staples', '🍚', '#F59E0B'),
  ('Snacks & Beverages', 'snacks-beverages', 'Chips, cookies, drinks and beverages', '🍿', '#8B5CF6'),
  ('Bakery & Breakfast', 'bakery-breakfast', 'Bread, pastries, cereals and breakfast items', '🥐', '#EC4899'),
  ('Frozen Foods', 'frozen-foods', 'Frozen meals, ice cream and frozen snacks', '🧊', '#06B6D4'),
  ('Personal Care', 'personal-care', 'Soap, shampoo, toothpaste and cosmetics', '🧴', '#10B981'),
  ('Home & Kitchen', 'home-kitchen', 'Kitchenware, utensils and home essentials', '🏠', '#6366F1')
) AS v(name, slug, description, icon, color)
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE categories.slug = v.slug);

-- Step 6: Verify products table columns
SELECT column_name FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position;

-- Step 7: Verify categories
SELECT name, icon, color, is_featured FROM categories ORDER BY is_featured DESC, name ASC LIMIT 15;
