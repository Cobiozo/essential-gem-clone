## Problem

Obecny "Podgląd na żywo" renderuje `<NewsHubBanner embedded />` w wąskiej kolumnie (~640 px). Realna strona `/aktualnosci` renderuje baner w kontenerze `max-w-7xl` (do 1280 px) wraz z paskiem filtrów, listą bento i archiwum z prawej. Dlatego proporcje obrazu, kadr `background-position`, wysokość względem szerokości i otoczenie wyglądają inaczej — użytkownik widzi mocno "zoomowany" wycinek tła, którego nie zobaczy na produkcji.

## Rozwiązanie

Zamienić podgląd na 1:1 mock realnej strony `/aktualnosci`, renderowany w stałej szerokości referencyjnej **1280 px**, a następnie skalowany CSS-em (`transform: scale`) do szerokości lewej kolumny edytora. Dzięki temu kadr, proporcje i sąsiedztwo banera są identyczne jak na produkcji, niezależnie od szerokości panelu admina.

### Zakres zmian

**1) `src/components/news-hub/NewsHubBanner.tsx`**
- Usuwam tryb `embedded` (lub zostawiam jako alias) — komponent zawsze renderuje pełny `Wrapper` jak na realnej stronie.

**2) `src/components/admin/news-hub/NewsHubBannerEditor.tsx` (lewa kolumna)**
- Nowy komponent podglądu: kontener o szerokości `1280px` (taki sam kontekst jak realna strona), zawierający:
  - `<NewsHubBanner config={local} />` (bez `embedded`, czyli z `container max-w-7xl mx-auto px-4 pt-6 pb-6`),
  - poniżej krótki, pasywny mock realnego układu: pasek filtrów (kategorie + wyszukiwarka + układ) oraz dwukolumnowa siatka `[1fr_280px]` z 3 placeholderami `BentoCard` po lewej i sekcją "Archiwum" po prawej — wszystko tylko do prezentacji proporcji.
- Skalowanie: wrapper `style={{ width: 1280, transform: 'scale(var(--s))', transformOrigin: 'top left' }}` w kontenerze, który mierzy własną szerokość `ResizeObserver`-em i ustawia `--s = containerWidth / 1280`. Wysokość kontenera ustawiana proporcjonalnie (`scaledHeight = naturalHeight * s`), więc nie powstają puste przestrzenie.
- Pasek nagłówka karty ("Podgląd na żywo") bez zmian; treść w `CardContent` zastąpiona skalowanym mockiem.
- Sticky podglądu zostaje (`lg:sticky lg:top-4`).

**3) Brak zmian** w `NewsHubPage.tsx`, hooku `useNewsHubBanner`, schemacie DB, ani w prawej kolumnie ustawień.

### Efekt

Podgląd po lewej wygląda dokładnie tak, jak `/aktualnosci`: ten sam `container max-w-7xl`, te same proporcje banera, ten sam kadr obrazu przy `cover/contain/position`, te same odstępy i sąsiedztwo (filtry + lista + archiwum). Zmiana wysokości / pozycji / dopasowania w prawej kolumnie odzwierciedla się 1:1.

### Pliki

- edited: `src/components/news-hub/NewsHubBanner.tsx`
- edited: `src/components/admin/news-hub/NewsHubBannerEditor.tsx`
