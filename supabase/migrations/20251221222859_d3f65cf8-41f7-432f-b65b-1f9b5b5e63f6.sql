-- Add extended columns to specialist_search_settings
ALTER TABLE public.specialist_search_settings 
  ADD COLUMN IF NOT EXISTS show_email_to_clients boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_email_to_partners boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_email_to_specjalista boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_phone_to_clients boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_phone_to_partners boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_phone_to_specjalista boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_address_to_clients boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_address_to_partners boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_address_to_specjalista boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_messaging boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS messaging_enabled_for_clients boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS messaging_enabled_for_partners boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS messaging_enabled_for_specjalista boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS integrate_with_team_contacts boolean NOT NULL DEFAULT false;