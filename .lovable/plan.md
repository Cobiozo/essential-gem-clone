

# Plan: Naprawa integracji Google Calendar - brak wykrywania zajętych terminów

## Diagnoza problemu

Lider (sebastiansnopek.eqology) ustawił dostępność na poniedziałek:
- **Konsultacje**: 17:00-18:00 (Europe/Prague)
- **Spotkania trójstronne**: 18:00-19:00 (Europe/Prague)

Dodał w Google Calendar termin zajętości 17:00-19:00, ale aplikacja nadal pokazuje te sloty jako dostępne.

### Analiza logów
Edge function `check-google-calendar-busy` zwraca:
```json
{"connected": true, "busy": []}
```

**Token Google jest aktywny** (google_email: sebastiansnopek.eqology@gmail.com), ale FreeBusy API zwraca **pustą listę zajętych terminów**.

### Możliwe przyczyny

| Przyczyna | Prawdopodobieństwo | Opis |
|-----------|-------------------|------|
| **Wydarzenie w innym kalendarzu** | Wysoka | FreeBusy sprawdza tylko kalendarz "primary". Jeśli lider ma wiele kalendarzy i utworzył wydarzenie w kalendarzu roboczym/osobnym, nie zostanie wykryte |
| **Błąd parsowania odpowiedzi** | Średnia | Google może zwracać klucz z adresem email zamiast "primary" |
| **Brak szczegółowych logów** | - | Nie logujemy pełnej odpowiedzi z Google API |

---

## Rozwiązanie

### Zmiana 1: Sprawdzanie wszystkich kalendarzy użytkownika

Zamiast sprawdzać tylko kalendarz `primary`, pobierzemy listę wszystkich kalendarzy użytkownika i sprawdzimy FreeBusy dla każdego z nich.

### Zmiana 2: Dodanie szczegółowego logowania

Logujemy pełną odpowiedź z Google API aby diagnozować przyszłe problemy.

### Zmiana 3: Lepsza obsługa kluczy odpowiedzi

Google może zwracać dane pod różnymi kluczami (np. `primary`, email lub calendar_id).

---

## Szczegóły implementacji

### Plik: `supabase/functions/check-google-calendar-busy/index.ts`

**Zmiany:**

1. Pobranie listy kalendarzy użytkownika przez CalendarList API
2. Sprawdzenie FreeBusy dla wszystkich kalendarzy (primary + dodatkowe)
3. Agregacja wyników z wszystkich kalendarzy
4. Szczegółowe logowanie odpowiedzi Google API

```typescript
// Przed wywołaniem FreeBusy API - pobierz listę kalendarzy
const calendarListResponse = await fetch(
  'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=owner',
  {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  }
);

const calendarList = await calendarListResponse.json();
const calendarIds = calendarList.items
  ?.filter(cal => cal.accessRole === 'owner' && !cal.deleted)
  ?.map(cal => ({ id: cal.id })) 
  || [{ id: 'primary' }];

console.log('[check-google-calendar-busy] Checking calendars:', calendarIds.map(c => c.id));

// FreeBusy dla wszystkich kalendarzy
const freeBusyResponse = await fetch(
  'https://www.googleapis.com/calendar/v3/freeBusy',
  {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: 'Europe/Warsaw',
      items: calendarIds, // Wszystkie kalendarze, nie tylko primary
    }),
  }
);

// Agreguj wyniki z wszystkich kalendarzy
const freeBusyData = await freeBusyResponse.json();
console.log('[check-google-calendar-busy] Full FreeBusy response:', JSON.stringify(freeBusyData));

let allBusySlots: BusySlot[] = [];
for (const calendarId of Object.keys(freeBusyData.calendars || {})) {
  const calendarBusy = freeBusyData.calendars[calendarId]?.busy || [];
  allBusySlots = [...allBusySlots, ...calendarBusy];
}

// Usuń duplikaty (nakładające się sloty)
const uniqueBusySlots = deduplicateBusySlots(allBusySlots);
```

---

## Plik do edycji

| Plik | Zmiana |
|------|--------|
| `supabase/functions/check-google-calendar-busy/index.ts` | Sprawdzanie wszystkich kalendarzy użytkownika, szczegółowe logowanie |

---

## Dodatkowe ulepszenia

### Funkcja deduplikacji nakładających się slotów

```typescript
function deduplicateBusySlots(slots: BusySlot[]): BusySlot[] {
  if (slots.length === 0) return [];
  
  // Sortuj po czasie rozpoczęcia
  const sorted = [...slots].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  
  const merged: BusySlot[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    
    if (new Date(current.start) <= new Date(last.end)) {
      // Nakładają się - rozszerz ostatni slot
      last.end = new Date(Math.max(
        new Date(last.end).getTime(),
        new Date(current.end).getTime()
      )).toISOString();
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}
```

---

## Oczekiwany efekt

1. Edge function pobiera listę wszystkich kalendarzy użytkownika
2. FreeBusy API sprawdza zajętość we wszystkich kalendarzach (nie tylko primary)
3. Wyniki są agregowane i deduplikowane
4. Logi pokazują pełną odpowiedź z Google API (do debugowania)
5. Sloty kolidujące z wydarzeniami w **dowolnym** kalendarzu Google są usuwane z dostępności

---

## Schemat działania po zmianach

```text
Użytkownik wybiera datę
        ↓
Edge function pobiera listę kalendarzy (CalendarList API)
        ↓
FreeBusy API dla wszystkich kalendarzy
        ↓
Agregacja zajętych terminów ze wszystkich kalendarzy
        ↓
Filtrowanie slotów w PartnerMeetingBooking
        ↓
Użytkownik widzi tylko faktycznie wolne terminy
```

