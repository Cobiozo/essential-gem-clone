-- =====================================================
-- BANNER MODULE COMPREHENSIVE UPDATE
-- =====================================================

-- 1. Extend important_info_banners with animation and title styling
ALTER TABLE public.important_info_banners 
ADD COLUMN IF NOT EXISTS animation_type text DEFAULT 'fade-in',
ADD COLUMN IF NOT EXISTS animation_intensity text DEFAULT 'subtle',
ADD COLUMN IF NOT EXISTS title_bold boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS title_large boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS title_accent_color boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS title_underline boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS title_shadow boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS title_custom_color text;

-- 2. Extend daily_signal_settings with animation settings
ALTER TABLE public.daily_signal_settings 
ADD COLUMN IF NOT EXISTS animation_type text DEFAULT 'fade-in',
ADD COLUMN IF NOT EXISTS animation_intensity text DEFAULT 'subtle';

-- 3. Create banner_interactions table for AI statistics
CREATE TABLE IF NOT EXISTS public.banner_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_type text NOT NULL, -- 'signal' | 'info'
  banner_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_role text,
  interaction_type text NOT NULL, -- 'view' | 'accept' | 'disable' | 'skip'
  time_of_day text, -- 'morning' | 'afternoon' | 'evening' | 'night'
  day_of_week integer,
  reaction_time_ms integer,
  action_after_banner text, -- 'today_tasks' | 'action' | 'close_app' | 'none'
  time_to_first_action_ms integer,
  compass_stage text,
  banner_tone text,
  content_length integer,
  has_animation boolean DEFAULT false,
  animation_level text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on banner_interactions
ALTER TABLE public.banner_interactions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own interactions
CREATE POLICY "Users can insert own banner interactions"
ON public.banner_interactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all interactions
CREATE POLICY "Admins can view all banner interactions"
ON public.banner_interactions
FOR SELECT
USING (is_admin());

-- Users can view their own interactions
CREATE POLICY "Users can view own banner interactions"
ON public.banner_interactions
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_banner_interactions_banner_type ON public.banner_interactions(banner_type);
CREATE INDEX IF NOT EXISTS idx_banner_interactions_user_id ON public.banner_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_banner_interactions_created_at ON public.banner_interactions(created_at DESC);