-- Add visibility columns for card labels
ALTER TABLE public.support_settings
ADD COLUMN IF NOT EXISTS email_label_visible boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS phone_label_visible boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS working_hours_label_visible boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS cards_order jsonb DEFAULT '["email", "phone", "working_hours"]'::jsonb;