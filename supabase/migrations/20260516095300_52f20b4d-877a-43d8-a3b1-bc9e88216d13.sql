CREATE TABLE IF NOT EXISTS public.city_geocache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  country text NOT NULL DEFAULT '',
  lat double precision,
  lng double precision,
  provider text DEFAULT 'nominatim',
  not_found boolean NOT NULL DEFAULT false,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS city_geocache_unique_idx
  ON public.city_geocache (lower(city), lower(country));

ALTER TABLE public.city_geocache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read geocache" ON public.city_geocache;
CREATE POLICY "Admins can read geocache"
ON public.city_geocache
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_city_geocache_updated_at ON public.city_geocache;
CREATE TRIGGER update_city_geocache_updated_at
BEFORE UPDATE ON public.city_geocache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();