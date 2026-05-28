-- ==================== PHASE 7: COUPONS & DISCOUNTS ====================

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2),  -- Maximum discount cap for percentage type
    usage_limit INTEGER,                 -- Total usage limit
    usage_count INTEGER DEFAULT 0,        -- Current usage count
    per_user_limit INTEGER DEFAULT 1,     -- Usage limit per user
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,       -- Visible to customers
    applicable_stores UUID[],            -- NULL = all stores, otherwise specific stores
    applicable_categories UUID[],         -- NULL = all categories, otherwise specific categories
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coupon usage tracking
CREATE TABLE IF NOT EXISTS coupon_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    discount_applied DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(coupon_id, order_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user ON coupon_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON coupon_usages(coupon_id);

-- Add coupon_id to orders table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'coupon_id') THEN
        ALTER TABLE orders ADD COLUMN coupon_id UUID REFERENCES coupons(id);
        ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

COMMENT ON TABLE coupons IS 'Stores discount coupons and promotional codes';
COMMENT ON COLUMN coupons.discount_type IS 'Type: percentage, fixed_amount, or free_shipping';
COMMENT ON COLUMN coupons.max_discount_amount IS 'Maximum discount cap (e.g., 20% off up to $100)';
