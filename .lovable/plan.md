## Cel

Zamienić obecny edytor V2 (formularze z zakładkami) na profesjonalny edytor typu "kliknij element → edytuj obok". Podgląd na żywo staje się interaktywnym canvasem, a każdy element (tekst, nagłówek, obraz, wideo, ikona, przycisk, karta, statystyka, logo, avatar) po kliknięciu otwiera dedykowany panel edycji po prawej stronie z pełną kontrolą treści i stylu.

## Zakres (tylko `/admin/homepage` + LandingV2)

Nie ruszam żadnej innej części aplikacji. Zmiany dotyczą wyłącznie:
- `src/pages/admin/HomepageEditor.tsx` (przebudowa layoutu)
- `src/components/landing-v2/LandingV2.tsx` (dodanie trybu `editable` z data-attrybutami do klikania)
- nowy folder `src/components/landing-v2/editor/` (panele inspektorów)

Publiczna strona (dla niezalogowanych) pozostaje bez zmian wizualnych.

## Nowy układ ekranu edytora

```text
┌─────────────────────────────────────────────────────────────┐
│  Toolbar: [V1/V2 aktywna] [Zapisz draft] [Publikuj] [Cofnij]│
├──────────────────────────────────┬──────────────────────────┤
│                                  │                          │
│   CANVAS (LandingV2 editable)    │   INSPEKTOR              │
│   - klikalne elementy            │   - kontekstowy panel    │
│   - hover = outline              │   - Treść / Styl / Układ │
│   - selected = ring + toolbar    │                          │
│                                  │                          │
└──────────────────────────────────┴──────────────────────────┘
```

Lewa strona (~65%) = interaktywny podgląd draftu. Prawa strona (~35%) = inspektor dopasowany do zaznaczonego elementu.

## Model interakcji

1. Każdy edytowalny węzeł w `LandingV2` w trybie `editable` dostaje `data-edit-path` (np. `hero.titleLine1`, `features.items[0].title`, `stats.items[2].icon`).
2. Kliknięcie elementu: `setSelectedPath(path)` + scroll inspektora do właściwej sekcji.
3. Hover: subtelny outline + etykieta z typem elementu ("Nagłówek", "Obraz", "Ikona", "Karta").
4. Dla list (karty, statystyki, avatary, logo) w hover pojawiają się mikro-akcje: ⬆ ⬇ 🗑 ➕.
5. Zmiany zapisują się do `draft_content` z debounce 600 ms i widać je natychmiast w podglądzie.

## Inspektory (typy edytorów)

Każdy typ pola dostaje dedykowany inspektor:

- **Tekst / Nagłówek**: textarea + rozmiar (sm/md/lg/xl/2xl…), waga (300–800), kolor (paleta + custom hex), wyrównanie, transform (UPPER/none), letter-spacing, line-height.
- **Rich text (opis)**: textarea z podglądem, bold/italic markdown.
- **Obraz**: upload do `cms-images` + wybór z biblioteki + URL, alt, dopasowanie (cover/contain), pozycja, ramka, promień rogu, cień.
- **Wideo**: URL/upload, plakat (poster), autoplay/mute/loop, wysokość, promień rogu.
- **Ikona (Lucide)**: wyszukiwarka po nazwie z podglądem siatki ikon, rozmiar, kolor, tło, kształt (kwadrat/koło).
- **Przycisk / CTA**: label, URL, wariant (primary/secondary/ghost), kolor tła, kolor tekstu, rozmiar, ikona przed/po, promień rogu.
- **Karta (feature/stat)**: te same kontrolki + tło karty, obramowanie, cień, padding.
- **Sekcja**: tło (kolor/gradient/obraz), padding góra/dół, maksymalna szerokość, wyśrodkowanie.
- **Lista (avatary, logo, karty, statystyki, punkty)**: reorder drag & drop, dodaj, usuń, duplikuj.
- **SEO**: title + description (jak dziś).

Wszystkie style zapisywane są w rozszerzonym `HomepageV2Content` jako opcjonalne pole `style?: {...}` na każdym edytowalnym węźle — brak `style` = użyj domyślnego wyglądu (kompatybilność wsteczna z obecnym contentem w bazie).

## Rozszerzenie typu treści

`src/types/homepageV2.ts` dostaje opcjonalne `style` per element:

```ts
interface TextStyle { size?: string; weight?: number; color?: string; align?: 'left'|'center'|'right'; transform?: 'upper'|'none'; tracking?: string; }
interface BoxStyle { bg?: string; padding?: string; radius?: string; shadow?: string; border?: string; }
interface IconStyle { size?: number; color?: string; bg?: string; shape?: 'square'|'circle'; }
// każdy tekst/karta/ikona/przycisk może mieć opcjonalne style: TextStyle | BoxStyle | IconStyle
```

Bez migracji DB — `content` to JSONB, więc dodatkowe pola po prostu się zapiszą. Publiczny `LandingV2` czyta styl jeśli jest, inaczej używa dotychczasowych klas Tailwind.

## Nowe pliki

- `src/components/landing-v2/editor/EditableCanvas.tsx` — renderuje `LandingV2` w trybie edycji z kontekstem `{selectedPath, hoveredPath, onSelect, onHover}`.
- `src/components/landing-v2/editor/Inspector.tsx` — router inspektorów po typie zaznaczonego pola.
- `src/components/landing-v2/editor/inputs/` — reużywalne kontrolki: `TextInput`, `ColorPicker`, `IconPicker` (Lucide search), `ImagePicker`, `NumberSlider`, `SelectPill`, `ListReorder`.
- `src/components/landing-v2/editor/schema.ts` — mapowanie ścieżek na typ inspektora (`text | heading | image | video | icon | button | card | stat | avatar | logo | section | seo`).

## Zmiany w istniejących plikach

- `HomepageEditor.tsx`: usunięcie zakładek Hero/Karty/Statystyki/…, wstawienie 2-kolumnowego layoutu canvas + inspector. Zachowuję logikę `useHomepageV2Content`, draft/publish, przełącznik V1/V2 i toolbar na górze.
- `LandingV2.tsx`: dodaję opcjonalny prop `editable?: boolean` i (przez context) rejestrowanie `data-edit-path` + `onClick`. W trybie publicznym zero zmian wizualnych ani interakcji.
- `types/homepageV2.ts`: dodaję opcjonalne pola `style` (bez łamania obecnych danych).

## Zachowanie kompatybilności

- Publiczna strona `/` (niezalogowani) renderuje ten sam `LandingV2` bez propa `editable` — wygląd bez zmian.
- Obecny content w `homepage_v2_content` działa bez migracji (nowe pola są opcjonalne).
- Przełącznik V1/V2 i publikacja draftu bez zmian.

## Kryteria akceptacji

- Wchodzę na `/admin/homepage`, widzę stronę 1:1 jak publiczna + hover outline na elementach.
- Klik w dowolny tekst/obraz/ikonę/przycisk otwiera po prawej właściwy inspektor.
- Mogę zmienić treść, kolor, rozmiar, ikonę, obraz, kolejność kart, dodać/usunąć element — zmiana widoczna natychmiast w podglądzie, zapisana jako draft.
- „Publikuj" nadpisuje `content` treścią draftu, publiczna strona natychmiast się aktualizuje.
- Żadna inna część aplikacji się nie zmienia.
