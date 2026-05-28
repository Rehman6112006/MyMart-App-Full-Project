-- FIX CATEGORIES - Update existing categories to grocery types
-- Don't delete, just UPDATE so products remain linked

-- Step 1: Add missing columns if not exists
DO $$ BEGIN
  ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Step 2: First, set products with old categories to NULL (to avoid FK error)
UPDATE products SET category_id = NULL 
WHERE category_id IN (
  SELECT id FROM categories WHERE slug IN (
    'beauty', 'books', 'clothing', 'electronics', 'home-garden', 'sports', 'toys', 'footwear'
  )
);

-- Step 3: Update existing categories to be grocery categories
UPDATE categories SET 
  name = 'Fresh Vegetables', 
  slug = 'fresh-vegetables',
  description = 'Fresh vegetables from local farms',
  icon = '🥬', 
  color = '#22C55E', 
  is_featured = true,
  is_active = true,
  updated_at = NOW()
WHERE slug = 'beauty' OR name ILIKE '%vegetable%';

UPDATE categories SET 
  name = 'Fresh Fruits', 
  slug = 'fresh-fruits',
  description = 'Fresh fruits and seasonal produce',
  icon = '🍎', 
  color = '#EF4444', 
  is_featured = true,
  is_active = true,
  updated_at = NOW()
WHERE slug = 'books' OR name ILIKE '%fruit%';

UPDATE categories SET 
  name = 'Chicken/Meat/Eggs', 
  slug = 'chicken-meat-eggs',
  description = 'Fresh poultry, meat and eggs',
  icon = '🍗', 
  color = '#B45309', 
  is_featured = true,
  is_active = true,
  updated_at = NOW()
WHERE slug = 'clothing' OR name ILIKE '%meat%';

UPDATE categories SET 
  name = 'Dairy Products', 
  slug = 'dairy-products',
  description = 'Milk, cheese, yogurt and dairy items',
  icon = '🥛', 
  color = '#3B82F6', 
  is_featured = true,
  is_active = true,
  updated_at = NOW()
WHERE slug = 'electronics' OR name ILIKE '%dairy%';

UPDATE categories SET 
  name = 'Dry Grocery', 
  slug = 'dry-grocery',
  description = 'Rice, flour, pulses and staples',
  icon = '🍚', 
  color = '#F59E0B', 
  is_featured = true,
  is_active = true,
  updated_at = NOW()
WHERE slug = 'home-garden' OR name ILIKE '%grocery%';

UPDATE categories SET 
  name = 'Snacks & Beverages', 
  slug = 'snacks-beverages',
  description = 'Chips, cookies, drinks and beverages',
  icon = '🍿', 
  color = '#8B5CF6', 
  is_featured = true,
  is_active = true,
  updated_at = NOW()
WHERE slug = 'sports' OR name ILIKE '%snack%';

UPDATE categories SET 
  name = 'Bakery & Breakfast', 
  slug = 'bakery-breakfast',
  description = 'Bread, pastries, cereals and breakfast items',
  icon = '🥐', 
  color = '#EC4899', 
  is_featured = true,
  is_active = true,
  updated_at = NOW()
WHERE slug = 'toys' OR name ILIKE '%bakery%';

UPDATE categories SET 
  name = 'Frozen Foods', 
  slug = 'frozen-foods',
  description = 'Frozen meals, ice cream and frozen snacks',
  icon = '🧊', 
  color = '#06B6D4', 
  is_featured = true,
  is_active = true,
  updated_at = NOW()
WHERE slug = 'footwear' OR name ILIKE '%frozen%';

UPDATE categories SET 
  name = 'Personal Care', 
  slug = 'personal-care',
  description = 'Soap, shampoo, toothpaste and cosmetics',
  icon = '🧴', 
  color = '#10B981', 
  is_featured = true,
  is_active = true,
  updated_at = NOW()
WHERE name ILIKE '%personal%' OR name ILIKE '%care%';

UPDATE categories SET 
  name = 'Home & Kitchen', 
  slug = 'home-kitchen',
  description = 'Kitchenware, utensils and home essentials',
  icon = '🏠', 
  color = '#6366F1', 
  is_featured = true,
  is_active = true,
  updated_at = NOW()
WHERE name ILIKE '%home%' OR name ILIKE '%kitchen%';

-- Step 4: Insert any missing categories
INSERT INTO categories (id, name, slug, description, icon, color, is_active, is_featured, created_at, updated_at)
SELECT 
  gen_random_uuid(), 
  name, slug, description, icon, color, true, true, NOW(), NOW()
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

-- Step 5: Verify
SELECT name, icon, color, is_featured FROM categories ORDER BY is_featured DESC, name ASC LIMIT 15;
