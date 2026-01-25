
# Plan: Udoskonalenie harmonogramu spotkań indywidualnych

## Podsumowanie wymagań

1. **Elastyczny czas trwania** - partner-prowadzący może ustawić dowolny czas (15, 30, 60 minut) dla każdego typu spotkania osobno
2. **Wzajemne blokowanie** - rezerwacja jednego typu (trójstronne/konsultacje) blokuje ten sam przedział czasowy dla drugiego typu
3. **Blokada według rzeczywistego czasu** - 30-min konsultacja o 10:00 blokuje do 10:30, godzinna o 14:00 blokuje do 15:00
4. **Integracja z Google Calendar** - blokady mają być spójne z kalendarzem Google

---

## Analiza obecnego stanu

### Co już działa:
- System sprawdza zajętość obu typów spotkań podczas rezerwacji (linia 263-266 w `PartnerMeetingBooking.tsx`)
- Blokady są sprawdzane przez `start_time` i `end_time`
- Google Calendar jest odpytywany przez `check-google-calendar-busy`

### Problemy:
1. **Czas trwania jest globalny** - jeden `slot_duration_minutes` dla wszystkich typów spotkań
2. **Brak opcji 15 minut** - obecnie tylko 30, 45, 60, 90 min
3. **Blokowanie nie uwzględnia rzeczywistego czasu trwania zarezerwowanego spotkania** - sprawdza tylko `start_time`, nie przelicza nakładania się czasów

---

## Proponowane zmiany

### 1. Rozszerzenie opcji czasowych (15 min)

**Plik: `src/components/events/IndividualMeetingForm.tsx`**

Dodanie 15 minut do listy opcji:
```typescript
const SLOT_DURATIONS = [
  { value: 15, label: '15 minut' },  // NOWE
  { value: 30, label: '30 minut' },
  { value: 45, label: '45 minut' },
  { value: 60, label: '60 minut' },
  { value: 90, label: '90 minut' },
];
```

### 2. Osobny czas trwania dla każdego typu spotkania

Obecnie partner może mieć różne ustawienia dla `tripartite` i `consultation`, ale czas trwania jest wspólny. Zmiana:

**Rozszerzenie bazy danych:**
- Dodanie kolumn `tripartite_slot_duration` i `consultation_slot_duration` do `leader_permissions`

**Migracja SQL:**
```sql
ALTER TABLE leader_permissions 
ADD COLUMN IF NOT EXISTS tripartite_slot_duration integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS consultation_slot_duration integer DEFAULT 60;
```

**Plik: `src/components/events/IndividualMeetingForm.tsx`**

Wczytywanie i zapisywanie osobnego czasu dla każdego typu:
```typescript
const [slotDuration, setSlotDuration] = useState(60);

// W loadExistingData:
const durationField = meetingType === 'tripartite' 
  ? 'tripartite_slot_duration' 
  : 'consultation_slot_duration';

// W handleSave:
await supabase
  .from('leader_permissions')
  .update({ 
    [durationField]: slotDuration,
    // ... inne pola
  })
  .eq('user_id', user.id);
```

### 3. Poprawienie logiki blokowania czasowego

**Problem:** Obecna logika w `PartnerMeetingBooking.tsx` sprawdza tylko czy jest już spotkanie o tej samej godzinie startu, ale nie uwzględnia nakładania się czasów.

**Plik: `src/components/events/PartnerMeetingBooking.tsx`**

**Zmiana 1: Pobieranie pełnych danych spotkań (linie 259-266)**

```typescript
// BYŁO:
.select('start_time')
.eq('host_user_id', partnerId)
.in('event_type', ['tripartite_meeting', 'partner_consultation'])

// BĘDZIE:
.select('start_time, end_time, event_type')
.eq('host_user_id', partnerId)
.in('event_type', ['tripartite_meeting', 'partner_consultation'])
```

**Zmiana 2: Sprawdzanie nakładania się czasów zamiast tylko startu (linie 306-325)**

