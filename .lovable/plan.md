

# Plan: Kompleksowe blokowanie terminów spotkań indywidualnych

## Aktualny stan kodu

Przeanalizowałem `PartnerMeetingBooking.tsx` i widzę następującą logikę:

### Co już działa poprawnie:

1. **Linie 276-282** - Pobieranie eventów blokujących z platformy:
```tsx
.in('event_type', ['webinar', 'spotkanie_zespolu', 'team_training'])
```

2. **Linie 341-355** - Blokowanie slotów przez eventy platformy:
```tsx
if (slotStart < eventEnd && slotEnd > eventStart) {
  blockedByPlatform.add(slotTime);
}
```

3. **Linie 357-385** - Sprawdzanie Google Calendar busy times

4. **Linie 523-543** - Walidacja przy rezerwacji (webinary, team_training)

### Co wymaga naprawy:

| Problem | Lokalizacja | Opis |
|---------|-------------|------|
| Brak `meeting_public` | Linie 279, 528 | Spotkania publiczne nie blokują slotów |
| Błędne porównanie timezone | Linie 372-376 | Sloty parsowane w lokalnej strefie zamiast lidera |
| Błędna walidacja overlap | Linie 507-508 | `.gte` i `.lt` zamiast `.lt` i `.gt` |

---

## Rozwiązania

### Zmiana 1: Dodanie `meeting_public` do typów blokujących

**Plik:** `src/components/events/PartnerMeetingBooking.tsx`

**Linia 279** - zapytanie pobierające eventy blokujące:
```tsx
// PRZED:
.in('event_type', ['webinar', 'spotkanie_zespolu', 'team_training'])

// PO:
.in('event_type', ['webinar', 'spotkanie_zespolu', 'team_training', 'meeting_public'])
```

**Linia 528** - walidacja przed rezerwacją:
```tsx
// PRZED:
.in('event_type', ['webinar', 'team_training', 'spotkanie_zespolu'])

// PO:
.in('event_type', ['webinar', 'team_training', 'spotkanie_zespolu', 'meeting_public'])
```

### Zmiana 2: Naprawa porównania stref czasowych z Google Calendar

**Plik:** `src/components/events/PartnerMeetingBooking.tsx`

**Import (dodać `zonedTimeToUtc`):**
```tsx
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';
```

**Linie 367-381** - zmiana parsowania slotów:
```tsx
// PRZED:
if (busyData?.busy && Array.isArray(busyData.busy)) {
  busyData.busy.forEach((busySlot: { start: string; end: string }) => {
    const busyStart = new Date(busySlot.start);
    const busyEnd = new Date(busySlot.end);
    
    allSlots.forEach(slotTime => {
      const slotStart = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
      const slotEnd = addMinutes(slotStart, slotDuration);
      
      if (slotStart < busyEnd && slotEnd > busyStart) {
        googleBusySlots.add(slotTime);
      }
    });
  });
}

// PO:
if (busyData?.busy && Array.isArray(busyData.busy)) {
  console.log('[PartnerMeetingBooking] Google Calendar busy slots:', busyData.busy);
  
  busyData.busy.forEach((busySlot: { start: string; end: string }) => {
    const busyStart = new Date(busySlot.start);
    const busyEnd = new Date(busySlot.end);
    
    allSlots.forEach(slotTime => {
      // Parse slot time in leader's timezone to get correct UTC comparison
      const slotDateTime = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
      const slotStartUTC = zonedTimeToUtc(slotDateTime, partnerTimezone);
      const slotEndUTC = addMinutes(slotStartUTC, slotDuration);
      
      // Both times are now in UTC for accurate comparison
      if (slotStartUTC < busyEnd && slotEndUTC > busyStart) {
        googleBusySlots.add(slotTime);
      }
    });
  });
  
  console.log('[PartnerMeetingBooking] Slots blocked by Google Calendar:', [...googleBusySlots]);
}
```

### Zmiana 3: Naprawa walidacji overlap przy rezerwacji

**Plik:** `src/components/events/PartnerMeetingBooking.tsx`

**Linie 502-510** - poprawienie warunków:
```tsx
// PRZED:
const { data: existingEvent } = await supabase
  .from('events')
  .select('id')
  .eq('host_user_id', selectedPartner.user_id)
  .in('event_type', ['tripartite_meeting', 'partner_consultation'])
  .gte('start_time', startDateTime)  // ❌ Błędne
  .lt('end_time', endDateTime)        // ❌ Błędne
  .eq('is_active', true)
  .maybeSingle();

// PO:
const { data: existingEvent } = await supabase
  .from('events')
  .select('id')
  .eq('host_user_id', selectedPartner.user_id)
  .in('event_type', ['tripartite_meeting', 'partner_consultation'])
  .lt('start_time', endDateTime)   // ✅ existing start < our end
  .gt('end_time', startDateTime)   // ✅ existing end > our start
  .eq('is_active', true)
  .maybeSingle();
```

