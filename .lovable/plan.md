## Cel

Dodać dwa kolejne wzorcowe artykuły w News Hub, analogiczne do „Pure Life Team", demonstrujące pełen zestaw bloków edytora:

1. **„Network Marketing — przewodnik po MLM"** (slug: `network-marketing`)
2. **„Eqology — norweska firma zdrowia"** (slug: `eqology`)

Oba opublikowane, w kategorii „Ogłoszenia" (lub innej dostępnej), z pełnym zestawem 17 bloków (heading H1/H2/H3, paragraph, callout info/success/warning, image, columns, gallery 4 zdjęć, table, divider, video YouTube, file_download, button_cta, embed iframe, legacy_html).

## Zakres

### Artykuł 1 — Network Marketing
- Tytuł, slug, lead, tagi: `mlm, network marketing, biznes, sprzedaż, rozwój`
- bento_size `m`, opublikowany, nie przypięty
- Hero 1600×896 + 4 galerii 1024×1024 (premium imagegen)
- Treść: definicja MLM, historia, jak działa plan kompensacyjny, plusy/minusy, na co uważać, CTA do rejestracji
- style_overrides: tytuł duży, lead w kolorze brand, gradient strony

### Artykuł 2 — Eqology
- Tytuł, slug, lead, tagi: `eqology, norwegia, omega3, suplementy, zdrowie`
- bento_size `l`, opublikowany, nie przypięty
- Hero 1600×896 + 4 galerii 1024×1024 (produkty/laboratorium/fiordy/zespół)
- Treść: o firmie, korzenie norweskie, flagowe produkty Pure Arctic Oil / EQ Pure Arctic Krill, jakość/certyfikaty, badanie krwi Zinzino BalanceTest, model sprzedaży, CTA
- style_overrides: tytuł 48/800 biały, lead 20/akcent norweski (#2d8a9e), cover 480px, gradient strony

## Jak technicznie

1. Wygenerować 10 obrazów (`imagegen`, premium dla hero) do `public/news-hub-demo/`:
   - `network-marketing-hero.jpg`, `network-marketing-g1..g4.jpg`
   - `eqology-hero.jpg`, `eqology-g1..g4.jpg`
2. Jedna migracja SQL z dwoma `INSERT ... ON CONFLICT (slug) DO UPDATE` do `public.news_hub_posts` z pełnym `content_blocks` (JSONB, 17 bloków każdy), `style_overrides`, `tags`, kategorią subquery.
3. Weryfikacja: otwarcie `/aktualnosci/network-marketing` i `/aktualnosci/eqology`.

## Czego nie zmieniamy

- Żadnego kodu edytora/renderera ani kategorii.
- Tylko dwa nowe rekordy i 10 plików okładek/galerii.

## Artefakty

- Migracja: `supabase/migrations/<ts>_seed_network_marketing_eqology.sql`
- Obrazy w `public/news-hub-demo/`
- Linki: `/aktualnosci/network-marketing`, `/aktualnosci/eqology`
