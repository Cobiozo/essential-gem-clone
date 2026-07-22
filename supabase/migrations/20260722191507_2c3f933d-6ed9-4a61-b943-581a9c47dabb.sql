ALTER TABLE public.hk_otp_codes ADD COLUMN IF NOT EXISTS partner_eq_id text;
UPDATE public.hk_otp_codes h SET partner_eq_id = p.eq_id FROM public.profiles p WHERE h.partner_id = p.user_id AND h.partner_eq_id IS NULL AND p.eq_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hk_otp_codes_partner_eq_id ON public.hk_otp_codes(partner_eq_id);