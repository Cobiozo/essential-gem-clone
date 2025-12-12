-- Create reflinks table for storing referral links
CREATE TABLE public.reflinks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_role TEXT NOT NULL CHECK (target_role IN ('klient', 'partner', 'specjalista')),
  reflink_code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reflinks ENABLE ROW LEVEL SECURITY;

-- Everyone can read active reflinks (needed for partner/specjalista to see their links)
CREATE POLICY "Authenticated users can view active reflinks"
ON public.reflinks
FOR SELECT
TO authenticated
USING (is_active = true);

-- Only admins can manage reflinks
CREATE POLICY "Admins can manage reflinks"
ON public.reflinks
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_reflinks_updated_at
BEFORE UPDATE ON public.reflinks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default reflinks for each role
INSERT INTO public.reflinks (target_role, reflink_code, description) VALUES
  ('klient', 'ref-klient-001', 'Reflink dla pozyskania klientów'),
  ('partner', 'ref-partner-001', 'Reflink dla pozyskania partnerów'),
  ('specjalista', 'ref-spec-001', 'Reflink dla pozyskania specjalistów');