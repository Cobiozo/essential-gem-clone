

# Plan: Wyrazistsze cieniowanie kolumn weekendowych (Sb, Nd)

## Zmiana

### `src/components/dashboard/widgets/CalendarWidget.tsx`

1. **Nagłówki weekendowe** (linie 366-370): Dodać ciemniejsze tło do nagłówków Sb/Nd (`bg-muted/50 dark:bg-muted/40 rounded-md`)

2. **Komórki dni** (linie 389-421): Dodać warunek `isWeekend` na podstawie `getAdjustedDayOfWeek(day) >= 5` i aplikować tło `bg-muted/20 dark:bg-muted/15` jako bazowe cieniowanie kolumny weekendowej (niezależne od tego czy dzień ma wydarzenia)

3. **Puste komórki offsetu** (linie 373-374): Dodać cieniowanie do pustych komórek które wypadają w kolumnach Sb/Nd

Efekt: pionowe pasy cieniowania na kolumnach Sb i Nd, widoczne zarówno w light jak i dark mode.

### Plik do edycji:
- `src/components/dashboard/widgets/CalendarWidget.tsx`

