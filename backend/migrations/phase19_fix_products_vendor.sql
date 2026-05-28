-- ==================== FIX: Add vendor_id to products & Fix product associations ====================

-- 1. Add vendor_id column to products table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'vendor_id') THEN
        ALTER TABLE products ADD COLUMN vendor_id UUID;
        RAISE NOTICE '✅ Added vendor_id column to products table';
    ELSE
        RAISE NOTICE 'ℹ️ vendor_id column already exists in products table';
    END IF;
END $$;

-- 2. Create trigger function to auto-set vendor_id from store owner
CREATE OR REPLACE FUNCTION set_product_vendor_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.vendor_id IS NULL AND NEW.store_id IS NOT NULL THEN
        NEW.vendor_id := (SELECT owner_id FROM stores WHERE id = NEW.store_id LIMIT 1);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create or replace trigger
DROP TRIGGER IF EXISTS product_vendor_id_trigger ON products;
CREATE TRIGGER product_vendor_id_trigger
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION set_product_vendor_id();

-- 4. Update existing products to set vendor_id from their stores
UPDATE products p SET vendor_id = s.owner_id
FROM stores s
WHERE p.store_id = s.id AND p.vendor_id IS NULL;

-- 5. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);

-- 6. Show current state of products
-- SELECT p.id, p.name, p.store_id, p.vendor_id, s.store_name 
-- FROM products p LEFT JOIN stores s ON p.store_id = s.id;
