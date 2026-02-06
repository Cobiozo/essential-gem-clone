-- =============================================
-- Push Notification System - Full Schema
-- =============================================

-- 1. Configuration table (singleton pattern)
CREATE TABLE public.push_notification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- VAPID Keys (stored in database, not as external secrets)
  vapid_public_key text,
  vapid_private_key text,
  vapid_subject text DEFAULT 'mailto:support@purelife.info.pl',
  
  -- Status
  is_enabled boolean DEFAULT false,
  keys_generated_at timestamptz,
  
  -- Icons (URLs to storage)
  icon_192_url text,
  icon_512_url text,
  badge_icon_url text,
  
  -- Default notification texts
  default_title text DEFAULT 'Pure Life Center',
  default_body text DEFAULT 'Masz nową wiadomość',
  
  -- Translations (JSONB)
  translations jsonb DEFAULT '{"pl": {"title": "Pure Life Center", "body": "Masz nową wiadomość"}, "en": {"title": "Pure Life Center", "body": "You have a new message"}}',
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Singleton constraint - only one record allowed
  CONSTRAINT single_push_config CHECK (id = '00000000-0000-0000-0000-000000000001')
);

-- Insert default config record
INSERT INTO public.push_notification_config (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- RLS: only admin can manage
ALTER TABLE public.push_notification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage push config"
  ON public.push_notification_config
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. User push subscriptions table (extended metadata)
CREATE TABLE public.user_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Web Push subscription data
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  
  -- Extended device metadata
  device_type text DEFAULT 'unknown',
  browser text,
  browser_version text,
  os text,
  os_version text,
  device_name text,
  is_pwa boolean DEFAULT false,
  
  -- Timestamps and tracking
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  last_success_at timestamptz,
  failure_count integer DEFAULT 0,
  
  -- Unique constraint per user+endpoint
  UNIQUE(user_id, endpoint)
);

-- RLS for subscriptions
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.user_push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON public.user_push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON public.user_push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON public.user_push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all subscriptions for statistics
CREATE POLICY "Admins can view all subscriptions"
  ON public.user_push_subscriptions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_push_subs_user ON public.user_push_subscriptions(user_id);
CREATE INDEX idx_push_subs_browser ON public.user_push_subscriptions(browser);
CREATE INDEX idx_push_subs_created ON public.user_push_subscriptions(created_at DESC);
CREATE INDEX idx_push_subs_is_pwa ON public.user_push_subscriptions(is_pwa);

-- 3. Push notification logs table
CREATE TABLE public.push_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.user_push_subscriptions(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Content
  title text NOT NULL,
  body text,
  url text,
  tag text,
  
  -- Status: 'sent', 'failed', 'expired'
  status text NOT NULL,
  error_message text,
  http_status integer,
  
  -- Metadata
  browser text,
  device_type text,
  
  -- Timestamp
  created_at timestamptz DEFAULT now()
);

-- RLS: only admin can view logs
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view push logs"
  ON public.push_notification_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert logs (from edge functions)
CREATE POLICY "Service role can insert logs"
  ON public.push_notification_logs FOR INSERT
  WITH CHECK (true);

-- Indexes for statistics and querying
CREATE INDEX idx_push_logs_created ON public.push_notification_logs(created_at DESC);
CREATE INDEX idx_push_logs_status ON public.push_notification_logs(status);
CREATE INDEX idx_push_logs_user ON public.push_notification_logs(user_id);

-- 4. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_push_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_push_config_timestamp
  BEFORE UPDATE ON public.push_notification_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_push_config_updated_at();