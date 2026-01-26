
# Plan: Naprawa blokowania zajętych terminów w harmonogramie spotkań indywidualnych

## Zdiagnozowane problemy

### Problem 1: RLS blokuje sprawdzanie Google Calendar partnera
**Polityka RLS** na tabeli `user_google_tokens` pozwala użytkownikom widzieć tylko własne tokeny:
```sql
USING (auth.uid() = user_id)
```

Frontend próbuje sprawdzić czy partner ma token Google:
```typescript
// Linia 284-287 - to zapytanie ZAWSZE zwraca null dla innego użytkownika!
supabase
  .from('user_google_tokens')
  .select('id')
  .eq('user_id', partnerId) // partnerId ≠ auth.uid()
  .maybeSingle()
```

**Rezultat:** `tokenResult.data` = `null` → edge function `check-google-calendar-busy` nigdy nie jest wywoływana → zajęte sloty z Google Calendar NIE są blokowane.

### Problem 2: Spotkanie zespołu jest w Google Calendar, nie w PureLife
Użytkownik mówi że o 20:00 jest "spotkanie zespołu", ale w bazie danych nie ma żadnego wydarzenia typu `spotkanie_zespolu`. To wydarzenie jest tylko w Google Calendar lidera.

**Aktualny przepływ:**
```
Slot 19:00/20:00 → Check platformy (brak eventów) → Check Google (pominięty przez RLS) → Slot pokazany jako dostępny
```

**Oczekiwany przepływ:**
```
Slot 19:00/20:00 → Check platformy → Check Google Calendar (zawsze!) → Slot zablokowany
```

---

## Rozwiązanie

### Zmiana 1: Zawsze wywoływać edge function dla Google Calendar

Zamiast sprawdzać token partnera przez RLS-chronioną tabelę, **zawsze** wywołuj edge function `check-google-calendar-busy`. Edge function sama sprawdzi czy partner ma token (używa service role key).

| Aspekt | Przed | Po |
|--------|-------|-----|
| Sprawdzenie tokena | Frontend (blokowane RLS) | Edge function (service role) |
| Kiedy wywołana | Tylko gdy `tokenResult.data` | Zawsze |
| Fallback | Brak blokowania | `connected: false` z edge function |

### Zmiana 2: Poprawić porównanie stref czasowych dla isSlotBlockedByExistingMeeting

Aktualnie slot jest parsowany jako czas lokalny, ale meeting times są w UTC. To powoduje błędne porównania.

```typescript
// PRZED (błędne):
const slotStart = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());

// PO (poprawne):
const slotDateTime = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
const slotStart = fromZonedTime(slotDateTime, partnerTimezone);
const slotEnd = addMinutes(slotStart, slotDuration);
```

### Zmiana 3: Analogiczna poprawka dla blockedByPlatform

Ta sama poprawka stref czasowych dla blokowania przez eventy platformy (webinar, spotkanie_zespolu, etc.).

---

## Sekcja techniczna

### Plik: `src/components/events/PartnerMeetingBooking.tsx`

**Zmiana 1 - Usunięcie sprawdzania tokena przez RLS (linie 283-287):**

```typescript
// PRZED:
supabase
  .from('user_google_tokens')
  .select('id')
  .eq('user_id', partnerId)
  .maybeSingle(),

// PO - usunąć to zapytanie z Promise.all i zawsze wywoływać edge function
```

**Zmiana 2 - Sekcja Google Calendar (linie 357-392):**

