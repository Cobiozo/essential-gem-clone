-- Dodaj nowe kolumny dla InfoLink URL
ALTER TABLE public.reflinks 
ADD COLUMN IF NOT EXISTS infolink_url_type text DEFAULT 'external' CHECK (infolink_url_type IN ('internal', 'external'));

ALTER TABLE public.reflinks 
ADD COLUMN IF NOT EXISTS infolink_url text;