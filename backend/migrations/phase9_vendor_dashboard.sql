-- ==================== PHASE 9: VENDOR DASHBOARD & REPORTS ====================

-- Vendor analytics summary (cached daily)
CREATE TABLE IF NOT EXISTS vendor_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    total_products_sold INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    returns_count INTEGER DEFAULT 0,
    avg_order_value DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, stat_date)
);

-- Product performance tracking
CREATE TABLE IF NOT EXISTS product_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    cart_additions INTEGER DEFAULT 0,
    orders INTEGER DEFAULT 0,
    units_sold INTEGER DEFAULT 0,
    revenue DECIMAL(12, 2) DEFAULT 0,
    returns INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, stat_date)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vendor_daily_stats_store ON vendor_daily_stats(store_id);
CREATE INDEX IF NOT EXISTS idx_vendor_daily_stats_date ON vendor_daily_stats(stat_date);
CREATE INDEX IF NOT EXISTS idx_product_daily_stats_product ON product_daily_stats(product_id);
CREATE INDEX IF NOT EXISTS idx_product_daily_stats_date ON product_daily_stats(stat_date);

-- Update stores table for dashboard preferences
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'dashboard_settings') THEN
        ALTER TABLE stores ADD COLUMN dashboard_settings JSONB DEFAULT '{}';
        ALTER TABLE stores ADD COLUMN last_dashboard_access TIMESTAMP;
    END IF;
END $$;

COMMENT ON TABLE vendor_daily_stats IS 'Cached daily analytics for vendor dashboard';
COMMENT ON TABLE product_daily_stats IS 'Cached daily product performance metrics';
