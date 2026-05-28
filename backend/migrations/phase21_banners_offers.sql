-- ============================================
-- BANNERS TABLE - For promotional banners
-- ============================================

CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    image_url TEXT NOT NULL,
    link_type VARCHAR(50) DEFAULT 'none', -- 'none', 'product', 'category', 'store', 'url'
    link_value VARCHAR(255), -- product_id, category_id, store_id, or external URL
    button_text VARCHAR(100),
    background_color VARCHAR(20) DEFAULT '#6366F1',
    text_color VARCHAR(20) DEFAULT '#FFFFFF',
    position INTEGER DEFAULT 1, -- 1 = top banner, 2 = mid banner, 3 = bottom
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_position ON banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_dates ON banners(start_date, end_date);

-- ============================================
-- OFFERS/COUPONS TABLE - Enhanced with banners
-- ============================================

CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    banner_image TEXT,
    offer_type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed', 'buy_x_get_y', 'free_delivery', 'bogo'
    discount_value DECIMAL(10,2), -- percentage or fixed amount
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_discount_amount DECIMAL(10,2), -- cap for percentage discounts
    coupon_code VARCHAR(50) UNIQUE,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    per_user_limit INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    applicable_categories UUID[], -- array of category IDs, NULL = all
    applicable_products UUID[], -- array of product IDs, NULL = all
    vendor_id UUID, -- NULL = platform-wide, otherwise vendor-specific
    store_id UUID, -- specific store if vendor offer
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active);
CREATE INDEX IF NOT EXISTS idx_offers_code ON offers(coupon_code);
CREATE INDEX IF NOT EXISTS idx_offers_vendor ON offers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_offers_dates ON offers(start_date, end_date);

-- ============================================
-- INSERT SAMPLE BANNERS
-- ============================================

INSERT INTO banners (title, subtitle, image_url, link_type, link_value, button_text, background_color, position, is_active) VALUES
('Welcome to MyMart', 'Shop from thousands of verified sellers', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop', 'none', NULL, 'Start Shopping', '#6366F1', 1, true),
('Summer Sale - Up to 50% Off', 'Limited time offer on Electronics', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop', 'category', NULL, 'Shop Now', '#EC4899', 2, true),
('Free Delivery on Orders Above 500', 'No hidden charges', 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&h=300&fit=crop', 'none', NULL, 'Learn More', '#10B981', 3, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERT SAMPLE OFFERS
-- ============================================

INSERT INTO offers (title, description, offer_type, discount_value, min_order_amount, max_discount_amount, coupon_code, is_active, is_featured) VALUES
('WELCOME10', 'Get 10% off on your first order', 'percentage', 10, 200, 100, 'WELCOME10', true, true),
('FLAT50', 'Flat Rs. 50 off on orders above 500', 'fixed', 50, 500, NULL, 'FLAT50', true, true),
('FREEDELIVERY', 'Free delivery on all orders', 'free_delivery', 0, 300, NULL, 'FREEDELIVERY', true, false)
ON CONFLICT (coupon_code) DO NOTHING;

-- Verification
SELECT 'Banners:' as table_name, COUNT(*) as count FROM banners
UNION ALL
SELECT 'Offers:', COUNT(*) FROM offers;
