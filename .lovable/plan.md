

# Fix: Auto-webinar z 09.03 wyświetla się w "Moje spotkania"

## Problem
Auto-webinary mają `end_time = 2035-12-31` (celowo — działają codziennie). Filtr w `MyMeetingsWidget` (linia 116-128) przepuszcza je zawsze, bo `endTime > now` jest zawsze prawdziwe. W efekcie "Szansa Biznesowa" (utworzona 09.03) pojawia się na stałe w widgecie.

Auto-webinary to nie klasyczne wydarzenia z jednym terminem — to codzienne sesje symulujące live. Nie powinny pojawiać się w "Moje spotkania" jak zwykłe webinary.

## Rozwiązanie
Wykluczyć wydarzenia typu `auto_webinar` z widgetu "Moje spotkania". Auto-webinary mają własne dedykowane pokoje i trasy (`/auto-webinar/business`, `/auto-webinar/health`) — nie potrzebują obecności w liście spotkań na dashboardzie.

### Zmiana w `src/components/dashboard/widgets/MyMeetingsWidget.tsx`
- W `userEvents` (linia 47-51): dodać filtr wykluczający `event_type === 'auto_webinar'`

```typescript
const userEvents = useMemo(() => {
  if (!sharedEvents) return [];
  const expanded = expandEventsForCalendar(sharedEvents);
  return expanded.filter(e => e.is_registered && e.event_type !== 'auto_webinar');
}, [sharedEvents]);
```

### Zmiana w `src/components/dashboard/widgets/CalendarWidget.tsx`
- Analogicznie wykluczyć auto-webinary z kalendarza, żeby nie pojawiały się jako wpisy z datą 09.03

| Plik | Zmiana |
|------|--------|
| `MyMeetingsWidget.tsx` | Filtr `event_type !== 'auto_webinar'` w `userEvents` |
| `CalendarWidget.tsx` | Filtr `event_type !== 'auto_webinar'` w `expandedEvents` |

