-- COMPLETE ORDER SYSTEM - Run this in Supabase SQL Editor
-- Creates all tables for orders, delivery addresses, delivery settings
-- NOTE: Run in sequence - tables without dependencies first

-- ============================================
-- 1. DELIVERY SETTINGS TABLE (No dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default delivery settings (ignore if exists)
INSERT INTO delivery_settings (setting_key, setting_value, description) VALUES
    ('base_delivery_charge', '3', 'Base delivery charge'),
    ('free_delivery_threshold', '35', 'Order amount above which delivery is free'),
    ('same_day_delivery_charge', '2', 'Extra charge for same day delivery'),
    ('express_delivery_charge', '5', 'Extra charge for express delivery'),
    ('min_order_amount', '10', 'Minimum order amount'),
    ('max_orders_per_slot', '20', 'Maximum orders per delivery slot')
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;

-- ============================================
-- 2. DELIVERY SLOTS TABLE (No dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_name VARCHAR(100) NOT NULL,
    slot_type VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    extra_charge DECIMAL(10,2) DEFAULT 0,
    max_orders INTEGER DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default delivery slots (ignore if exists)
INSERT INTO delivery_slots (slot_name, slot_type, start_time, end_time, extra_charge, is_active) 
SELECT 'Morning Slot', 'morning', '09:00', '12:00', 0, true
WHERE NOT EXISTS (SELECT 1 FROM delivery_slots WHERE slot_name = 'Morning Slot');

INSERT INTO delivery_slots (slot_name, slot_type, start_time, end_time, extra_charge, is_active)
SELECT 'Afternoon Slot', 'afternoon', '12:00', '16:00', 0, true
WHERE NOT EXISTS (SELECT 1 FROM delivery_slots WHERE slot_name = 'Afternoon Slot');

INSERT INTO delivery_slots (slot_name, slot_type, start_time, end_time, extra_charge, is_active)
SELECT 'Evening Slot', 'evening', '16:00', '20:00', 0, true
WHERE NOT EXISTS (SELECT 1 FROM delivery_slots WHERE slot_name = 'Evening Slot');

INSERT INTO delivery_slots (slot_name, slot_type, start_time, end_time, extra_charge, is_active)
SELECT 'Same Day - Evening', 'same_day', '16:00', '20:00', 30, true
WHERE NOT EXISTS (SELECT 1 FROM delivery_slots WHERE slot_name = 'Same Day - Evening');

-- ============================================
-- 3. DELIVERY PERSONS TABLE (References users - optional)
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    vehicle_type VARCHAR(50) DEFAULT 'bike',
    vehicle_number VARCHAR(50),
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. DELIVERY ADDRESSES TABLE (References users)
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20),
    landmark VARCHAR(255),
    full_address TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. ORDER STATUS HISTORY TABLE (References orders)
-- ============================================
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. ALTER EXISTING ORDERS TABLE
-- Add missing columns if they don't exist
-- ============================================
DO $$ 
BEGIN
    -- Add status column if not exists (use order_status if that exists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'status') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_status') THEN
            -- Rename order_status to status
            ALTER TABLE orders RENAME COLUMN order_status TO status;
        ELSE
            -- Add new status column
            ALTER TABLE orders ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
        END IF;
    END IF;
    
    -- Add vendor_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'vendor_id') THEN
        ALTER TABLE orders ADD COLUMN vendor_id UUID;
    END IF;
    
    -- Add delivery_charge if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_charge') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipping_cost') THEN
            ALTER TABLE orders RENAME COLUMN shipping_cost TO delivery_charge;
        ELSE
            ALTER TABLE orders ADD COLUMN delivery_charge DECIMAL(10,2) DEFAULT 0;
        END IF;
    END IF;
    
    -- Add delivery_address_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_address_id') THEN
        ALTER TABLE orders ADD COLUMN delivery_address_id UUID;
    END IF;
    
    -- Add delivery_slot_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_slot_id') THEN
        ALTER TABLE orders ADD COLUMN delivery_slot_id UUID;
    END IF;
    
    -- Add delivery_date if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_date') THEN
        ALTER TABLE orders ADD COLUMN delivery_date DATE;
    END IF;
    
    -- Add delivery_person_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_person_id') THEN
        ALTER TABLE orders ADD COLUMN delivery_person_id UUID;
    END IF;
    
    -- Add delivery_person_name if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_person_name') THEN
        ALTER TABLE orders ADD COLUMN delivery_person_name VARCHAR(100);
    END IF;
    
    -- Add delivery_person_phone if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_person_phone') THEN
        ALTER TABLE orders ADD COLUMN delivery_person_phone VARCHAR(20);
    END IF;
    
    -- Add delivery_notes if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_notes') THEN
        ALTER TABLE orders ADD COLUMN delivery_notes TEXT;
    END IF;
    
    -- Add ordered_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'ordered_at') THEN
        ALTER TABLE orders ADD COLUMN ordered_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add confirmed_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'confirmed_at') THEN
        ALTER TABLE orders ADD COLUMN confirmed_at TIMESTAMPTZ;
    END IF;
    
    -- Add preparing_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'preparing_at') THEN
        ALTER TABLE orders ADD COLUMN preparing_at TIMESTAMPTZ;
    END IF;
    
    -- Add shipped_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipped_at') THEN
        ALTER TABLE orders ADD COLUMN shipped_at TIMESTAMPTZ;
    END IF;
    
    -- Add delivered_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMPTZ;
    END IF;
    
    -- Add cancelled_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cancelled_at') THEN
        ALTER TABLE orders ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;
    
    -- Add cancelled_by if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cancelled_by') THEN
        ALTER TABLE orders ADD COLUMN cancelled_by UUID;
    END IF;
    
    -- Add cancellation_reason if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE orders ADD COLUMN cancellation_reason TEXT;
    END IF;
    
    -- Add is_paid if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_paid') THEN
        ALTER TABLE orders ADD COLUMN is_paid BOOLEAN DEFAULT false;
    END IF;
    
