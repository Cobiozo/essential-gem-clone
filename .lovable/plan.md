

# Zmiany w widżecie kalendarza i dialogu szczegółów

## Zakres
Dotyczy **tylko** webinarów i spotkań zespołu (`webinar`, `auto_webinar`, `meeting_public`, `team_training`). Spotkania indywidualne bez zmian.

## Zmiana 1: CalendarWidget — usunięcie "Wypisz się" dla grupowych
**Plik:** `src/components/dashboard/widgets/CalendarWidget.tsx`

Linie 291-315: bloki `isExternalPlatform` + "Normalne wydarzenie" dla zarejestrowanych — dodać warunek:
- Jeśli typ to grupowy (`webinar`, `auto_webinar`, `meeting_public`, `team_training`) → zwrócić Badge "Jesteś zapisany/a" (bez przycisku wypisz się)
- Jeśli inny typ → obecna logika bez zmian

## Zmiana 2: CalendarWidget — usunięcie flagi języka i przycisku "Zaproś" z listy pod kalendarzem
**Plik:** `src/components/dashboard/widgets/CalendarWidget.tsx`

Linie 539-554: blok z `InvitationLanguageSelect` i przyciskiem `UserPlus` — **usunąć** cały ten blok z widżetu kalendarza. Te opcje mają być widoczne wyłącznie na stronach `/events/webinars` i `/events/team-meetings`, nie w dashboardowym widżecie.

## Zmiana 3: EventDetailsDialog — ukrycie linku do spotkania dla grupowych
**Plik:** `src/components/events/EventDetailsDialog.tsx`

Dodać flagę:
```typescript
const isGroupEvent = ['webinar', 'auto_webinar', 'meeting_public', 'team_training'].includes(event.event_type);
```

- Linia 136 (`showMeetingLink`): dodać `&& !(isGroupEvent && event.is_registered)` — ukrycie linku w szczegółach dla zapisanych na webinar/spotkanie zespołu
- Linia 135 (`canJoin`): dodać `&& !isGroupEvent` — ukrycie przycisku "Dołącz do spotkania" dla grupowych (w dialogu z widżetu)
- Przycisk "Anuluj rezerwację" (linie 391-401): już ograniczony do `canCancel` które dotyczy wyłącznie spotkań indywidualnych — bez zmian

## Pliki do edycji
1. `src/components/dashboard/widgets/CalendarWidget.tsx`
2. `src/components/events/EventDetailsDialog.tsx`

