-- Categories Seed Data for MyMart (Matching App's Home Screen)
-- Run AFTER phase15_category_fields.sql

INSERT INTO categories (id, name, slug, description, icon, color, is_active, is_featured, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Fresh Vegetables', 'fresh-vegetables', 'Fresh vegetables from local farms', '🥬', '#22C55E', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Fresh Fruits', 'fresh-fruits', 'Fresh fruits and seasonal produce', '🍎', '#EF4444', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Chicken/Meat/Eggs', 'chicken-meat-eggs', 'Fresh poultry, meat and eggs', '🍗', '#B45309', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Dairy Products', 'dairy-products', 'Milk, cheese, yogurt and dairy items', '🥛', '#3B82F6', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Dry Grocery', 'dry-grocery', 'Rice, flour, pulses and staples', '🍚', '#F59E0B', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Snacks & Beverages', 'snacks-beverages', 'Chips, cookies, drinks and beverages', '🍿', '#8B5CF6', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Bakery & Breakfast', 'bakery-breakfast', 'Bread, pastries, cereals and breakfast items', '🥐', '#EC4899', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Frozen Foods', 'frozen-foods', 'Frozen meals, ice cream and frozen snacks', '🧊', '#06B6D4', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Personal Care', 'personal-care', 'Soap, shampoo, toothpaste and cosmetics', '🧴', '#10B981', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Home & Kitchen', 'home-kitchen', 'Kitchenware, utensils and home essentials', '🏠', '#6366F1', true, true, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET 
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  is_featured = EXCLUDED.is_featured,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verify categories
SELECT name, icon, color, is_featured FROM categories ORDER BY is_featured DESC, name ASC;