```typescript
// NOWA LOGIKA - sprawdzanie czy slot koliduje z istniejącymi spotkaniami
const bookedMeetings = meetingsResult.data || [];

const isSlotBlockedByMeeting = (slotTime: string): boolean => {
  const slotStart = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const slotEnd = addMinutes(slotStart, slotDuration);
  
  return bookedMeetings.some(meeting => {
    const meetingStart = new Date(meeting.start_time);
    const meetingEnd = new Date(meeting.end_time);
    
    // Overlap: slotStart < meetingEnd AND slotEnd > meetingStart
    return slotStart < meetingEnd && slotEnd > meetingStart;
  });
};

// W filtrze slotów:
.filter(slotTime => {
  // ... istniejące warunki ...
  if (isSlotBlockedByMeeting(slotTime)) return false;
  return true;
})
```

### 4. Spójność z Google Calendar

Google Calendar już poprawnie blokuje sloty przez `check-google-calendar-busy` (FreeBusy API). Ta część działa dobrze.

**Ulepszenie:** Przy tworzeniu spotkania w Google Calendar, upewnić się że `end_time` jest poprawnie ustawiony na podstawie rzeczywistego czasu trwania.

**Plik: `supabase/functions/sync-google-calendar/index.ts`**

Funkcja `formatGoogleEvent` już obsługuje `end_time` poprawnie (linie 129-134):
```typescript
const endTime = event.end_time 
  ? new Date(event.end_time) 
  : new Date(startTime.getTime() + 60 * 60 * 1000);
```

Upewnić się, że `end_time` jest zawsze przekazywany przy tworzeniu spotkania indywidualnego (już jest - linia 528-529 w PartnerMeetingBooking.tsx).

---

## Diagram blokowania czasowego

```text
Przykład: Partner ma dostępność 10:00-12:00

Scenariusz 1: 30-min konsultacja zarezerwowana na 10:00
┌──────────────────────────────────────────────────────┐
│ 10:00    10:30    11:00    11:30    12:00            │
│ [ZAJĘTE]────────┐                                    │
│ Konsultacja 30m │                                    │
│ ────────────────┘                                    │
│                                                      │
│ Blokuje sloty:                                       │
│ - 10:00 (oba typy) ❌                                │
│ - 10:15 (oba typy) ❌ (nakłada się)                 │
│ - 10:30 (oba typy) ✅ (dostępny)                    │
└──────────────────────────────────────────────────────┘

Scenariusz 2: 60-min spotkanie trójstronne na 14:00
┌──────────────────────────────────────────────────────┐
│ 14:00    14:30    15:00    15:30    16:00            │
│ [ZAJĘTE]────────────────────┐                        │
│ Spotkanie trójstronne 60min │                        │
│ ────────────────────────────┘                        │
│                                                      │
│ Blokuje sloty:                                       │
│ - 14:00 (oba typy) ❌                                │
│ - 14:15 (oba typy) ❌                                │
│ - 14:30 (oba typy) ❌                                │
│ - 14:45 (oba typy) ❌                                │
│ - 15:00 (oba typy) ✅ (dostępny)                    │
└──────────────────────────────────────────────────────┘
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/[nowa]_individual_meeting_durations.sql` | Dodanie kolumn `tripartite_slot_duration` i `consultation_slot_duration` |
| `src/components/events/IndividualMeetingForm.tsx` | Dodanie opcji 15 min, osobny czas dla każdego typu |
| `src/components/events/PartnerMeetingBooking.tsx` | Pobieranie `end_time` spotkań, logika sprawdzania nakładania się |
| `src/integrations/supabase/types.ts` | Aktualizacja typów (automatycznie po migracji) |

---

## Sekcja techniczna

### Migracja SQL

```sql
-- Dodanie osobnych czasów trwania dla każdego typu spotkania
ALTER TABLE leader_permissions 
ADD COLUMN IF NOT EXISTS tripartite_slot_duration integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS consultation_slot_duration integer DEFAULT 60;

COMMENT ON COLUMN leader_permissions.tripartite_slot_duration IS 'Czas trwania spotkań trójstronnych w minutach';
COMMENT ON COLUMN leader_permissions.consultation_slot_duration IS 'Czas trwania konsultacji w minutach';
```

### Zmiana w IndividualMeetingForm.tsx

