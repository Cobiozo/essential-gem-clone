-- Add soft-delete columns to hk_otp_codes for user-level deletion
ALTER TABLE hk_otp_codes 
ADD COLUMN IF NOT EXISTS is_deleted_by_user BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_by_user_at TIMESTAMPTZ;

-- Create index for filtering by user deletion status
CREATE INDEX IF NOT EXISTS idx_hk_otp_codes_user_deleted ON hk_otp_codes(partner_id, is_deleted_by_user);

-- Update app_base_url to purelife.info.pl
UPDATE page_settings 
SET app_base_url = 'https://purelife.info.pl'
WHERE app_base_url = 'https://purelife.lovable.app';

-- RLS policies for hk_otp_codes (drop existing if any conflicts, then recreate)

-- Allow partners/admins to select their own non-deleted codes
DROP POLICY IF EXISTS "hk_partner_view_own_codes" ON hk_otp_codes;
CREATE POLICY "hk_partner_view_own_codes" ON hk_otp_codes
  FOR SELECT 
  USING (
    (partner_id = auth.uid() AND is_deleted_by_user = false)
    OR public.is_admin()
  );

-- Allow partners to update their own codes (for soft-delete)
DROP POLICY IF EXISTS "hk_partner_update_own_codes" ON hk_otp_codes;
CREATE POLICY "hk_partner_update_own_codes" ON hk_otp_codes
  FOR UPDATE 
  USING (partner_id = auth.uid() OR public.is_admin());

-- Allow partners to insert new codes
DROP POLICY IF EXISTS "hk_partner_insert_codes" ON hk_otp_codes;
CREATE POLICY "hk_partner_insert_codes" ON hk_otp_codes
  FOR INSERT 
  WITH CHECK (partner_id = auth.uid() OR public.is_admin());

-- Allow admins to delete codes
DROP POLICY IF EXISTS "hk_admin_delete_codes" ON hk_otp_codes;
CREATE POLICY "hk_admin_delete_codes" ON hk_otp_codes
  FOR DELETE 
  USING (public.is_admin());