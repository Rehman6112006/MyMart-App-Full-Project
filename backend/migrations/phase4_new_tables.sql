-- =============================================
-- MYMART PHASE 4 - NEW TABLES MIGRATION
-- Run this SQL in Supabase SQL Editor
-- =============================================

-- 1. Wishlists Table
CREATE TABLE IF NOT EXISTS wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(customer_id, product_id)
);

-- 2. Returns Table
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    admin_notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    evidence JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'open',
    resolution TEXT,
    admin_response TEXT,
    vendor_response TEXT,
    refund_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Shipments Table
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    carrier VARCHAR(100) NOT NULL,
    shipping_method VARCHAR(100),
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processing',
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    pickup_date TIMESTAMP,
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    last_update TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Shipment Tracking Table
CREATE TABLE IF NOT EXISTS shipment_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Review Votes Table
CREATE TABLE IF NOT EXISTS review_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('helpful', 'unhelpful')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

-- 7. Notifications Table (for tracking sent notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ADD NEW COLUMNS TO EXISTING TABLES
-- =============================================

-- Add average_rating to products (if not exists)
ALTER TABLE products ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;

-- Add vendor_response to reviews (if not exists)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS vendor_response TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS vendor_response_date TIMESTAMP;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS unhelpful_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN DEFAULT false;

-- =============================================
-- INDEXES FOR BETTER PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_wishlists_customer ON wishlists(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_order ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_disputes_order ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_customer ON disputes(customer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_shipment ON shipment_tracking(shipment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Wishlists policies
CREATE POLICY "Users can view own wishlist" ON wishlists FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can add to own wishlist" ON wishlists FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users can delete own wishlist" ON wishlists FOR DELETE USING (auth.uid() = customer_id);

-- Returns policies
CREATE POLICY "Users can view own returns" ON returns FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can create returns" ON returns FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Disputes policies
CREATE POLICY "Users can view own disputes" ON disputes FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can create disputes" ON disputes FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- SAMPLE DATA (Optional)
-- =============================================

-- Insert sample carriers
-- INSERT INTO carriers (name, api_key, is_active) VALUES 
--     ('Delhivery', 'demo_key_1', true),
--     ('Shiprocket', 'demo_key_2', true),
--     ('FedEx', 'demo_key_3', true);

PRINT '✅ Phase 4 Migration Completed Successfully!';
