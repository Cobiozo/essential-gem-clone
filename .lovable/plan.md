## Cel

Stworzyć w bazie wzorcowy, opublikowany artykuł **„Pure Life Team"** w News Hub, który demonstruje wszystkie dostępne narzędzia edycji postu typu `article` — pełen zestaw bloków, styli, okładki i meta. Posłuży jako żywy przykład/szablon dla redaktorów.

## Zakres edycji – co zostanie ustawione

**Zakładka Treść (pola podstawowe):**
- Typ: `article` (Artykuł)
- Tytuł: `Pure Life Team`
- Slug: `pure-life-team`
- Kategoria: pierwsza dostępna „Ogłoszenia" (lub `null` jeśli brak)
- Krótki opis (lead): jednoakapitowy hook ~2 zdania
- Tagi: `zespół, misja, zdrowie, społeczność, rozwój`
- Rozmiar w siatce (bento_size): `l` (Duży)
- Przypięty: tak, Opublikowany: tak

**Zakładka Wygląd (style_overrides):**
- `title`: size 48, weight 800, color biały, align center
- `shortDescription`: size 20, color hsl(45 90% 70%), align center
- `cover`: fit cover, height 480, position center, overlay #000 z opacity 0.35
- `page`: maxWidth 1100, background gradient nawiązujący do brandu

**Zakładka Media:**
- `cover_url`: wygenerowany hero (Pure Life Team – ludzie + krople wody, premium)

**Zakładka Meta:**
- standardowe pola (slug, tagi) – już ustawione

**Treść (bloki) – pełna paleta 13 typów bloków:**

```text
1. heading        H1 "Pure Life Team" (center, kolor brand)
2. paragraph      Lead artykułu – bogaty HTML (bold, italic, link)
3. callout        variant=info, "Nasza misja" – wprowadzenie
4. heading        H2 "Czym jest Pure Life Team"
5. image          obraz zespołu, fit cover, caption, height 420
6. columns        2 kolumny 1-1: w lewej paragraph + heading H3, w prawej callout success
7. divider        thickness 2, kolor primary
8. heading        H2 "Nasze wartości"
9. gallery        4 zdjęcia, 3 kolumny (wartości / produkty / wydarzenia / spotkania)
10. table         header + 4 wiersze: Filar | Co dajemy | Efekt
11. callout       variant=warning, "Zanim dołączysz" – wymagania
12. video         YouTube embed (oficjalny film prezentacyjny – placeholder URL)
13. file_download plik PDF „Przewodnik Pure Life Team" (placeholder URL + size)
14. button_cta    "Dołącz do Pure Life Team" → /auth, variant=default, align=center
15. embed         prosty iframe (mapa lub formularz – placeholder)
16. legacy_html   blok zgodności – krótka stopka HTML
17. divider       cienki separator zamykający
```

Każdy blok dostanie świadomie ustawione `style` (mt, mb, paddingX/Y, radius, align, maxWidth) tak, by post wyglądał perfekcyjnie i jednocześnie pokazywał co potrafi każda kontrolka.

## Jak to zrobimy technicznie

1. **Wygenerujemy hero okładki** (`imagegen`, premium, 1600x900) i wgramy do storage `news-hub` (folder `covers/`) przez krótki skrypt używający Supabase service-role (z sekretu) — albo użyjemy publicznego URL z `src/assets` (publiczny CDN preview). Domyślnie: wgranie do bucketu `news-hub/covers/pure-life-team-cover.jpg`.
2. **Migracja SQL** wstawiająca jeden rekord do `public.news_hub_posts` z pełnym `content_blocks` (JSONB), `style_overrides` (JSONB), `media_metadata` (JSONB), `tags` (text[]), `is_pinned=true`, `is_published=true`, `bento_size='l'`, `category_id` wybranej dynamicznie (subquery po slug/name).
3. **Idempotencja**: migracja używa `ON CONFLICT (slug) DO UPDATE` aby ponowne uruchomienie nadpisało wzorzec.
4. Po wstawieniu – krótka weryfikacja: otwarcie `/aktualnosci/pure-life-team` w preview i zrzut ekranu.

## Czego NIE zmieniamy

- Żadnego kodu komponentów edytora / renderera bloków.
- Żadnych kategorii ani ustawień globalnych News Hub.
- Tylko jeden nowy rekord postu + jeden plik okładki w storage.

## Dostarczone artefakty

- Migracja: `supabase/migrations/<timestamp>_seed_pure_life_team_article.sql`
- Okładka: `news-hub/covers/pure-life-team-cover.jpg` (storage)
- Link do podglądu: `/aktualnosci/pure-life-team`
