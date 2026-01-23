-- Dodanie kolumny thumbnail_url do tabeli healthy_knowledge
ALTER TABLE public.healthy_knowledge
ADD COLUMN thumbnail_url TEXT;

-- Komentarz opisujący kolumnę
COMMENT ON COLUMN healthy_knowledge.thumbnail_url IS 'URL okładki/miniatury materiału (obraz)';