END $$;

-- ============================================
-- 7. CREATE ORDER ITEMS TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    product_id UUID,
    product_name VARCHAR(255) NOT NULL,
    product_image TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. ADD FOREIGN KEYS (After tables exist)
-- ============================================
DO $$ 
BEGIN
    -- Add foreign key to delivery_addresses
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'delivery_addresses' AND constraint_name LIKE '%user_id%') THEN
        ALTER TABLE delivery_addresses ADD CONSTRAINT fk_delivery_addresses_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key to order_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'order_items' AND constraint_name LIKE '%order_id%') THEN
        ALTER TABLE order_items ADD CONSTRAINT fk_order_items_order 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key to order_status_history
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'order_status_history' AND constraint_name LIKE '%order_id%') THEN
        ALTER TABLE order_status_history ADD CONSTRAINT fk_order_status_history_order 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key to delivery_persons
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'delivery_persons' AND constraint_name LIKE '%user_id%') THEN
        ALTER TABLE delivery_persons ADD CONSTRAINT fk_delivery_persons_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add foreign key to orders delivery_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'orders' AND constraint_name LIKE '%delivery_address%') THEN
        ALTER TABLE orders ADD CONSTRAINT fk_orders_delivery_address 
        FOREIGN KEY (delivery_address_id) REFERENCES delivery_addresses(id) ON DELETE SET NULL;
    END IF;
    
    -- Add foreign key to orders delivery_slot
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'orders' AND constraint_name LIKE '%delivery_slot%') THEN
        ALTER TABLE orders ADD CONSTRAINT fk_orders_delivery_slot 
        FOREIGN KEY (delivery_slot_id) REFERENCES delivery_slots(id) ON DELETE SET NULL;
    END IF;
    
    -- Add foreign key to orders delivery_person
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'orders' AND constraint_name LIKE '%delivery_person%') THEN
        ALTER TABLE orders ADD CONSTRAINT fk_orders_delivery_person 
        FOREIGN KEY (delivery_person_id) REFERENCES delivery_persons(id) ON DELETE SET NULL;
    END IF;
    
    -- Add foreign key to orders vendor
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'orders' AND constraint_name LIKE '%vendor%') THEN
        ALTER TABLE orders ADD CONSTRAINT fk_orders_vendor 
        FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
END $$;

-- ============================================
-- 9. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user ON delivery_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_default ON delivery_addresses(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_delivery_slots_active ON delivery_slots(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_slots_type ON delivery_slots(slot_type);
CREATE INDEX IF NOT EXISTS idx_delivery_persons_active ON delivery_persons(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Delivery Settings:' as table_name, COUNT(*) as count FROM delivery_settings
UNION ALL
SELECT 'Delivery Slots:', COUNT(*) FROM delivery_slots
UNION ALL
SELECT 'Delivery Persons:', COUNT(*) FROM delivery_persons
UNION ALL
SELECT 'Delivery Addresses:', COUNT(*) FROM delivery_addresses
UNION ALL
SELECT 'Orders:', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Items:', COUNT(*) FROM order_items
UNION ALL
SELECT 'Order Status History:', COUNT(*) FROM order_status_history;

-- Show orders table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
