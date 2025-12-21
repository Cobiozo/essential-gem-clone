-- Create rate limiting table with proper syntax
CREATE TABLE public.specialist_message_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  specialist_id uuid NOT NULL,
  message_count integer DEFAULT 1,
  window_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, specialist_id, window_date)
);

-- Enable RLS
ALTER TABLE public.specialist_message_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own limits
CREATE POLICY "Users can view own limits"
ON public.specialist_message_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own limits
CREATE POLICY "Users can insert own limits"
ON public.specialist_message_limits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own limits
CREATE POLICY "Users can update own limits"
ON public.specialist_message_limits
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can manage all limits
CREATE POLICY "Admins can manage message limits"
ON public.specialist_message_limits
FOR ALL
USING (is_admin());

-- Add messaging settings to specialist_search_settings
ALTER TABLE public.specialist_search_settings 
ADD COLUMN IF NOT EXISTS max_messages_per_day integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS max_messages_per_specialist_per_day integer DEFAULT 2;

-- Create specialist messaging blocks table (admin can block messaging to specific specialists)
CREATE TABLE public.specialist_messaging_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL UNIQUE,
  blocked_by uuid NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.specialist_messaging_blocks ENABLE ROW LEVEL SECURITY;

-- Everyone can view blocks (to check if specialist is blocked)
CREATE POLICY "Everyone can view messaging blocks"
ON public.specialist_messaging_blocks
FOR SELECT
USING (true);

-- Only admins can manage blocks
CREATE POLICY "Admins can manage messaging blocks"
ON public.specialist_messaging_blocks
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());