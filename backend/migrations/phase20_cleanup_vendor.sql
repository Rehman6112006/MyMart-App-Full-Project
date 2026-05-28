-- ==================== COMPREHENSIVE DATABASE CLEANUP ====================
-- Vendor: vendor@mymart.com (Ahmed Store)
-- Purpose: Clean up duplicates and ensure data integrity

-- ============================================
-- STEP 0: Ensure vendor's store is ACTIVE (CRITICAL!)
-- ============================================
\echo '=== ACTIVATING VENDOR STORE ==='
UPDATE stores SET is_active = true, is_verified = true 
WHERE owner_id = 'e9474669-5cef-4966-9379-7d26a4594a6d';

\echo '✅ Vendor store activated';

-- ============================================
-- STEP 1: Check current state of vendor's store
-- ============================================
\echo '=== VENDOR STORE INFO ==='
SELECT id, store_name, owner_id, is_active, is_verified, email, phone, city 
FROM stores 
WHERE owner_id = 'e9474669-5cef-4966-9379-7d26a4594a6d';

-- ============================================
-- STEP 2: Find all products for this vendor's store
-- ============================================
\echo '=== VENDOR PRODUCTS ==='
SELECT p.id, p.name, p.base_price, p.stock_quantity, p.is_active, p.store_id, p.created_at
FROM products p
WHERE p.store_id = '55ccd249-44c2-470d-909f-dc508dfc2b9c'
ORDER BY p.created_at DESC;

-- ============================================
-- STEP 3: Remove DUPLICATE products (keep newest, remove old)
-- Keep only unique products by name, delete others
-- ============================================
\echo '=== CLEANING DUPLICATE PRODUCTS ==='

-- First, identify duplicates
WITH duplicate_names AS (
    SELECT name, MIN(created_at) as oldest_date
    FROM products
    WHERE store_id = '55ccd249-44c2-470d-909f-dc508dfc2b9c'
    GROUP BY name
    HAVING COUNT(*) > 1
)
DELETE FROM products
WHERE id IN (
    SELECT p.id FROM products p
    JOIN duplicate_names dn ON p.name = dn.name
    WHERE p.store_id = '55ccd249-44c2-470d-909f-dc508dfc2b9c'
    AND p.created_at > dn.oldest_date
);

\echo '✅ Removed duplicate products';

-- ============================================
-- STEP 4: Ensure all products have correct vendor_id
-- ============================================
\echo '=== UPDATING PRODUCT VENDOR_ID ==='
UPDATE products p 
SET vendor_id = s.owner_id
FROM stores s
WHERE p.store_id = s.id 
AND p.vendor_id IS NULL;

UPDATE products p 
SET vendor_id = 'e9474669-5cef-4966-9379-7d26a4594a6d'
WHERE p.store_id = '55ccd249-44c2-470d-909f-dc508dfc2b9c'
AND p.vendor_id IS NULL;

\echo '✅ Updated vendor_id for all products';

-- ============================================
-- STEP 5: Clean up orphan products (products without valid store)
-- ============================================
\echo '=== CLEANING ORPHAN PRODUCTS ==='
DELETE FROM products 
WHERE store_id IS NULL 
OR store_id NOT IN (SELECT id FROM stores);

\echo '✅ Cleaned orphan products';

-- ============================================
-- STEP 6: Verify MyMart Official store products
-- ============================================
\echo '=== MYMART OFFICIAL PRODUCTS ==='
SELECT p.id, p.name, p.base_price, p.is_active
FROM products p
WHERE p.store_id = '0ca11aba-eee5-445f-8600-c121ddda523e';

-- ============================================
-- STEP 7: Check order_items vendor_id
-- ============================================
\echo '=== CHECKING ORDER_ITEMS ==='
-- Update order_items vendor_id from products
UPDATE order_items oi
SET vendor_id = p.vendor_id
FROM products p
WHERE oi.product_id = p.id 
AND oi.vendor_id IS NULL;

-- ============================================
-- STEP 8: Check if vendor has orders
-- ============================================
\echo '=== VENDOR ORDERS ==='
SELECT o.id, o.order_number, o.status, o.total_amount, o.created_at
FROM orders o
WHERE o.vendor_id = 'e9474669-5cef-4966-9379-7d26a4594a6d'
OR o.user_id = 'e9474669-5cef-4966-9379-7d26a4594a6d';

-- ============================================
-- FINAL: Show clean state of vendor products
-- ============================================
\echo '=== FINAL VENDOR PRODUCTS STATE ==='
SELECT 
    p.id, 
    p.name, 
    p.base_price, 
    p.discount_price,
    p.stock_quantity, 
    p.is_active,
    p.store_id,
    p.vendor_id
FROM products p
WHERE p.store_id = '55ccd249-44c2-470d-909f-dc508dfc2b9c'
ORDER BY p.created_at DESC;

\echo '=== TOTAL PRODUCTS COUNT ==='
SELECT 
    s.store_name,
    COUNT(p.id) as product_count
FROM stores s
LEFT JOIN products p ON s.id = p.store_id
WHERE s.id IN ('55ccd249-44c2-470d-909f-dc508dfc2b9c', '0ca11aba-eee5-445f-8600-c121ddda523e')
GROUP BY s.store_name;
