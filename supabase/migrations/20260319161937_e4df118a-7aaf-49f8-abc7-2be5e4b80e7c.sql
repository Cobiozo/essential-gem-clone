UPDATE public.partner_page_template
SET template_data = jsonb_set(
  template_data,
  '{1,config}',
  '{
    "layout": "split",
    "bg_color": "#3d4a2c",
    "overlay_opacity": 0,
    "text_color": "#ffffff",
    "headline": "TESTUJ, NIE ZGADUJ.\nTwoje zdrowie zasługuje na twarde dane.",
    "subheadline": "9/10 osób ma niedobór omega-3 na bazie setek tysięcy testów.",
    "description": "Suplementacja Omega-3 oparta na teście z laboratorium.\nProsty 6-miesięczny proces dla Ciebie i rodziny.",
    "cta_primary": { "text": "KUP TERAZ | DOŁĄCZ DO NAS", "url": "#products" },
    "cta_secondary": { "text": "Wypełnij ankietę | dobierz opcję", "url": "#contact" },
    "cta_bg_color": "#2d6a4f",
    "hero_image_url": "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80",
    "editable_fields": ["cta_primary.url", "cta_secondary.url"]
  }'::jsonb
),
updated_at = now()
WHERE name = 'PureLifeCenter2026';