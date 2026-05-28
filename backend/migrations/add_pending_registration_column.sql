-- =============================================
-- Add pending_registration_data column
-- =============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'email_verification_otps' 
    AND column_name = 'pending_registration_data'
  ) THEN
    ALTER TABLE email_verification_otps ADD COLUMN pending_registration_data JSONB;
    RAISE NOTICE '✅ Column pending_registration_data added successfully!';
  ELSE
    RAISE NOTICE '✅ Column pending_registration_data already exists!';
  END IF;
END $$;
