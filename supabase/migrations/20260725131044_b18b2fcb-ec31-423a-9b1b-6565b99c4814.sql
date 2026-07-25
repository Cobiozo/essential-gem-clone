ALTER TABLE public.city_geocache
ADD COLUMN IF NOT EXISTS postal_code text NOT NULL DEFAULT '';

DROP INDEX IF EXISTS public.city_geocache_street_city_country_key;

CREATE UNIQUE INDEX IF NOT EXISTS city_geocache_street_city_country_postal_code_key
ON public.city_geocache (street, city, country, postal_code);