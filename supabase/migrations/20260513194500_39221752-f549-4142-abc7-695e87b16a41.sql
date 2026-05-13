ALTER TABLE public.team_contacts
  ADD COLUMN IF NOT EXISTS priority_level smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_contacts_priority_level_range'
  ) THEN
    ALTER TABLE public.team_contacts
      ADD CONSTRAINT team_contacts_priority_level_range
      CHECK (priority_level BETWEEN 0 AND 5);
  END IF;
END $$;