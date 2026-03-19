INSERT INTO public.partner_page_template (name, description, is_active, position, template_data)
VALUES (
  'Pure Life Classic',
  'Szablon odwzorowujący klasyczny design Pure Life — hero split, sekcja partnera, produkty, formularz kontaktowy i stopka.',
  true,
  1,
  '[
    {
      "id": "header_main",
      "type": "header",
      "position": 0,
      "config": {
        "logo_url": "",
        "logo_text": "Pure Life",
        "nav_links": [
          {"label": "Produkty", "url": "#produkty"},
          {"label": "Biznes", "url": "#biznes"},
          {"label": "O nas", "url": "#o-nas"},
          {"label": "Kontakt", "url": "#kontakt"}
        ],
        "bg_color": "#ffffff",
        "text_color": "#1a1a2e"
      }
    },
    {
      "id": "hero_split",
      "type": "hero",
      "position": 1,
      "config": {
        "layout": "split",
        "heading": "Zadbaj o zdrowie i zbuduj dochód pomagając innym.",
        "subheading": "Dołącz do społeczności Pure Life i zacznij budować swoją przyszłość z produktami, które naprawdę działają.",
        "cta_text": "Chcę zobaczyć ofertę",
        "cta_url": "#produkty",
        "hero_image_url": "",
        "bg_color": "#f0fdf4",
        "text_color": "#1a1a2e",
        "stats": [
          {"icon": "Users", "value": "+2000", "label": "zadowolonych klientów"},
          {"icon": "Globe", "value": "+30", "label": "krajów"},
          {"icon": "Download", "value": "25 000", "label": "pobrań aplikacji"}
        ]
      }
    },
    {
      "id": "partner_bio",
      "type": "text_image",
      "position": 2,
      "config": {
        "heading": "{Imię} | Twój partner w Pure Life",
        "text": "✔️ Pomagam ludziom zadbać o zdrowie naturalnie\n✔️ Buduję zespół w oparciu o wartości i zaufanie\n✔️ Wspieram każdego członka zespołu indywidualnie\n✔️ Dzielę się wiedzą i doświadczeniem",
        "image_url": "",
        "image_position": "right",
        "cta_text": "Chcę dołączyć!",
        "cta_url": "#kontakt",
        "bg_color": "#ffffff"
      }
    },
    {
      "id": "products_section",
      "type": "products_grid",
      "position": 3,
      "config": {
        "heading": "Produkty, które ludzie kochają (i które działają)",
        "subheading": "Naturalne suplementy najwyższej jakości",
        "columns": 3,
        "show_prices": false,
        "show_descriptions": true,
        "bg_color": "#fafafa"
      }
    },
    {
      "id": "contact_section",
      "type": "contact_form",
      "position": 4,
      "config": {
        "heading": "Daj mi znać jeśli chcesz wiedzieć więcej",
        "subheading": "Wypełnij formularz, a odezwę się do Ciebie w ciągu 24 godzin.",
        "fields": [
          {"label": "Imię", "placeholder": "Twoje imię", "type": "text", "required": true},
          {"label": "Email", "placeholder": "twoj@email.com", "type": "email", "required": true},
          {"label": "Telefon", "placeholder": "+48 000 000 000", "type": "tel", "required": false}
        ],
        "submit_text": "Wyślij formularz",
        "privacy_text": "Wysyłając formularz wyrażasz zgodę na kontakt w sprawie oferty Pure Life.",
        "bg_color": "#f0fdf4"
      }
    },
    {
      "id": "footer_main",
      "type": "footer",
      "position": 5,
      "config": {
        "company_name": "Pure Life Polska Sp. z o.o.",
        "address": "ul. Przykładowa 10, 00-001 Warszawa",
        "phone": "+48 800 000 000",
        "email": "kontakt@purelife.pl",
        "links": [
          {"text": "Warunki współpracy", "url": "/warunki"},
          {"text": "Polityka prywatności", "url": "/prywatnosc"}
        ],
        "social": [
          {"platform": "facebook", "url": "https://facebook.com/purelife"},
          {"platform": "instagram", "url": "https://instagram.com/purelife"},
          {"platform": "twitter", "url": "https://twitter.com/purelife"}
        ],
        "bg_color": "#1a1a2e",
        "text_color": "#ffffff"
      }
    }
  ]'::jsonb
);