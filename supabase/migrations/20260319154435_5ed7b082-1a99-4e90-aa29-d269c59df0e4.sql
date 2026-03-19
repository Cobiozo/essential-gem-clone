INSERT INTO public.partner_page_template (name, description, is_active, position, template_data)
VALUES (
  'PureLifeCenter2026',
  'Szablon Premium — Pure Life Center 2026. Pełny landing page z sekcjami: header, hero, partner intro, produkty z formularzem, footer.',
  true,
  0,
  '[
    {
      "id": "plc2026-header",
      "type": "header",
      "label": "Header / Nawigacja",
      "position": 1,
      "config": {
        "logo_text": "Pure Life",
        "logo_image_url": "",
        "nav_style": "links",
        "buttons": [
          {"text": "Produkty", "url": "#products"},
          {"text": "Biznes", "url": "#partner"},
          {"text": "O nas", "url": "#about"},
          {"text": "Kontakt", "url": "#contact"}
        ],
        "editable_fields": ["logo_text"]
      }
    },
    {
      "id": "plc2026-hero",
      "type": "hero",
      "label": "Hero — główna sekcja",
      "position": 2,
      "config": {
        "layout": "split",
        "bg_image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80",
        "headline": "Zadbaj o zdrowie i zbuduj dochód pomagając innym.",
        "description": "Zdrowie, energia, codzienna równowaga – z produktami, którym ludzie ufają od ponad dekady. Dołącz do społeczności, która zmienia życie swoje i innych.",
        "text_color": "#ffffff",
        "cta_primary": {
          "text": "🌿 Chcę zobaczyć ofertę",
          "url": "#products"
        },
        "cta_bg_color": "#2d6a4f",
        "hero_image_url": "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80",
        "stats": [
          {"icon": "👥", "value": "+2 000", "label": "zadowolonych klientów"},
          {"icon": "🌍", "value": "+30", "label": "krajów na świecie"},
          {"icon": "📥", "value": "25 000", "label": "pobranych materiałów"}
        ],
        "editable_fields": ["cta_primary.url"]
      }
    },
    {
      "id": "plc2026-partner",
      "type": "text_image",
      "label": "Sekcja partnera",
      "position": 3,
      "config": {
        "bg_image_url": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80",
        "partner_name": "Sebastian",
        "partner_subtitle": "Twój partner w Pure Life",
        "heading": "Zmieniamy zdrowie i życie ludzi na lepsze.",
        "items": [
          "Naturalne suplementy najwyższej jakości, potwierdzone badaniami",
          "Wsparcie i mentoring na każdym etapie Twojej drogi",
          "Elastyczny model współpracy — dopasowany do Twojego stylu życia"
        ],
        "item_icon_color": "#2d6a4f",
        "cta_text": "🌿 Chcę dołączyć!",
        "cta_url": "#contact",
        "cta_bg_color": "#2d6a4f",
        "image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
        "image_side": "right",
        "text_color": "#ffffff",
        "editable_fields": ["partner_name", "heading", "image_url", "cta_url"]
      }
    },
    {
      "id": "plc2026-products-form",
      "type": "products_with_form",
      "label": "Produkty + Formularz kontaktowy",
      "position": 4,
      "config": {
        "heading": "Produkty, które ludzie kochają (i które działają)",
        "cta_bg_color": "#2d6a4f",
        "columns": [
          {
            "name": "Pure Arctic Oil Gold",
            "description": "Omega-3 najwyższej jakości z arktycznych wód Norwegii. Wspiera serce, mózg i odporność.",
            "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80",
            "cta_text": "Zobacz szczegóły"
          },
          {
            "name": "Pure Arctic Oil Heart & Energy",
            "description": "Formuła wspierająca układ krążenia i naturalny poziom energii przez cały dzień.",
            "image_url": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&q=80",
            "cta_text": "Zobacz szczegóły"
          },
          {
            "name": "Collagen Booster",
            "description": "Kolagen morski z witaminą C. Zdrowa skóra, mocne stawy, piękne włosy i paznokcie.",
            "image_url": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80",
            "cta_text": "Zobacz szczegóły"
          }
        ],
        "form_config": {
          "heading": "Daj mi znać jeśli chcesz wiedzieć więcej",
          "subheading": "Zostaw swoje dane, a skontaktuję się z Tobą w ciągu 24h",
          "fields": [
            {"name": "name", "label": "Imię", "type": "text", "required": true},
            {"name": "email", "label": "Email", "type": "email", "required": true},
            {"name": "phone", "label": "Telefon", "type": "tel", "required": false}
          ],
          "submit_text": "Wyślij formularz",
          "privacy_text": "Wysyłając formularz wyrażasz zgodę na kontakt w sprawie oferty.",
          "layout": "floating",
          "cta_bg_color": "#2d6a4f"
        },
        "editable_fields": ["heading"]
      }
    },
    {
      "id": "plc2026-footer",
      "type": "footer",
      "label": "Stopka",
      "position": 5,
      "config": {
        "company_name": "Pure Life Polska Sp. z o.o.",
        "address": "ul. Przykładowa 15, 00-001 Warszawa",
        "phone": "+48 123 456 789",
        "email": "kontakt@purelife.pl",
        "bg_color": "#0a1628",
        "text_color": "#ffffff",
        "copyright_text": "© 2026 Pure Life Polska. Wszelkie prawa zastrzeżone.",
        "links": [
          {"text": "Warunki współpracy", "url": "/terms"},
          {"text": "Polityka prywatności", "url": "/privacy"}
        ],
        "social": [
          {"platform": "facebook", "url": "https://facebook.com/purelife"},
          {"platform": "instagram", "url": "https://instagram.com/purelife"},
          {"platform": "twitter", "url": "https://twitter.com/purelife"},
          {"platform": "messenger", "url": "https://m.me/purelife"}
        ],
        "editable_fields": []
      }
    }
  ]'::jsonb
);