-- Add new columns to daily_signals table for signal type and source
ALTER TABLE public.daily_signals 
ADD COLUMN IF NOT EXISTS signal_type text DEFAULT 'supportive' CHECK (signal_type IN ('supportive', 'motivational', 'calm')),
ADD COLUMN IF NOT EXISTS source text DEFAULT 'ai' CHECK (source IN ('ai', 'admin'));

-- Add index for better filtering
CREATE INDEX IF NOT EXISTS idx_daily_signals_active_type ON public.daily_signals(is_approved, signal_type) WHERE is_approved = true;

-- Update ai_tone column constraint in daily_signal_settings
ALTER TABLE public.daily_signal_settings 
DROP CONSTRAINT IF EXISTS daily_signal_settings_ai_tone_check;

ALTER TABLE public.daily_signal_settings 
ADD CONSTRAINT daily_signal_settings_ai_tone_check 
CHECK (ai_tone IN ('supportive', 'motivational', 'calm'));