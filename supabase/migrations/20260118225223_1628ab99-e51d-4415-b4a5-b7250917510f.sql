-- Create table for specialist calculator user access
CREATE TABLE public.specialist_calculator_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  has_access boolean DEFAULT true,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.specialist_calculator_user_access ENABLE ROW LEVEL SECURITY;

-- Admins can view all access records
CREATE POLICY "Admins can view specialist calculator access"
  ON public.specialist_calculator_user_access
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert access records
CREATE POLICY "Admins can grant specialist calculator access"
  ON public.specialist_calculator_user_access
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update access records
CREATE POLICY "Admins can update specialist calculator access"
  ON public.specialist_calculator_user_access
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete access records
CREATE POLICY "Admins can delete specialist calculator access"
  ON public.specialist_calculator_user_access
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can check their own access
CREATE POLICY "Users can view own specialist calculator access"
  ON public.specialist_calculator_user_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);