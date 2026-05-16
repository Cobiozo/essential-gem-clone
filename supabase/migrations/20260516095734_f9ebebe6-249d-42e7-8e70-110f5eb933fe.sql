DROP INDEX IF EXISTS public.city_geocache_unique_idx;
ALTER TABLE public.city_geocache
  ADD CONSTRAINT city_geocache_city_country_key UNIQUE (city, country);