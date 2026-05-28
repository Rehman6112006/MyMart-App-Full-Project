-- Phase 11: Enhanced Wishlists
-- ============================

-- Create Wishlist Lists Table (Multiple Lists)
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  list_id UUID REFERENCES wishlist_lists(id) ON DELETE CASCADE,
  added_price DECIMAL(10,2),  -- Price when added
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, product_id, list_id)
);

-- Drop and recreate for cleaner schema
DROP TABLE IF EXISTS wishlists CASCADE;

CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  list_id UUID REFERENCES wishlist_lists(id) ON DELETE SET NULL,
  added_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, product_id, list_id)
);

-- Wishlist Lists (User-created lists)
CREATE TABLE IF NOT EXISTS wishlist_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  share_token VARCHAR(50) UNIQUE,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wishlist_lists_customer ON wishlist_lists(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_lists_share_token ON wishlist_lists(share_token);

-- Price Drop Alerts
CREATE TABLE IF NOT EXISTS wishlist_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID REFERENCES wishlists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  original_price DECIMAL(10,2) NOT NULL,
  alert_threshold DECIMAL(10,2),  -- Alert when price drops below this
  last_checked_price DECIMAL(10,2),
  last_notified_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON wishlist_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_product ON wishlist_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON wishlist_alerts(is_active) WHERE is_active = true;

-- Stock Alerts
CREATE TABLE IF NOT EXISTS wishlist_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  was_out_of_stock BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_user ON wishlist_stock_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_active ON wishlist_stock_alerts(is_active) WHERE is_active = true;
