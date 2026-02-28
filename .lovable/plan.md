
## Naprawa: status "Zakonczone" dla trwajacych webinarow + informacja o przedluzeniu

### Problem

W kalendarzu i w dialogu szczegolow, status wydarzenia jest okreslany wylacznie na podstawie zaplanowanego `end_time`:
- `isAfter(now, eventEnd)` -> "Zakonczone"

Jesli webinar z wewnetrzna integracja WebRTC trwa dluzej niz zaplanowano, system pokazuje "Zakonczone" mimo ze spotkanie nadal trwa (uczestnicy sa w pokoju). Brakuje tez informacji o tym, ze webinar przedluzyl sie i o ile.

### Rozwiazanie

Dla wydarzen z wewnetrzna integracja (`use_internal_meeting = true`), sprawdzac czy w pokoju (`meeting_room_id`) sa aktywni uczestnicy (`meeting_room_participants.is_active = true`). Jesli tak -- wydarzenie "Trwa" mimo przekroczenia `end_time`, z informacja o czasie przedluzenia.

### Zmiany

**Plik: `src/hooks/useMeetingRoomStatus.ts` (NOWY)**

Custom hook ktory dla listy `meeting_room_id` sprawdza czy sa aktywni uczestnicy:

```text
useMeetingRoomStatus(roomIds: string[])
-> activeRoomIds: Set<string>
```

- Pojedyncze zapytanie do `meeting_room_participants` z filtrem `is_active = true` i `room_id.in.(roomIds)`
- Subskrypcja Realtime na zmiany w tych pokojach (INSERT/UPDATE)
- Zwraca `Set<string>` z ID pokojow ktore maja aktywnych uczestnikow

**Plik: `src/components/dashboard/widgets/CalendarWidget.tsx`**

1. Uzyc `useMeetingRoomStatus` z listaa `meeting_room_id` ze wszystkich wydarzen z `use_internal_meeting = true`
2. W `getRegistrationButton` (linia 166): zmiana warunku "Zakonczone":
   - Jesli `use_internal_meeting` i pokoj jest aktywny -> NIE pokazuj "Zakonczone"
   - Zamiast tego pokaz "Trwa dluzej (+X min)" z informacja o czasie przedluzenia
   - Przycisk "WEJDZ" pozostaje aktywny
3. Jesli pokoj nie jest aktywny a `end_time` minal -> "Zakonczone" (bez zmian)

**Plik: `src/components/events/EventDetailsDialog.tsx`**

1. Przyjac nowy opcjonalny prop `activeRoomIds?: Set<string>`
2. Zmodyfikowac logike `isEnded` (linia 88):
   - Jesli `use_internal_meeting` i `meeting_room_id` jest w `activeRoomIds` -> `isEnded = false`
3. Dodac sekcje informacyjna gdy webinar trwa dluzej niz zaplanowano:
   - Badge "Trwa dluzej" zamiast "Zakonczone"
   - Tekst: "Wydarzenie przedluza sie o X minut" (roznica miedzy `now` a `end_time`)
4. Przycisk "Dolacz do spotkania" pozostaje aktywny w trybie overtime

### Logika overtime

```text
const scheduledEnd = new Date(event.end_time);
const now = new Date();
const isOvertime = now > scheduledEnd;
const isRoomActive = activeRoomIds.has(event.meeting_room_id);
const isStillRunning = event.use_internal_meeting && isRoomActive;

// Status:
if (isOvertime && isStillRunning) -> "Trwa dluzej (+Xmin)"
if (isOvertime && !isStillRunning) -> "Zakonczone"  
if (!isOvertime && isLive) -> "Trwa teraz"
```

### Obliczenie czasu przedluzenia

```text
const overtimeMinutes = Math.round((now.getTime() - scheduledEnd.getTime()) / (1000 * 60));
// Wyswietlenie: "+15 min" / "+1h 20min"
```

### Diagram

```text
end_time minal?
    |
  +---+---+
  |       |
 TAK     NIE -> normalna logika (Trwa teraz / Nadchodzace)
  |
  use_internal_meeting?
  |
  +---+---+
  |       |
 TAK     NIE -> "Zakonczone" (bez zmian)
  |
  Aktywni uczestnicy w pokoju?
  |
  +---+---+
  |       |
 TAK     NIE -> "Zakonczone"
  |
  "Trwa dluzej (+Xmin)"
  Przycisk WEJDZ aktywny
```

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/hooks/useMeetingRoomStatus.ts` | NOWY - hook sprawdzajacy aktywne pokoje |
| `src/components/dashboard/widgets/CalendarWidget.tsx` | Uzycie hooka + logika overtime w getRegistrationButton |
| `src/components/events/EventDetailsDialog.tsx` | Nowy prop activeRoomIds + logika overtime w statusie i badge |

### Ryzyko

Niskie. Hook wykonuje jedno zapytanie + subskrypcje Realtime. Logika overtime jest addytywna (dodaje nowy stan, nie zmienia istniejacych). Dla wydarzen bez wewnetrznej integracji zachowanie jest identyczne.
