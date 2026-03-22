UPDATE partner_page_template
SET template_data = jsonb_set(
  template_data::jsonb,
  '{4}',
  '{
    "id": "timeline_plan",
    "position": 4,
    "type": "timeline",
    "config": {
      "heading": "Proces wymaga czasu",
      "subtitle": "System trwa 6 miesięcy. To biologia i zaplanowana, komórkowa odbudowa Twojego organizmu.",
      "bg_color": "#0a1628",
      "text_color": "#ffffff",
      "line_color": "#10b981",
      "highlight_text_color": "#facc15",
      "milestones": [
        {"icon": "1", "month": "Miesiąc 1", "title": "Start. Wykonujesz 1. test i zaczynasz dawkę nasycającą.", "highlight": true},
        {"icon": "2–3", "month": "Miesiąc 2–3", "title": "Kontynuacja. Komórki przyswajają EPA i DHA.", "highlight": false},
        {"icon": "🎁", "month": "Miesiąc 4", "title": "Gratis: Otrzymujesz bonus Eqology Essential.", "highlight": true},
        {"icon": "5", "month": "Miesiąc 5", "title": "2. test kontrolny. Porównanie wyników.", "highlight": true},
        {"icon": "6", "month": "Miesiąc 6", "title": "Zakończenie cyklu i trwała kontynuacja nawyku.", "highlight": false}
      ]
    }
  }'::jsonb
)
WHERE id = '892223f1-cccf-4922-bab3-5781f7629a8a';