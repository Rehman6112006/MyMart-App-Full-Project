-- Phase 10: Search & Filters
-- =========================

-- Search Index for Products (Full-Text Search)
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(brand, ''))
);

-- Search Index for Categories
CREATE INDEX IF NOT EXISTS idx_categories_search ON categories USING GIN (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);

-- Search History Table
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  search_query VARCHAR(500) NOT NULL,
  results_count INTEGER DEFAULT 0,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_recent ON search_history(searched_at DESC);

-- Search Suggestions Table (Popular Searches)
CREATE TABLE IF NOT EXISTS search_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword VARCHAR(200) NOT NULL UNIQUE,
  search_count INTEGER DEFAULT 1,
  last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_trending BOOLEAN DEFAULT false,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suggestions_keyword ON search_suggestions(keyword varchar_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_suggestions_trending ON search_suggestions(search_count DESC);

-- Product Attributes Table (for Dynamic Filters)
CREATE TABLE IF NOT EXISTS product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  attribute_name VARCHAR(100) NOT NULL,
  attribute_value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, attribute_name)
);

CREATE INDEX IF NOT EXISTS idx_product_attrs_product ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attrs_name_value ON product_attributes(attribute_name, attribute_value);

-- Trending Searches (Scheduled job updates this)
CREATE INDEX IF NOT EXISTS idx_suggestions_trending_search ON search_suggestions(is_trending) WHERE is_trending = true;

-- Add search vector column to products (for faster search)
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Update existing products with search vector
UPDATE products SET search_vector = 
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(brand, ''))
WHERE search_vector IS NULL;

-- Create trigger to update search vector on product changes
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    coalesce(NEW.name, '') || ' ' || 
    coalesce(NEW.description, '') || ' ' || 
    coalesce(NEW.brand, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_search ON products;
CREATE TRIGGER trigger_update_product_search
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Add rating stats to products table for filtering
ALTER TABLE products ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Update product ratings from reviews
UPDATE products p SET 
  average_rating = COALESCE(r.avg_rating, 0),
  review_count = COALESCE(r.review_count, 0)
FROM (
  SELECT product_id, AVG(rating)::DECIMAL(3,2) as avg_rating, COUNT(*) as review_count
  FROM reviews WHERE is_approved = true
  GROUP BY product_id
) r WHERE p.id = r.product_id;

-- Create index for rating filter
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(average_rating DESC);
