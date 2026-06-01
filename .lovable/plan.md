## Problem

PDF biletu wysyłany mailem nie odpowiada temu, co pokazuje edytor szablonu (zakładka „Szablon"). Imię/Nazwisko/Numer biletu lądują w innych miejscach i mają inne rozmiary niż na podglądzie w edytorze.

## Diagnoza

Rozbieżności pochodzą z trzech miejsc:

1. **Skalowanie czcionek w edytorze** (`EventTicketTemplatePanel.tsx`):
   Edytor renderuje rozmiar fontu jako `cqh` (`(fontSize/height_px)*100cqh`), ale na płótnie nie ma ustawionego `container-type: size`. W efekcie przeglądarka traktuje `cqh` jak procent wysokości viewportu, a nie wysokości płótna — tekst w edytorze wygląda dużo większy (i w innej proporcji) niż w PDF.

2. **Etykieta vs realne dane**:
   W edytorze widać krótki napis „Imię"/„Nazwisko"/„Numer", a w PDF pojawia się rzeczywista wartość („Sebastian", „Snopek", kod 12 znaków). Inna długość = inne wrażenie pozycji, zwłaszcza przy `textAlign` innym niż `left`.

3. **Punkt zaczepienia tekstu**:
   - Edytor: div ma `px-1` (4 px paddingu poziomego) + `bg-background/40` — tekst startuje ~4 px na prawo od `x`.
   - PDF (`generate-event-ticket-pdf/index.ts`): tekst startuje dokładnie w `f.x * sx`, baseline obliczany jako `pageH - f.y*sy - fontSize` (góra glifu ≈ `f.y*sy`).
   
   Dodatkowo PDF skaluje font przez `Math.min(sx, sy)` zamiast `sy`, co przy nieidealnych proporcjach (np. gdy szerokość/wysokość płótna z bazy nieco różni się od tła) daje inny rozmiar niż edytor.

4. **Czcionka**: edytor używa systemowego sans-serif UI, PDF używa DejaVuSans — metryki znaków są inne, więc szerokość tekstu (a tym samym jego prawa krawędź przy `textAlign:right`/`center`) się rozjeżdża. Pełne 1:1 wymagałoby tej samej rodziny w przeglądarce.

## Plan zmian (1:1 WYSIWYG)

### A. Edytor — `src/components/admin/paid-events/editor/EventTicketTemplatePanel.tsx`

1. Na płótnie podglądowym (`canvasRef` div) ustawić CSS `containerType: 'size'`, żeby jednostki `cqh`/`cqw` rzeczywiście odnosiły się do wysokości płótna, nie viewportu.
2. Zmienić skalowanie fontu na `cqw` z bazą szerokości szablonu: `fontSize: ((f.fontSize || 14) / width_px) * 100 + 'cqw'` (px szablonu → % szerokości płótna), bo PDF używa `sx = pageW/tplW`. Dzięki temu wymiary i font skalują się względem tej samej osi.
3. Usunąć `px-1` i `bg-background/40` (pozostawić tylko zaznaczenie outlinem przy `selected`), żeby tekst zaczynał się dokładnie w `(x, y)`.
4. Zamiast etykiet (`FIELD_LABELS[f.key]`) wyświetlać tę samą wartość przykładową, której używa PDF w trybie `preview` (Jan, Kowalski, "PODGLĄD-XXXX", tytuł/data wydarzenia itd.). Dodać pomocniczy `SAMPLE_VALUES`.
5. Honorować `textAlign` i `width` pola: gdy pole ma `width` + `textAlign`, owinąć tekst w wewnętrzny div o tej szerokości i `text-align`.
6. (Opcjonalnie) dla pełnego WYSIWYG-u załadować w edytorze webfont DejaVu Sans (ten sam, którego używa PDF) i ustawić `font-family: 'DejaVu Sans'` na płótnie.

### B. Generator PDF — `supabase/functions/generate-event-ticket-pdf/index.ts`

1. W `renderTicket` zmienić obliczanie `fontSize` z `Math.min(sx, sy)` na `sx` (spójne z osią szerokości używaną w edytorze po zmianie z punktu A.2). Ponieważ przy tle PDF zachowuje proporcje płótna (`pageW=tplW*0.75`, `pageH=tplH*0.75`), `sx==sy==0.75` — bez tła obie wartości się rozjeżdżają, ale stosujemy konsekwentnie `sx` (tak samo skalowane jest `width` pola QR i `width` kontenera tekstu).
2. Wymusić, że gdy `template.background_url` jest ustawione, ignorujemy `page_format`/`orientation` i bierzemy proporcje płótna 1:1 (już tak działa — zostawić, ale dodać komentarz).
3. Tekst rysować z `xpt = f.x * sx` (bez paddingu) — spójne z edytorem po usunięciu `px-1`.
4. Pozycja Y: zmienić baseline tak, by „góra glifu" była dokładnie w `f.y * sy`. Aktualne `ypt = pageH - f.y*sy - fontSize` przybliża to OK, ale lepiej użyć `font.heightAtSize(fontSize, { descender: false })` jako wysokości cap-height i odjąć ją zamiast `fontSize`. To wyrówna pozycję pionową z górną krawędzią divu w edytorze.
5. Przy `textAlign: center|right` obliczać przesunięcie na podstawie `f.width * sx` i realnej szerokości tekstu w DejaVu (tak jest teraz — zostawić).

### C. Weryfikacja

1. Zapisać szablon w panelu admina, kliknąć „Podgląd PDF" — porównać z układem pól na płótnie.
2. Wymusić ponowne wysłanie biletu istniejącemu uczestnikowi (przycisk „Wyślij ponownie bilet" w panelu uczestników) i sprawdzić, że PDF z maila wygląda identycznie jak podgląd.
3. QA: wygenerować PDF dla pól z `textAlign: center` i `textAlign: right`, sprawdzić wyrównanie do krawędzi `width`.

## Czego nie zmieniam

- Treści maila, logiki SMTP, kodów QR, struktury bazy `event_ticket_templates`.
- Zachowania w trybie bez tła (A4/A5) — pozostaje letterboxing.
- Sample danych w trybie `preview` PDF — używamy ich również w edytorze, dzięki czemu podgląd po obu stronach pokazuje to samo.
