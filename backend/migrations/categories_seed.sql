-- Categories Seed Data for MyMart (Matching App's Home Screen)
-- Run AFTER phase15_category_fields.sql

INSERT INTO categories (id, name, slug, description, icon, color, image_url, is_active, is_featured, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Fresh Vegetables', 'fresh-vegetables', 'Fresh vegetables from local farms', '🥬', '#22C55E', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Fresh Fruits', 'fresh-fruits', 'Fresh fruits and seasonal produce', '🍎', '#EF4444', 'https://images.unsplash.com/photo-1610834781757-86e7a3f2ff0e?w=400&h=400&fit=crop', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Chicken/Meat/Eggs', 'chicken-meat-eggs', 'Fresh poultry, meat and eggs', '🍗', '#B45309', 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Dairy Products', 'dairy-products', 'Milk, cheese, yogurt and dairy items', '🥛', '#3B82F6', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Dry Grocery', 'dry-grocery', 'Rice, flour, pulses and staples', '🍚', '#F59E0B', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Snacks & Beverages', 'snacks-beverages', 'Chips, cookies, drinks and beverages', '🍿', '#8B5CF6', 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Bakery & Breakfast', 'bakery-breakfast', 'Bread, pastries, cereals and breakfast items', '🥐', '#EC4899', 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=400&h=400&fit=crop', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Frozen Foods', 'frozen-foods', 'Frozen meals, ice cream and frozen snacks', '🧊', '#06B6D4', 'https://images.unsplash.com/photo-1558730234-d8b2289b1c2f?w=400&h=400&fit=crop', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Personal Care', 'personal-care', 'Soap, shampoo, toothpaste and cosmetics', '🧴', '#10B981', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Home & Kitchen', 'home-kitchen', 'Kitchenware, utensils and home essentials', '🏠', '#6366F1', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop', true, true, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET 
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  image_url = EXCLUDED.image_url,
  is_featured = EXCLUDED.is_featured,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verify categories
SELECT name, icon, color, is_featured FROM categories ORDER BY is_featured DESC, name ASC;
