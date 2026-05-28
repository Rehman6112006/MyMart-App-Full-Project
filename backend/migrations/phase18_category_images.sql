-- Add image_url column to categories table for online category images
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update categories with beautiful Unsplash image URLs
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop' WHERE slug = 'fresh-vegetables';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1610834781757-86e7a3f2ff0e?w=400&h=400&fit=crop' WHERE slug = 'fresh-fruits';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop' WHERE slug = 'chicken-meat-eggs';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop' WHERE slug = 'dairy-products';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop' WHERE slug = 'dry-grocery';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop' WHERE slug = 'snacks-beverages';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=400&h=400&fit=crop' WHERE slug = 'bakery-breakfast';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1558730234-d8b2289b1c2f?w=400&h=400&fit=crop' WHERE slug = 'frozen-foods';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop' WHERE slug = 'personal-care';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop' WHERE slug = 'home-kitchen';

-- Update general categories too
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400&h=400&fit=crop' WHERE slug = 'electronics';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&h=400&fit=crop' WHERE slug = 'clothing';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=400&fit=crop' WHERE slug = 'home-garden';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop' WHERE slug = 'sports';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=400&fit=crop' WHERE slug = 'books';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop' WHERE slug = 'beauty';
