
ALTER TABLE public.news_hub_posts
  ADD COLUMN IF NOT EXISTS content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.news_hub_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  preview_url text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.news_hub_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_hub_templates_select" ON public.news_hub_templates;
CREATE POLICY "news_hub_templates_select"
  ON public.news_hub_templates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "news_hub_templates_admin_insert" ON public.news_hub_templates;
CREATE POLICY "news_hub_templates_admin_insert"
  ON public.news_hub_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "news_hub_templates_admin_update" ON public.news_hub_templates;
CREATE POLICY "news_hub_templates_admin_update"
  ON public.news_hub_templates FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "news_hub_templates_admin_delete" ON public.news_hub_templates;
CREATE POLICY "news_hub_templates_admin_delete"
  ON public.news_hub_templates FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND is_system = false);

DROP TRIGGER IF EXISTS update_news_hub_templates_updated_at ON public.news_hub_templates;
CREATE TRIGGER update_news_hub_templates_updated_at
  BEFORE UPDATE ON public.news_hub_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.news_hub_templates (name, description, is_system, sort_order, blocks)
VALUES
('Szybki Update', 'Prosty układ: nagłówek, krótki tekst, wideo.', true, 1, '[
  {"id":"b1","type":"heading","data":{"level":2,"text":"Nowa aktualizacja"}},
  {"id":"b2","type":"paragraph","data":{"html":"<p>Krótkie wprowadzenie do tematu...</p>"}},
  {"id":"b3","type":"video","data":{"url":""}}
]'::jsonb),
('Wiedza i Wyniki', 'Rozbudowany układ: tekst, tabela, wyróżniony wniosek, galeria.', true, 2, '[
  {"id":"b1","type":"heading","data":{"level":2,"text":"Wnioski z analizy"}},
  {"id":"b2","type":"paragraph","data":{"html":"<p>Omówienie wyników...</p>"}},
  {"id":"b3","type":"table","data":{"rows":[["Metryka","Wynik"],["Sprzedaż","+25%"]]}},
  {"id":"b4","type":"callout","data":{"variant":"info","text":"Najważniejszy wniosek."}},
  {"id":"b5","type":"gallery","data":{"images":[],"columns":3}}
]'::jsonb),
('Materiały Promocyjne', 'Galeria grafik, pliki PDF, CTA dla partnerów.', true, 3, '[
  {"id":"b1","type":"heading","data":{"level":2,"text":"Materiały do pobrania"}},
  {"id":"b2","type":"paragraph","data":{"html":"<p>Komplet materiałów dla partnerów.</p>"}},
  {"id":"b3","type":"gallery","data":{"images":[],"columns":3}},
  {"id":"b4","type":"file_download","data":{"url":"","name":"Instrukcja.pdf","description":"Pełna instrukcja"}},
  {"id":"b5","type":"button_cta","data":{"text":"Zobacz więcej","url":"","variant":"default","align":"center"}}
]'::jsonb)
ON CONFLICT DO NOTHING;
