
-- 1. Add slot_time column for session isolation
ALTER TABLE public.auto_webinar_guest_messages
ADD COLUMN IF NOT EXISTS slot_time TEXT;

-- 2. Add RLS SELECT policy for anon
CREATE POLICY "anon_can_read_guest_messages"
ON public.auto_webinar_guest_messages
FOR SELECT TO anon
USING (true);

-- 3. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE auto_webinar_guest_messages;