**Linia 23-28 - rozszerzenie opcji:**
```typescript
const SLOT_DURATIONS = [
  { value: 15, label: '15 minut' },
  { value: 30, label: '30 minut' },
  { value: 45, label: '45 minut' },
  { value: 60, label: '60 minut' },
  { value: 90, label: '90 minut' },
];
```

**Linie ~110-126 - wczytywanie osobnego czasu:**
```typescript
// W loadExistingData, po pobraniu permData:
const durationField = meetingType === 'tripartite' 
  ? 'tripartite_slot_duration' 
  : 'consultation_slot_duration';

if (permData?.[durationField]) {
  setSlotDuration(permData[durationField]);
}
```

**Linie ~180-188 - zapisywanie:**
```typescript
const durationField = meetingType === 'tripartite' 
  ? 'tripartite_slot_duration' 
  : 'consultation_slot_duration';

await supabase
  .from('leader_permissions')
  .update({ 
    zoom_link: zoomLink || null,
    use_external_booking: bookingMode === 'external',
    external_calendly_url: bookingMode === 'external' ? externalCalendlyUrl : null,
    [durationField]: slotDuration,
  })
  .eq('user_id', user.id);
```

### Zmiana w PartnerMeetingBooking.tsx

**Linie 259-266 - rozszerzenie zapytania:**
```typescript
supabase
  .from('events')
  .select('start_time, end_time, event_type')  // Dodane end_time i event_type
  .eq('host_user_id', partnerId)
  .in('event_type', ['tripartite_meeting', 'partner_consultation'])
  .gte('start_time', `${dateStr}T00:00:00`)
  .lt('start_time', `${dateStr}T23:59:59`)
  .eq('is_active', true),
```

**Linie 306-325 - nowa logika blokowania:**
```typescript
// Zastąpienie starej logiki bookedTimes nową logiką nakładania się
const bookedMeetings = meetingsResult.data || [];

const isSlotBlockedByExistingMeeting = (slotTime: string): boolean => {
  const slotStart = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const slotEnd = addMinutes(slotStart, slotDuration);
  
  return bookedMeetings.some(meeting => {
    const meetingStart = new Date(meeting.start_time);
    const meetingEnd = new Date(meeting.end_time);
    
    // Sprawdź nakładanie się: slot zaczyna się przed końcem spotkania 
    // I slot kończy się po rozpoczęciu spotkania
    return slotStart < meetingEnd && slotEnd > meetingStart;
  });
};
```

**Linie 362-368 - aktualizacja filtra:**
```typescript
const availableSlotsList: AvailableSlot[] = allSlots
  .filter(slotTime => {
    if (dateStr === today && slotTime <= currentTime) return false;
    if (isSlotBlockedByExistingMeeting(slotTime)) return false;  // NOWE
    if (blockedByPlatform.has(slotTime)) return false;
    if (googleBusySlots.has(slotTime)) return false;
    return true;
  })
```

### Pobieranie czasu trwania przy rezerwacji

**Linie ~250-290 - dodanie pobierania ustawień czasu trwania:**
```typescript
// W loadAvailableSlots, dodać pobieranie leader_permissions
const [weeklyResult, meetingsResult, blockingResult, tokenResult, permissionsResult] = await Promise.all([
  // ... istniejące zapytania ...
  supabase
    .from('leader_permissions')
    .select('tripartite_slot_duration, consultation_slot_duration')
    .eq('user_id', partnerId)
    .maybeSingle(),
]);

// Użyj odpowiedniego czasu trwania w zależności od typu spotkania
const permissions = permissionsResult.data;
const slotDuration = meetingType === 'tripartite'
  ? (permissions?.tripartite_slot_duration || 60)
  : (permissions?.consultation_slot_duration || 60);
```

---

## Korzyści

1. **Elastyczność** - partnerzy mogą mieć różne czasy dla różnych typów spotkań
2. **Precyzja** - blokady uwzględniają rzeczywisty czas trwania, nie tylko godzinę startu
3. **Spójność** - Google Calendar pokazuje te same blokady co system
4. **Dwukierunkowe blokowanie** - spotkanie jednego typu automatycznie blokuje drugi
