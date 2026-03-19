-- Add columns to partner_page_template for multi-template support
ALTER TABLE public.partner_page_template
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Szablon',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS position INT DEFAULT 0;

-- Add selected_template_id to partner_pages
ALTER TABLE public.partner_pages
  ADD COLUMN IF NOT EXISTS selected_template_id UUID REFERENCES public.partner_page_template(id);

-- Insert example "Klasyczny" template
INSERT INTO public.partner_page_template (name, description, is_active, position, template_data)
VALUES (
  'Klasyczny',
  'Prosty szablon z nagłówkiem, bio, zdjęciem i produktami',
  true,
  0,
  '[
    {"id": "hero_heading", "type": "static", "label": "", "content": "<div style=\"text-align:center;padding:2rem 1rem\"><h1 style=\"font-size:2rem;font-weight:700\">Witaj na mojej stronie!</h1><p style=\"color:#666;margin-top:0.5rem\">Poznaj produkty, które polecam</p></div>", "position": 0},
    {"id": "bio_text", "type": "editable_text", "label": "O mnie", "placeholder": "Napisz kilka słów o sobie...", "max_length": 1000, "position": 1},
    {"id": "profile_photo", "type": "editable_image", "label": "Zdjęcie profilowe", "position": 2},
    {"id": "products_grid", "type": "product_slot", "label": "Moje produkty", "position": 3}
  ]'::jsonb
);