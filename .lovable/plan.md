

# Rozbudowa sekcji Timeline zgodnie ze screenem (szablon Eqology)

## Co widać na screenie
- Ciemne tło (dark green ~#0a1628)
- Nagłówek bold + tekst opisowy (subtitle) pod nagłówkiem
- 5 kamieni milowych w jednym rzędzie połączonych linią
- Kółka: zielone (highlighted) lub ciemnoszare z obramowaniem, z numerem lub ikoną
- Wyróżniony kamień (highlight) ma złoty/żółty kolor tekstu miesiąca
- Linia łącząca przechodzi przez środek kółek

## Zmiany

### 1. `TimelineSection.tsx` — rozbudowa renderowania
- Dodać obsługę pola `subtitle` (tekst pod nagłówkiem)
- Dodać obsługę `bg_color` i `text_color` dla sekcji (ciemne tło)
- Zmienić grid z sztywnego `md:grid-cols-4` na dynamiczny w zależności od liczby milestones (do 6 kolumn)
- Poprawić styl linii łączącej — linia na środku kółek (top-7 zamiast top-8)
- Wyróżniony kamień: tekst miesiąca w kolorze żółtym/złotym (`text-yellow-400`)
- Kółka: numer wewnątrz zamiast tylko emoji (obsługa `m.icon` jako tekst/numer)

### 2. `TimelineSectionEditor.tsx` — dodanie pól edycji
- Dodać pole `subtitle` (tekst opisowy)
- Dodać pola kolorów: `bg_color`, `text_color`, `line_color`, `highlight_text_color`

### 3. Szablon Eqology w bazie danych
- Dodanie sekcji timeline z odpowiednią konfiguracją (5 milestones) — to admin zrobi ręcznie przez edytor, ale komponent musi to obsługiwać

## Szczegóły techniczne

**TimelineSection** — dynamiczne kolumny:
```text
const colsClass = count <= 3 ? 'md:grid-cols-3' 
  : count === 4 ? 'md:grid-cols-4' 
  : count === 5 ? 'md:grid-cols-5' 
  : 'md:grid-cols-6';
```

**Nowe pola config**: `subtitle`, `bg_color`, `text_color`, `line_color`, `highlight_text_color`

| Plik | Zmiana |
|------|--------|
| `src/components/partner-page/sections/TimelineSection.tsx` | Subtitle, kolory tła/tekstu, dynamiczne kolumny, styl highlight |
| `src/components/admin/template-sections/TimelineSectionEditor.tsx` | Pola: subtitle, bg_color, text_color, line_color, highlight_text_color |

