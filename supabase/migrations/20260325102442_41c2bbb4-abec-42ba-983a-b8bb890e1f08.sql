-- Add fake participants columns to auto_webinar_config
ALTER TABLE public.auto_webinar_config
  ADD COLUMN IF NOT EXISTS fake_participants_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS fake_participants_min INTEGER DEFAULT 45,
  ADD COLUMN IF NOT EXISTS fake_participants_max INTEGER DEFAULT 120,
  ADD COLUMN IF NOT EXISTS fake_chat_enabled BOOLEAN DEFAULT true;

-- Create fake messages table
CREATE TABLE IF NOT EXISTS public.auto_webinar_fake_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES public.auto_webinar_config(id) ON DELETE CASCADE,
  appear_at_minute INTEGER NOT NULL DEFAULT 0,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auto_webinar_fake_messages ENABLE ROW LEVEL SECURITY;

-- SELECT for anon and authenticated
CREATE POLICY "Anyone can read fake messages"
  ON public.auto_webinar_fake_messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT/UPDATE/DELETE for authenticated (admin check in UI)
CREATE POLICY "Authenticated can manage fake messages"
  ON public.auto_webinar_fake_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);