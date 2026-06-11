## Cel
Poprawić czytelność widoku "Struktura całej platformy" w panelu admina na urządzeniach mobilnych (≤640px). Desktop pozostaje bez zmian.

## Zmiany w `src/components/admin/PlatformStructureView.tsx`

### 1. Pasek akcji (Top bar)
- Pole wyszukiwania na pełną szerokość w pierwszym wierszu, czcionka `text-base` (zapobiega zoom-in w iOS Safari).
- Drugi wiersz: dwa rzędy przycisków w gridzie:
  - `grid grid-cols-2 sm:flex sm:flex-wrap` dla Odśwież / Rozwiń wszystko
  - `grid grid-cols-3 sm:flex` dla Excel / Word / HTML (równe szerokości, krótsze etykiety na xs, ikona + tekst)
- Usunąć pionowy separator na mobile (`hidden sm:block`).

### 2. Podsumowanie (summary chips)
- Kompaktowe: `text-[11px]`, `h-5`, `px-1.5`.
- Wymusić układ poziomy ze zwijaniem (`flex-wrap`) i mniejsze odstępy `gap-1`.

### 3. Drzewo (renderNode)
Główny problem: nazwa + role + EQ ID + (n)Σ łamią się brzydko i obcinają.
Refaktor wiersza węzła na **dwurzędowy layout na mobile**:
- Rząd 1: chevron + ikona admin + **nazwa (truncate, flex-1)** + licznik `(n) Σn` po prawej.
- Rząd 2: role badges + EQ ID chip + status "Zablok." — zawijane (`flex-wrap`).
- Na `sm:` wszystko wraca do jednego rzędu (jak teraz).

Dodatkowo:
- Zwiększyć tap target chevrona do `w-6 h-6` (łatwiejsze trafienie palcem).
- Wcięcie poziomu zmniejszyć na mobile: `ml-1 pl-1.5` zamiast `ml-2 pl-2`.
- E-mail/telefon w rozwiniętym wierszu: `break-all` na email, `flex-col sm:flex-row` żeby nie cięło tekstu.

### 4. Karty (Card padding)
- `p-2 sm:p-3` na kartach (więcej miejsca na treść).

### 5. EQ ID chip
- `whitespace-nowrap` żeby długie ID nie łamały się na dwie linie (jak na screenie "121229225" → "12122922" + "5").

## Bez zmian
- Logika, dane, eksporty, RPC, RLS, hooki, routing.
- Wygląd desktopowy (breakpoint `sm:` przywraca obecny layout).

## Weryfikacja
- Podgląd mobile 390px: nazwy czytelne, badges nie nachodzą, EQ ID w jednej linii, przyciski eksportu równej szerokości.
- Podgląd desktop ≥640px: bez zmian względem obecnego stanu.
