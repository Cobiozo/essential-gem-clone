UPDATE partner_page_template 
SET template_data = jsonb_set(
  template_data,
  '{1,config}',
  '{
    "layout": "split",
    "bg_color": "#0a1628",
    "text_color": "#ffffff",
    "headline": "TESTUJ, NIE ZGADUJ.\nTwoje zdrowie zasługuje\nna twarde dane.",
    "description": "Omega-3 to fundament Twojego zdrowia. Sprawdź swój poziom i dobierz najlepszą opcję wspólnie z nami.",
    "cta_primary": {
      "text": "KUP TERAZ I DOŁĄCZ DO NAS",
      "url": "#produkty"
    },
    "cta_secondary": {
      "text": "Wypełnij ankietę i dobierz opcję ✔️",
      "url": "#kontakt"
    },
    "cta_bg_color": "#2d6a4f",
    "cta_icon": "arrow",
    "overlay_opacity": 0.3,
    "hero_image_url": "",
    "partner_badge": {
      "text": "Twój Przewodnik Zdrowia:",
      "subtitle": "{Imię} - Jesteśmy tu dla Ciebie.",
      "avatar_url": ""
    },
    "editable_fields": ["partner_badge.subtitle", "partner_badge.avatar_url", "cta_primary.url", "cta_secondary.url"],
    "stats": [
      {"icon": "Users", "label": "zadowolonych klientów", "value": "+2000"},
      {"icon": "Globe", "label": "krajów", "value": "+30"},
      {"icon": "Download", "label": "pobrań aplikacji", "value": "25 000"}
    ]
  }'::jsonb
)
WHERE id = '9abb203f-ca07-41bd-8eb9-890bcc5b9fb0';