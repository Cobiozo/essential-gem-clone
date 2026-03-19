
INSERT INTO public.partner_page_template (name, description, is_active, position, template_data)
VALUES (
  'Eqology',
  'Profesjonalny landing page dla partnerów Eqology — hero z wideo, kroki, oś czasu, social proof, produkty, FAQ, CTA.',
  true,
  1,
  '[
    {
      "id": "header_nav",
      "type": "header",
      "position": 0,
      "config": {
        "logo_text": "EQOLOGY",
        "buttons": [
          {"text": "Wypełnij ankietę", "url": "#ankieta", "variant": "outline"},
          {"text": "KUP TERAZ", "url": "#produkty", "variant": "primary"}
        ]
      }
    },
    {
      "id": "hero_main",
      "type": "hero",
      "position": 1,
      "config": {
        "headline": "TESTUJ, NIE ZGADUJ.",
        "subheadline": "Twoje zdrowie zasługuje na twarde dane.",
        "description": "Suplementacja Omega-3 oparta na teście z laboratorium. Prosty 6-miesięczny proces dla Ciebie i rodziny.",
        "badge_text": "9/10 osób ma niedobór omega-3 na bazie setek tysięcy testów.",
        "bg_color": "#0a1628",
        "cta_primary": {"text": "KUP TERAZ I DOŁĄCZ DO NAS", "url": "#produkty"},
        "cta_secondary": {"text": "Wypełnij ankietę i dobierz opcję", "url": "#ankieta"}
      }
    },
    {
      "id": "problem_section",
      "type": "text_image",
      "position": 2,
      "config": {
        "heading": "Większość ludzi suplementuje\nna ślepo. Znasz to?",
        "items": [
          {"icon": "❌", "text": "Kupowanie z reklam"},
          {"icon": "❌", "text": "Polecenia znajomych"},
          {"icon": "❌", "text": "Brak dowodu działania"}
        ],
        "highlight_text": "9 na 10 osób",
        "highlight_description": "ma niedobór Omega-3. To nie nisza, to dane z dużej bazy testów w Europie.",
        "cta_text": "Sprawdź swój wynik zamiast zgadywać",
        "cta_url": "#produkty",
        "image_side": "right"
      }
    },
    {
      "id": "steps_howto",
      "type": "steps",
      "position": 3,
      "config": {
        "heading": "Jak działa Eqology Test Kit? To proste.",
        "description": "Analiza mierzy precyzyjną ilość kwasów w Twoich krwinkach.",
        "bg_color": "#0f172a",
        "steps": [
          {"icon": "📦", "title": "Krok 1", "description": "Zamawiasz subskrypcję (olej + test)."},
          {"icon": "🩸", "title": "Krok 2", "description": "Wykonujesz bezbolesną, suchą kroplę krwi w domu (1-2 min)."},
          {"icon": "🔬", "title": "Krok 3", "description": "Wysyłasz darmową kopertę do laboratorium Vitas i odbierasz wynik online."}
        ]
      }
    },
    {
      "id": "timeline_plan",
      "type": "timeline",
      "position": 4,
      "config": {
        "heading": "Twój 6-miesięczny plan naprawczy",
        "milestones": [
          {"icon": "🧪", "month": "Miesiąc 1", "title": "Test i Start", "highlight": false},
          {"icon": "💊", "month": "Miesiąc 2-4", "title": "Kontynuacja", "highlight": false},
          {"icon": "🎁", "month": "Miesiąc 4", "title": "Gratis!", "highlight": true},
          {"icon": "📊", "month": "Miesiąc 6", "title": "Drugi Test", "highlight": false}
        ]
      }
    },
    {
      "id": "social_proof",
      "type": "testimonials",
      "position": 5,
      "config": {
        "heading": "Wyniki mówią same za siebie",
        "cards": [
          {"label": "Wsparcie serca", "before": "15:1", "after": "3:1", "description": "Co pomogło: Subskrypcja + test"},
          {"label": "Lepsza koncentracja", "before": "22:1", "after": "4:1", "description": "Co pomogło: Subskrypcja + test"}
        ]
      }
    },
    {
      "id": "products_offer",
      "type": "products_grid",
      "position": 6,
      "config": {
        "heading": "Wybierz swój olej w subskrypcji",
        "columns": [
          {"name": "Pure Arctic Oil", "subtitle": "Dla każdego.", "specs": "1420 mg EPA+DHA", "image_url": "", "cta_text": "KUP TERAZ"},
          {"name": "Heart & Energy", "subtitle": "Dla aktywnych.", "specs": "EPA+DHA + 50 mg Q10", "image_url": "", "cta_text": "KUP TERAZ"},
          {"name": "Pure Arctic Oil Gold", "subtitle": "Premium.", "specs": "2000 mg EPA+DHA", "image_url": "", "cta_text": "KUP TERAZ"}
        ]
      }
    },
    {
      "id": "faq_section",
      "type": "faq",
      "position": 7,
      "config": {
        "heading": "Masz pytania?",
        "items": [
          {"question": "Czy badanie boli?", "answer": "Nie, badanie polega na pobraniu jednej kropli krwi z opuszka palca. Jest całkowicie bezbolesne i trwa 1-2 minuty."},
          {"question": "Kiedy otrzymam wyniki?", "answer": "Wyniki są dostępne online w ciągu 10-20 dni roboczych od momentu, gdy laboratorium Vitas otrzyma Twoją próbkę."},
          {"question": "Jak dokładnie działa gwarancja?", "answer": "Jeśli po 6 miesiącach regularnego stosowania Twój wynik omega-3 nie poprawi się, otrzymasz zwrot pieniędzy za olej."}
        ]
      }
    },
    {
      "id": "cta_bottom",
      "type": "cta_banner",
      "position": 8,
      "config": {
        "heading": "Nie wiesz od czego zacząć?",
        "description": "Wypełnij krótką ankietę, a otrzymasz dopasowane materiały i wsparcie naszego zespołu.",
        "cta_text": "PRZEJDŹ DO ANKIETY",
        "cta_url": "#ankieta",
        "bg_color": "#0f172a"
      }
    },
    {
      "id": "footer_text",
      "type": "static",
      "position": 9,
      "content": "<p style=\"text-align:center;color:#888;font-size:0.85rem;\">© Eqology — Strona partnera</p>"
    }
  ]'::jsonb
);
