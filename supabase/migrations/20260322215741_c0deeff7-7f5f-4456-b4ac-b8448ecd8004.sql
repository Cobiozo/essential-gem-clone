ALTER TABLE public.news_ticker_settings
  ADD COLUMN IF NOT EXISTS source_live_activity boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_activity_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS live_activity_max_items integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS live_activity_hours integer NOT NULL DEFAULT 24;