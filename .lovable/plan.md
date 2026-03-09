

# Fix: Wyświetlanie EventCardCompact na iPadzie — ucięty tekst i brak grafiki

## Problem

Na iPadzie sidebar jest otwarty (256px), zostawiając ~500px na treść. Nagłówek karty wydarzenia (`CollapsibleTrigger`, linia 611) wyświetla w jednym wierszu: miniaturkę (80px) + tytuł + datę/godzinę + badge statusu + chevron. Na tablecie to za dużo elementów w jednym rzędzie — tekst jest `truncate` (ucięty), a data/czas widoczna od `md:` (768px) zabiera dodatkowe miejsce.

## Rozwiązanie

### 1. `src/components/events/EventCardCompact.tsx` — nagłówek karty

**Zmiana breakpointu daty/czasu:** Przenieść widoczność daty z `md:flex` na `lg:flex` (1024px+). Na iPadzie (768-1023px z otwartym sidebarem) data będzie ukryta w nagłówku, ale widoczna po rozwinięciu karty (tak jak na mobile).

```
Linia 636: hidden md:flex → hidden lg:flex
```

**Zmiana truncate tytułu:** Zamienić `truncate` (jednoliniowe ucięcie) na `line-clamp-2` aby tytuł mógł zająć 2 linie zamiast być ucinany.

```
Linia 629: truncate → line-clamp-2
```

**Dodanie daty na tablet w rozwiniętej sekcji:** Zmienić `md:hidden` na `lg:hidden` w sekcji mobile date/time (linia 674), aby data była widoczna po rozwinięciu karty zarówno na mobile jak i tablecie.

```
Linia 674: md:hidden → lg:hidden
```

### 2. `src/components/events/EventCardCompact.tsx` — opis w rozwiniętej karcie

Sprawdzić i dodać `overflow-hidden break-words` do kontenera opisu, aby długi tekst HTML nie wychodził poza kartę.

### Pliki do edycji:
- `src/components/events/EventCardCompact.tsx` — 3 zmiany breakpointów + line-clamp