---

## Wizualizacja logiki blokowania

```text
┌─────────────────────────────────────────────────────────────────┐
│                    SPRAWDZANIE DOSTĘPNOŚCI SLOTU                │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. HARMONOGRAM LIDERA (leader_availability)                    │
│     → Czy lider ma włączoną dostępność w tym dniu/godzinie?     │
└─────────────────────────────────────────────────────────────────┘
                               │ TAK
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. ISTNIEJĄCE SPOTKANIA INDYWIDUALNE                           │
│     (tripartite_meeting, partner_consultation)                  │
│     → Czy lider ma już rezerwację w tym czasie?                 │
└─────────────────────────────────────────────────────────────────┘
                               │ NIE
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. EVENTY PLATFORMY (webinar, team_training,                   │
│                       spotkanie_zespolu, meeting_public)        │
│     → Czy w tym czasie jest event zespołowy?                    │
└─────────────────────────────────────────────────────────────────┘
                               │ NIE
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. GOOGLE CALENDAR LIDERA                                      │
│     → Czy lider ma zajęty czas w Google Calendar?               │
└─────────────────────────────────────────────────────────────────┘
                               │ NIE
                               ▼
                    ┌──────────────────┐
                    │ SLOT DOSTĘPNY ✅ │
                    └──────────────────┘
```

---

## Przykład: 26.01.2026

| Godzina | Team Zoom | Google Cal | Rezultat |
|---------|-----------|------------|----------|
| 16:00 | - | ZAJĘTY | ❌ Zablokowany |
| 17:00 | - | ZAJĘTY | ❌ Zablokowany |
| 18:00 | - | ZAJĘTY | ❌ Zablokowany |
| 19:00 | - | ZAJĘTY | ❌ Zablokowany |
| 20:00 | TAK (team_training) | ZAJĘTY | ❌ Zablokowany (oba) |
| 21:00 | - | ZAJĘTY | ❌ Zablokowany |

---

## Podsumowanie zmian

| Plik | Linia | Zmiana |
|------|-------|--------|
| `PartnerMeetingBooking.tsx` | 24 | Dodanie importu `zonedTimeToUtc` |
| `PartnerMeetingBooking.tsx` | 279 | Dodanie `meeting_public` do typów blokujących |
| `PartnerMeetingBooking.tsx` | 367-381 | Użycie `zonedTimeToUtc` dla Google Calendar |
| `PartnerMeetingBooking.tsx` | 507-508 | Naprawa `.gte`/`.lt` → `.lt`/`.gt` |
| `PartnerMeetingBooking.tsx` | 528 | Dodanie `meeting_public` do walidacji |

---

## Sekcja techniczna

### Pełna lista zmian w pliku `PartnerMeetingBooking.tsx`:

**Linia 24 - rozszerzenie importu:**
```tsx
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';
```

**Linia 279 - zapytanie blokujące:**
```tsx
.in('event_type', ['webinar', 'spotkanie_zespolu', 'team_training', 'meeting_public'])
```

**Linie 367-385 - Google Calendar z timezone fix i logowaniem:**
```tsx
if (busyData?.busy && Array.isArray(busyData.busy)) {
  console.log('[PartnerMeetingBooking] Google Calendar busy slots for', dateStr, ':', busyData.busy);
  
  busyData.busy.forEach((busySlot: { start: string; end: string }) => {
    const busyStart = new Date(busySlot.start);
    const busyEnd = new Date(busySlot.end);
    
    allSlots.forEach(slotTime => {
      // Parse slot in leader's timezone for accurate UTC comparison
      const slotDateTime = parse(`${dateStr} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
      const slotStartUTC = zonedTimeToUtc(slotDateTime, partnerTimezone);
      const slotEndUTC = addMinutes(slotStartUTC, slotDuration);
      
      if (slotStartUTC < busyEnd && slotEndUTC > busyStart) {
        googleBusySlots.add(slotTime);
      }
    });
  });
  
  console.log('[PartnerMeetingBooking] Slots blocked by Google Calendar:', [...googleBusySlots]);
}
```

**Linie 507-508 - walidacja overlap:**
```tsx
.lt('start_time', endDateTime)
.gt('end_time', startDateTime)
```

**Linia 528 - walidacja przy rezerwacji:**
```tsx
.in('event_type', ['webinar', 'team_training', 'spotkanie_zespolu', 'meeting_public'])
```

