CREATE TABLE IF NOT EXISTS public.city_boundaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  country text NOT NULL,
  geojson jsonb,
  not_found boolean NOT NULL DEFAULT false,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(city, country)
);

ALTER TABLE public.city_boundaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read city_boundaries"
ON public.city_boundaries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_city_boundaries_lookup ON public.city_boundaries (city, country);