```typescript
// PRZED:
if (tokenResult.data) {
  try {
    const { data: busyData } = await supabase.functions.invoke(...)
    ...
  }
}

// PO - Zawsze wywołuj edge function:
try {
  const { data: busyData } = await supabase.functions.invoke(
    'check-google-calendar-busy',
    { body: { leader_user_id: partnerId, date: dateStr } }
  );
  
  // Edge function zwraca connected: false jeśli partner nie ma tokena
  if (busyData?.connected && busyData?.busy && Array.isArray(busyData.busy)) {
    console.log('[PartnerMeetingBooking] Google Calendar busy slots:', busyData.busy);
    
    busyData.busy.forEach((busySlot: { start: string; end: string }) => {
      const busyStart = new Date(busySlot.start);
      const busyEnd = new Date(busySlot.end);
      
      allSlots.forEach(slotTime => {
        const slotDateTime = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
        const slotStartUTC = fromZonedTime(slotDateTime, partnerTimezone);
        const slotEndUTC = addMinutes(slotStartUTC, slotDuration);
        
        if (slotStartUTC < busyEnd && slotEndUTC > busyStart) {
          googleBusySlots.add(slotTime);
        }
      });
    });
    
    console.log('[PartnerMeetingBooking] Slots blocked by Google:', [...googleBusySlots]);
  } else if (busyData?.connected === false) {
    console.log('[PartnerMeetingBooking] Leader has no Google Calendar connected');
  }
} catch (error) {
  console.warn('[PartnerMeetingBooking] Google Calendar check failed:', error);
}
```

**Zmiana 3 - Poprawka isSlotBlockedByExistingMeeting (linie 328-339):**

```typescript
const isSlotBlockedByExistingMeeting = (slotTime: string): boolean => {
  // Convert slot time from leader's timezone to UTC for accurate comparison
  const slotDateTime = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const slotStart = fromZonedTime(slotDateTime, partnerTimezone);
  const slotEnd = addMinutes(slotStart, slotDuration);
  
  return bookedMeetings.some(meeting => {
    const meetingStart = new Date(meeting.start_time);
    const meetingEnd = new Date(meeting.end_time);
    
    // Both times are now in UTC
    return slotStart < meetingEnd && slotEnd > meetingStart;
  });
};
```

**Zmiana 4 - Poprawka blockedByPlatform (linie 341-355):**

```typescript
const blockedByPlatform = new Set<string>();
blockingResult.data?.forEach(event => {
  const eventStart = new Date(event.start_time);
  const eventEnd = new Date(event.end_time);
  
  allSlots.forEach(slotTime => {
    // Convert slot time from leader's timezone to UTC
    const slotDateTime = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const slotStart = fromZonedTime(slotDateTime, partnerTimezone);
    const slotEnd = addMinutes(slotStart, slotDuration);
    
    // Both times are now in UTC
    if (slotStart < eventEnd && slotEnd > eventStart) {
      blockedByPlatform.add(slotTime);
    }
  });
});
```

---

## Podsumowanie zmian

| Plik | Zmiana | Cel |
|------|--------|-----|
| `PartnerMeetingBooking.tsx` | Usunięcie sprawdzania tokena przez RLS | Ominięcie blokady RLS |
| `PartnerMeetingBooking.tsx` | Zawsze wywołuj edge function | Sprawdzanie Google Calendar |
| `PartnerMeetingBooking.tsx` | fromZonedTime w isSlotBlockedByExistingMeeting | Poprawne porównanie UTC |
| `PartnerMeetingBooking.tsx` | fromZonedTime w blockedByPlatform | Poprawne porównanie UTC |

---

## Efekt po wdrożeniu

**Przed:**
- Sloty zajęte w Google Calendar są pokazywane jako dostępne (RLS blokuje sprawdzenie)
- Porównanie stref czasowych jest błędne

**Po:**
- Google Calendar jest zawsze sprawdzany przez edge function
- Wszystkie zajęte sloty (Google + platforma) są poprawnie blokowane
- Spójne porównanie w UTC dla wszystkich źródeł

---

## Instrukcja dla Dawida Kowalczyka

Po wdrożeniu poprawek:
1. Sloty zajęte w Google Calendar (np. 16:00-22:00) będą automatycznie ukryte
2. Nie trzeba nic robić - system będzie działał poprawnie
3. Jeśli Google Calendar nie jest połączony, sloty będą pokazywane ale bez blokowania (oczekiwane zachowanie)
