
# Naprawa widgetu "Moje spotkania" - brak wyswietlania zapisanych wydarzen

## Zidentyfikowany problem

Widget "Moje spotkania" otrzymuje **nierozwiniete** wydarzenia (base events) z Dashboard, podczas gdy CalendarWidget je rozwija za pomoca `expandEventsForCalendar`. To powoduje dwa problemy:

1. **Dla wydarzen cyklicznych (multi-occurrence)**: base event ma `start_time`/`end_time` pierwszego terminu, ktory moze byc w przeszlosci. Filtr `new Date(e.end_time) > new Date()` odrzuca takie wydarzenie, mimo ze uzytkownik jest zapisany na przyszly termin.

2. **Bledny status `is_registered`**: base event dostaje `is_registered: true` jezeli uzytkownik jest zapisany na **jakikolwiek** termin (Set eventIds). Ale nie rozroznia, na ktory konkretny termin. Natomiast `expandEventsForCalendar` sprawdza per-occurrence: `"event_id:occurrence_index"`.

## Przyklad problemu

- Wydarzenie "O!Mega Chill" ma terminy: 21.02, 25.02, 26.02
- Base event `end_time` = 21.02 11:00 (pierwszy termin)
- Uzytkownik zapisuje sie na termin 25.02 (occurrence_index=1)
- MyMeetingsWidget: `end_time (21.02 11:00) > now (21.02 15:00)` = FALSE -> **wydarzenie nie pojawia sie**

## Rozwiazanie

Uzyc `expandEventsForCalendar` w MyMeetingsWidget do rozwinecia wydarzen cyklicznych - identycznie jak CalendarWidget. Dzieki temu kazdy termin bedzie mial wlasciwy `start_time`, `end_time` i `is_registered`.

## Plik do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/dashboard/widgets/MyMeetingsWidget.tsx` | Import `expandEventsForCalendar`, rozwinac wydarzenia przed filtrowaniem `is_registered` |

## Szczegoly techniczne

W `MyMeetingsWidget.tsx`:

1. Dodac import:
```typescript
import { expandEventsForCalendar } from '@/hooks/useOccurrences';
```

2. Zmienic `userEvents` useMemo (linia 40-43):
```typescript
const userEvents = useMemo(() => {
  if (!sharedEvents) return [];
  // Expand multi-occurrence events so each occurrence has correct
  // start_time, end_time, and per-occurrence is_registered
  const expanded = expandEventsForCalendar(sharedEvents);
  return expanded.filter(e => e.is_registered);
}, [sharedEvents]);
```

To zapewni ze:
- Kazdy termin cykliczny bedzie osobnym wpisem z prawidlowymi datami
- Filtr `is_registered` sprawdzi per-occurrence (klucz `event_id:occurrence_index`)
- Filtr `end_time > now` bedzie pracowal na prawidlowych datach terminow
- Po zapisaniu/wypisaniu sie widget natychmiast pokaze/ukryje termin
