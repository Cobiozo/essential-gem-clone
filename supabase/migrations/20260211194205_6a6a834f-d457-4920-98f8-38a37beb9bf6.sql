
UPDATE public.partner_page_template
SET template_data = '[
  {
    "id": "hero_banner",
    "type": "static",
    "label": "Baner główny",
    "content": "<div style=\"text-align:center;\"><h2 style=\"font-size:1.5rem;font-weight:700;margin-bottom:0.5rem;\">Pure Life Center</h2><p style=\"font-size:1rem;opacity:0.9;\">Naturalne suplementy dla Twojego zdrowia i piękna</p></div>",
    "position": 0
  },
  {
    "id": "partner_title",
    "type": "editable_text",
    "label": "Tytuł / rola",
    "placeholder": "np. Niezależny Partner Biznesowy",
    "max_length": 100,
    "position": 1
  },
  {
    "id": "products_section",
    "type": "product_slot",
    "label": "Produkty",
    "position": 2
  },
  {
    "id": "about_heading",
    "type": "static",
    "label": "Sekcja O mnie",
    "content": "<h2 style=\"font-size:1.5rem;font-weight:700;\">O mnie</h2>",
    "position": 3
  },
  {
    "id": "partner_photo",
    "type": "editable_image",
    "label": "Zdjęcie",
    "placeholder": "Dodaj swoje zdjęcie",
    "position": 4
  },
  {
    "id": "partner_bio",
    "type": "editable_text",
    "label": "O mnie",
    "placeholder": "Napisz kilka słów o sobie...",
    "max_length": 1000,
    "position": 5
  },
  {
    "id": "contact_email",
    "type": "editable_text",
    "label": "Email kontaktowy",
    "placeholder": "twoj@email.com",
    "max_length": 200,
    "position": 6
  },
  {
    "id": "contact_phone",
    "type": "editable_text",
    "label": "Telefon",
    "placeholder": "+48 123 456 789",
    "max_length": 30,
    "position": 7
  },
  {
    "id": "contact_facebook",
    "type": "editable_text",
    "label": "Facebook",
    "placeholder": "https://facebook.com/twojprofil",
    "max_length": 300,
    "position": 8
  }
]'::jsonb,
updated_at = now();
