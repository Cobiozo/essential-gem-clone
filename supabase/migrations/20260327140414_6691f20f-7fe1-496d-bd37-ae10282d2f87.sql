
ALTER TABLE public.auto_webinar_fake_messages 
ADD COLUMN phase TEXT NOT NULL DEFAULT 'during';

-- Backfill existing messages based on appear_at_minute
UPDATE public.auto_webinar_fake_messages SET phase = 'welcome' WHERE appear_at_minute <= 3;
UPDATE public.auto_webinar_fake_messages SET phase = 'ending' WHERE appear_at_minute >= 40;
