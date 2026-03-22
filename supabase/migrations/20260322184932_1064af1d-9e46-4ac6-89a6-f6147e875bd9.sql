-- Insert form definition
INSERT INTO public.partner_page_forms (name, cta_key, fields, submit_text, success_message, is_active)
VALUES (
  'Odbierz darmowy poradnik',
  'darmowy-poradnik',
  '[{"id":"imie","label":"Imię","type":"text","placeholder":"Wpisz swoje imię","required":true},{"id":"nazwisko","label":"Nazwisko","type":"text","placeholder":"Wpisz swoje nazwisko","required":true},{"id":"email","label":"Email","type":"email","placeholder":"Wpisz swój adres email","required":true}]'::jsonb,
  'Odbieram poradnik',
  'Dziękujemy! Poradnik zostanie wysłany na podany adres email.',
  true
);

-- Update button URL in all templates that have this button
UPDATE public.partner_page_template
SET template_data = regexp_replace(
  template_data::text,
  '"url": "", "text": "Odbierz darmowy poradnik"',
  '"url": "#darmowy-poradnik", "text": "Odbierz darmowy poradnik"',
  'g'
)::jsonb
WHERE template_data::text LIKE '%Odbierz darmowy poradnik%';