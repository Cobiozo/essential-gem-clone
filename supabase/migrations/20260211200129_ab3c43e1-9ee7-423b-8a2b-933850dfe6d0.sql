
UPDATE public.partner_page_template
SET template_data = '[
  {
    "id": "hero_banner",
    "type": "static",
    "position": 0,
    "content": "<h1 style=\"font-size:1.8rem;font-weight:800;text-transform:uppercase;line-height:1.2;margin-bottom:1rem;\">ZMIENIAMY ZDROWIE I ŻYCIE LUDZI NA LEPSZE</h1>"
  },
  {
    "id": "partner_title",
    "type": "editable_text",
    "position": 1,
    "label": "Tytuł partnera",
    "content": "Independent Business Partner"
  },
  {
    "id": "welcome_section",
    "type": "static",
    "position": 2,
    "content": "<h2 style=\"font-size:1.4rem;font-weight:700;font-style:italic;margin-bottom:1rem;\">Witaj w swojej podróży po zdrowie!</h2><p>Cieszę się, że interesujesz się zdrowiem i szukasz rozwiązań, które realnie wspierają Twoje ciało i umysł. Świadome dbanie o siebie to nie trend – to wybór, który zmienia jakość życia.</p><p>Wierzymy, że najlepszym prezentem, jaki możesz dać sobie i swoim bliskim, jest zdrowsza wersja Ciebie – silna, odporna i pełna energii. Dlatego przedstawiamy Ci oleje Omega-3 Eqology – produkty klasy klinicznej, stworzone z myślą o ludziach, którzy nie uznają kompromisów w trosce o zdrowie.</p><p>Obejrzyj poniższe materiały, aby uzyskać więcej informacji. Te kilkanaście minut może wpłynąć na poprawę Twojego zdrowia i życia. Jeśli chcesz zadbać o siebie mądrze – jesteś w dobrym miejscu.</p>"
  },
  {
    "id": "products_section",
    "type": "product_slot",
    "position": 3,
    "label": "Produkty"
  },
  {
    "id": "order_section",
    "type": "static",
    "position": 4,
    "display": "accordion",
    "title": "Zamówienie",
    "content": "<p style=\"color:#c0392b;\">Jeśli chcesz zamówić najwyższej jakości oleje z kwasami omega-3 marki Eqology, skontaktuj się z osobą, która udostępniła Ci ten materiał po link do założenia darmowego konta klienta i złożenia zamówienia również pomoże Ci przejść cały proces i dobrać odpowiednią suplementację.</p><hr/><p>Dodatkowo otrzymasz od niej prezent: e-book o wartościowej zawartości – 21 stron rzetelnej wiedzy o kwasach omega-3, opartej na badaniach naukowych i odniesionej do wielu jednostek chorobowych. To praktyczny przewodnik, który pomoże Ci zrozumieć, dlaczego jakość i forma omega-3 naprawdę mają znaczenie.</p><hr/><p>Jeśli masz już link, załóż bezpłatne konto, złóż zamówienie i... pij na zdrowie – dla lepszego samopoczucia, odporności i długoterminowego wsparcia organizmu.</p><p><strong>👇 Obejrzyj poniżej instrukcję całego procesu krok po kroku</strong> – to proste i zajmie tylko chwilę.</p>"
  },
  {
    "id": "contact_section_static",
    "type": "static",
    "position": 5,
    "display": "accordion",
    "title": "Bądź z nami w kontakcie!",
    "content": "<p style=\"font-weight:700;text-align:center;\">Dołącz do naszej grupy na Facebooku<br/>\"Twoja omega-3\"</p><p style=\"color:#c0392b;text-align:center;font-size:0.85rem;\">kliknij w poniższy przycisk i dołącz</p>"
  },
  {
    "id": "about_heading",
    "type": "static",
    "position": 6,
    "content": "<h2>O mnie</h2>"
  },
  {
    "id": "partner_photo",
    "type": "editable_image",
    "position": 7,
    "label": "Zdjęcie partnera"
  },
  {
    "id": "partner_bio",
    "type": "editable_text",
    "position": 8,
    "label": "O sobie (bio)",
    "max_length": 1000
  },
  {
    "id": "contact_email",
    "type": "editable_text",
    "position": 9,
    "label": "Adres e-mail"
  },
  {
    "id": "contact_phone",
    "type": "editable_text",
    "position": 10,
    "label": "Numer telefonu"
  },
  {
    "id": "contact_facebook",
    "type": "editable_text",
    "position": 11,
    "label": "Link do Facebooka"
  },
  {
    "id": "footer_branding",
    "type": "static",
    "position": 12,
    "content": "<p style=\"font-style:italic;font-weight:600;\">w Eqology zmieniamy zdrowie i życie ludzi na lepsze</p><p>Pozdrawiamy</p><p style=\"font-weight:600;\">zespół Pure Life</p>"
  }
]'::jsonb
WHERE id = (SELECT id FROM public.partner_page_template LIMIT 1);
