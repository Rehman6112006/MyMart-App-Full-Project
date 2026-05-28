-- =============================================
-- MYMART PHASE 14 - STRIPE PAYMENT INTEGRATION
-- Run this SQL in Supabase SQL Editor
-- =============================================

-- 1. Add Stripe Customer ID to Users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- 2. Add Stripe Payment Intent ID to Orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);

-- 3. Create Payment Methods table for saved cards
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) NOT NULL,
    brand VARCHAR(50),
    last4 VARCHAR(4),
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create Stripe Events table for tracking webhooks
CREATE TABLE IF NOT EXISTS stripe_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    data JSONB,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_id ON stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(event_type);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Payment Methods policies
CREATE POLICY "Users can view own payment methods" ON payment_methods 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods" ON payment_methods 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods" ON payment_methods 
    FOR DELETE USING (auth.uid() = user_id);

-- Stripe Events - Admin only
CREATE POLICY "Admins can view all stripe events" ON stripe_events 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Service can insert stripe events" ON stripe_events 
    FOR INSERT WITH CHECK (true);

-- =============================================
-- SAMPLE DATA
-- =============================================

PRINT '✅ Phase 14 Migration Completed Successfully!';
PRINT '📋 New Tables: payment_methods, stripe_events';
PRINT '📋 New Columns: stripe_customer_id (users), stripe_payment_intent_id (orders)';
