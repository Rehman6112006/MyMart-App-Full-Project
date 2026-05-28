-- ==============================================
-- PHASE 12: ADMIN ANALYTICS DASHBOARD
-- ==============================================

-- Admin Notifications Table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform Settings Table
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(admin_id, is_read);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created ON admin_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(setting_key);

-- Insert default platform settings
INSERT INTO platform_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
    ('platform_name', 'MyMart', 'string', 'Platform display name', true),
    ('platform_email', 'support@mymart.com', 'string', 'Support email address', true),
    ('platform_phone', '+91-9876543210', 'string', 'Support phone number', true),
    ('default_commission_rate', '15.0', 'number', 'Default commission rate percentage', false),
    ('min_payout_amount', '1000', 'number', 'Minimum payout amount for vendors', false),
    ('payout_schedule', 'monthly', 'string', 'Payout schedule (weekly/monthly)', false),
    ('return_window_days', '7', 'number', 'Number of days for return window', false),
    ('max_coupon_discount', '500', 'number', 'Maximum coupon discount amount', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Vendor Payouts Table
CREATE TABLE IF NOT EXISTS vendor_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES users(id),
    store_id UUID REFERENCES stores(id),
    amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(20),
    transaction_id VARCHAR(100),
    bank_details JSONB,
    notes TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor ON vendor_payouts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status ON vendor_payouts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_created ON vendor_payouts(created_at);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL,
    report_name VARCHAR(255) NOT NULL,
    parameters JSONB,
    file_path VARCHAR(500),
    generated_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Customer Addresses (enhancement) - Skip if table doesn't exist
-- These will be added when addresses table is created in a future phase

-- Order analytics columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_time INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_time INTEGER;

-- Store analytics columns
ALTER TABLE stores ADD COLUMN IF NOT EXISTS total_products INTEGER DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(12,2) DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0;

-- Commission summary view - Skipped (commissions table not created yet)
-- Will be created when commission tracking is implemented

-- Monthly sales view
CREATE OR REPLACE VIEW v_monthly_sales AS
SELECT 
    DATE_TRUNC('month', o.created_at) as month,
    COUNT(DISTINCT o.id) as total_orders,
    SUM(o.total_amount) as total_revenue,
    COUNT(DISTINCT o.customer_id) as unique_customers
FROM orders o
WHERE o.payment_status = 'completed'
GROUP BY DATE_TRUNC('month', o.created_at)
ORDER BY month DESC;

-- Top products view - Simplified (avoiding missing columns)
CREATE OR REPLACE VIEW v_top_products AS
SELECT 
    p.id,
    p.name,
    p.brand,
    p.base_price,
    c.name as category,
    s.store_name
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN stores s ON p.store_id = s.id
ORDER BY p.created_at DESC;

SELECT '✅ Phase 12 migration completed: Admin Analytics Dashboard';
