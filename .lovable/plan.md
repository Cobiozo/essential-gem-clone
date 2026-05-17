## 1) Weryfikacja „Baza wiedzy"

Sprawdzone bezpośrednio w bazie `i18n_translations` (namespace `hk`):

| Język | pageTitle | subtitle |
|-------|-----------|----------|
| pl | Baza wiedzy | Materiały edukacyjne o zdrowiu i wellness |
| en | Knowledge Base | Educational materials on health and wellness |
| de | Wissensdatenbank | Bildungsmaterialien zu Gesundheit und Wellness |
| it | Base di conoscenza | Materiali educativi su salute e benessere |
| es | Base de conocimientos | Materiales educativos sobre salud y bienestar |
| fr | Base de connaissances | Matériel éducatif sur la santé et le bien-être |
| pt | Base de conhecimento | Materiais educacionais sobre saúde e bem-estar |
| no | Kunnskapsbase | Pedagogisk materiale om helse og velvære |

Klucze są obecne dla wszystkich 8 aktywnych języków. Po hard refresh (cache tłumaczeń ładuje się raz na sesję) `tf('hk.pageTitle', …)` zwróci wartość z DB zamiast wpadać w fallback "Tytuł strony". Weryfikacja po stronie kodu nie wymaga zmian.

## 2) Porządki w „Biblioteka" na mobile (`/knowledge`)

Na widoku 390 px obecny układ jest zbyt rozproszony:
- TabsList z dwoma głównymi zakładkami łamie się i ląduje obok osobnego TabsList „Zasoby zespołów" → wyglądają jak dwie nieskoordynowane belki.
- Karta filtrów: 4 niezależne `Select`, pasek widoku i flagi językowe wypełniają pełną wysokość ekranu zanim user dotrze do listy.
- Etykieta „Dokumenty w języku:" + 8 flag rozjeżdża się w 1–2 rzędach bez wyrównania.
- Brakuje spójnych odstępów: `mb-8`, `mb-6`, `pt-24` powodują dużą pustkę na górze.

### Zakres zmian (tylko `src/pages/KnowledgeCenter.tsx`, czysty UI)

1. **Nagłówek**
   - `pt-24` → `pt-20 sm:pt-24`, `mb-8` → `mb-4 sm:mb-8`.
   - `text-3xl` → `text-2xl sm:text-3xl`, podtytuł `text-sm sm:text-base`.

2. **Zakładki główne**
   - Połączyć w jeden `TabsList` z `w-full grid grid-cols-2` (a gdy widoczne „Zasoby zespołów" → `grid-cols-3`). Usunąć drugi osobny `TabsList`.
   - Trigger: `text-xs sm:text-sm`, ikona `h-4 w-4 shrink-0`, etykieta `truncate`. Badge zawijać tylko na ≥sm.

3. **Karta filtrów (Card)**
   - Mobile: `space-y-3` zamiast `gap-4` w rzędzie. Search w jednej linii, `Select`-y w 2-kolumnowej siatce `grid grid-cols-2 gap-2` (Kategoria/Typ obok siebie, Tag i przycisk Reset w drugim rzędzie).
   - Na ≥sm zachować obecny układ flex-row.

4. **Pasek widoku + flagi językowe**
   - Wyciągnąć poza Card filtrów do osobnego paska `flex flex-wrap items-center justify-between gap-2 mt-3`, mniejsze flagi (`w-5 h-5`), spójna wysokość przycisków (`h-7`).
   - Etykieta „Dokumenty w języku:" ukryta na mobile (`hidden sm:inline`), pozostawiona tylko jako tytuł sekcji w `sr-only`.
   - Flagi w pojedynczym rzędzie z `overflow-x-auto snap-x` żeby się nie łamały.

5. **Spacing kart wyników**
   - `space-y-6` w `TabsContent` → `space-y-4`.
   - Karta wyniku: na mobile `p-3`, ikona typu `h-9 w-9` w kontenerze `p-1.5`.

### Zakres bez zmian

- Logika filtrowania, stany, dane, RLS, tłumaczenia — bez zmian.
- Desktop (≥sm) wygląda jak dotychczas; modyfikacje aktywują się głównie na mobile.
- Pliki inne niż `src/pages/KnowledgeCenter.tsx` nie są ruszane.

### Weryfikacja po implementacji

- Otworzyć `/knowledge` przy 390×844, sprawdzić: jeden spójny pasek zakładek, filtry mieszczą się w karcie bez przewijania ponad listę, flagi w jednym rzędzie, pierwsza karta wyniku widoczna bez scrolla na poziomie zakładki.
- Otworzyć `/zdrowa-wiedza` po hard refresh, potwierdzić „Baza wiedzy" + nowy podtytuł.
