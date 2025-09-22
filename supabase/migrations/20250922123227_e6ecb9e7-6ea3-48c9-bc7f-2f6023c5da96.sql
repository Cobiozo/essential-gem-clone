-- Dodaj pole parent_id do tabeli cms_sections dla obsługi sekcji zagnieżdżonych
ALTER TABLE public.cms_sections 
ADD COLUMN parent_id uuid REFERENCES public.cms_sections(id) ON DELETE CASCADE;

-- Dodaj indeks dla lepszej wydajności zapytań hierarchicznych
CREATE INDEX idx_cms_sections_parent_id ON public.cms_sections(parent_id);

-- Dodaj indeks dla zapytań filtrujących sekcje główne
CREATE INDEX idx_cms_sections_parent_page ON public.cms_sections(parent_id, page_id) WHERE parent_id IS NULL;