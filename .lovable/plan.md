## Cel

Umożliwić adminowi przypisanie osobnego linku Zoom dla każdego terminu w wydarzeniu wieloterminowym. Dla każdego terminu możliwy jest wybór: „użyj głównego linku wydarzenia" (domyślnie) lub własny link dla tego konkretnego terminu.

## Zmiany

### 1) Model danych (`src/types/occurrences.ts`)

Rozszerzyć `EventOccurrence` o opcjonalne pole:

```ts
export interface EventOccurrence {
  date: string;
  time: string;
  duration_minutes: number;
  zoom_link?: string | null;   // NEW: pusty/null = użyj głównego linku wydarzenia
}
```

Pole jest przechowywane w istniejącej kolumnie `events.occurrences` (JSONB) — **brak migracji DB**. Główny `events.zoom_link` pozostaje fallbackiem.

### 2) Edytor terminów (`src/components/admin/OccurrencesEditor.tsx`)

Dla każdego wiersza terminu dodać w rozwijanej sekcji „Link Zoom":

- Radio / toggle: **„Użyj głównego linku wydarzenia"** (default) vs **„Własny link dla tego terminu"**
- Gdy wybrano „Własny": pole tekstowe `Input type="url"` na link Zoom (walidacja podstawowa)
- Podpowiedź pod polem: jeśli główny link nie jest ustawiony i wybrano „główny" → subtelny hint „Główny link wydarzenia jest pusty"
- Aktualizacja przez `onChange` całej tablicy occurrences (analogicznie do istniejącego kodu)

Formularz dodawania nowego terminu też dostaje opcjonalne pole „Link Zoom (opcjonalnie)".

### 3) Consumer linku — logika wyboru

Wszędzie, gdzie renderowany jest przycisk „Dołącz" dla wydarzenia wieloterminowego z konkretną instancją terminu (`ExpandedOccurrence`), wybieramy link według reguły:

```
occurrence.zoom_link?.trim() || event.zoom_link
```

Miejsca do zaktualizowania (tylko multi-occurrence, single-event nie zmieniamy):
- `src/components/events/EventCard.tsx`
- `src/components/events/EventCardCompact.tsx`
- `src/components/events/EventDetailsDialog.tsx`
- `src/components/events/UpcomingMeetings.tsx`
- `src/components/dashboard/widgets/MyMeetingsWidget.tsx`
- `src/components/dashboard/widgets/CalendarWidget.tsx`

Dodać helper w `src/hooks/useOccurrences.ts`:

```ts
export const getOccurrenceJoinLink = (
  event: { zoom_link?: string | null },
  occurrence?: { zoom_link?: string | null } | null
): string | null =>
  (occurrence?.zoom_link?.trim() || event.zoom_link || null);
```

i użyć go w powyższych komponentach zamiast bezpośredniego `event.zoom_link`.

### 4) Zapis w formularzach

W `TeamTrainingForm.tsx` i `WebinarForm.tsx` — brak zmian logiki zapisu; `occurrences` już zapisuje pełną tablicę przez `JSON.parse(JSON.stringify(occurrences))`, więc nowe pole `zoom_link` na obiekt terminu zostanie zapisane automatycznie do JSONB.

### 5) Kompatybilność wsteczna

- Istniejące terminy bez `zoom_link` → traktowane jak „użyj głównego" (fallback).
- `useAutoWebinar`/`use_internal_meeting` nietknięte — pole per-occurrence ignorowane, gdy `use_internal_meeting = true`.

## Pliki do zmiany

- `src/types/occurrences.ts` — dodać opcjonalne `zoom_link`
- `src/components/admin/OccurrencesEditor.tsx` — UI wyboru linku per termin
- `src/hooks/useOccurrences.ts` — helper `getOccurrenceJoinLink`
- 6 komponentów-konsumentów (lista wyżej) — użycie helpera dla multi-occurrence

Brak migracji DB, brak zmian w edge functions.
