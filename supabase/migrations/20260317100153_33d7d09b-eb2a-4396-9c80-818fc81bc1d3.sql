-- Function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_event_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    RETURN NEW;
  END IF;

  base_slug := lower(NEW.title);
  base_slug := translate(base_slug, 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ', 'acelnoszżACELNOSZZ');
  base_slug := replace(base_slug, 'ż', 'z');
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  base_slug := left(base_slug, 80);

  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'event-' || substr(gen_random_uuid()::text, 1, 8);
  END IF;

  final_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM events WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_generate_event_slug_trigger ON events;
CREATE TRIGGER auto_generate_event_slug_trigger
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION generate_event_slug();

DO $$
DECLARE
  r RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  FOR r IN SELECT id, title FROM events WHERE slug IS NULL OR slug = '' LOOP
    base_slug := lower(r.title);
    base_slug := translate(base_slug, 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ', 'acelnoszżACELNOSZZ');
    base_slug := replace(base_slug, 'ż', 'z');
    base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    base_slug := left(base_slug, 80);
    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'event-' || substr(gen_random_uuid()::text, 1, 8);
    END IF;
    final_slug := base_slug;
    counter := 0;
    WHILE EXISTS (SELECT 1 FROM events WHERE slug = final_slug AND id != r.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    UPDATE events SET slug = final_slug WHERE id = r.id;
  END LOOP;
END;
$$;