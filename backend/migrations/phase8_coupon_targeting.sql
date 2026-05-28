-- ============ PHASE 8: COUPON USER TARGETING ============

-- Add applicable_users column for targeted coupons (NULL = all users)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'coupons' AND column_name = 'applicable_users'
    ) THEN
        ALTER TABLE coupons ADD COLUMN applicable_users UUID[];
        RAISE NOTICE '✅ Column applicable_users added to coupons table';
    ELSE
        RAISE NOTICE '✅ Column applicable_users already exists';
    END IF;
END $$;

COMMENT ON COLUMN coupons.applicable_users IS 'Targeted user IDs — NULL means available to all users';
