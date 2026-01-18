-- Create specialist calculator settings table
CREATE TABLE public.specialist_calculator_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT true,
  enabled_for_admins BOOLEAN DEFAULT true,
  enabled_for_partners BOOLEAN DEFAULT true,
  enabled_for_specjalista BOOLEAN DEFAULT true,
  enabled_for_clients BOOLEAN DEFAULT false,
  base_commission_eur NUMERIC(10,2) DEFAULT 20.00,
  passive_per_month_eur NUMERIC(10,2) DEFAULT 5.00,
  passive_months INTEGER DEFAULT 5,
  retention_bonus_eur NUMERIC(10,2) DEFAULT 10.00,
  retention_months_count INTEGER DEFAULT 2,
  eur_to_pln_rate NUMERIC(10,4) DEFAULT 4.3000,
  min_clients INTEGER DEFAULT 1,
  max_clients INTEGER DEFAULT 500,
  default_clients INTEGER DEFAULT 50,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.specialist_calculator_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for specialist_calculator_settings
CREATE POLICY "Anyone can view specialist calculator settings"
ON public.specialist_calculator_settings
FOR SELECT
USING (true);

CREATE POLICY "Only admins can update specialist calculator settings"
ON public.specialist_calculator_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Insert default settings
INSERT INTO public.specialist_calculator_settings (id) VALUES (gen_random_uuid());

-- Create specialist volume thresholds table
CREATE TABLE public.specialist_volume_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  threshold_clients INTEGER NOT NULL,
  bonus_amount NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.specialist_volume_thresholds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for specialist_volume_thresholds
CREATE POLICY "Anyone can view specialist volume thresholds"
ON public.specialist_volume_thresholds
FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert specialist volume thresholds"
ON public.specialist_volume_thresholds
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Only admins can update specialist volume thresholds"
ON public.specialist_volume_thresholds
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Only admins can delete specialist volume thresholds"
ON public.specialist_volume_thresholds
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Insert default thresholds (cumulative bonuses)
INSERT INTO public.specialist_volume_thresholds (threshold_clients, bonus_amount, position) VALUES
(20, 200.00, 1),
(50, 2000.00, 2),
(100, 5000.00, 3),
(250, 10000.00, 4),
(500, 20000.00, 5);