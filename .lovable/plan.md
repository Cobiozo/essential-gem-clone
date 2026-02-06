

# Plan: Automatyczne zamykanie okna po zapisie + Naprawa duplikatów w "Moje spotkania"

## Problem 1: Okno nie zamyka się po kliknięciu "Zapisz się"

**Obecny stan:**
Na screenshocie widać, że po kliknięciu "Zapisz się" pojawia się toast "Sukces - Zapisano na wydarzenie", ale dialog z informacjami o wydarzeniu ("Cicha śmierć...") pozostaje otwarty.

**Przyczyna:**
W pliku `EventDetailsDialog.tsx` funkcja `handleRegister` (linia 98-100) wywołuje tylko `onRegister()` bez zamykania dialogu:
```tsx
const handleRegister = () => {
  onRegister(event.id, occurrenceIndex);
  // Brak: onOpenChange(false);
};
```

**Rozwiązanie:**
Zamknąć dialog automatycznie po wywołaniu rejestracji.

---

## Problem 2: "Start nowego partnera" pojawia się dwa razy

**Obecny stan:**
Na screenshocie w widżecie "Moje spotkania" widać:
- "Start noweg..." - 12 lut 19:00 (CET) - Szczegóły
- "Start noweg..." - 12 lut 19:00 (CET) - Szczegóły

To jedno wydarzenie cykliczne pokazuje się dwukrotnie.

**Przyczyna:**
W funkcji `getUserEvents` (`useEvents.ts`, linia 578-611) system iteruje przez wszystkie rejestracje użytkownika. Jeśli użytkownik ma dwa wpisy rejestracji dla tego samego wydarzenia:
1. Wpis "legacy" bez `occurrence_index` (null)
2. Wpis z konkretnym `occurrence_index: 0`

...oba są dodawane do listy, co powoduje duplikaty.

**Rozwiązanie:**
Dodać deduplikację w `getUserEvents` używając klucza `event_id + start_time`:

```tsx
const seenKeys = new Set<string>();

registrations.forEach(reg => {
  // ... logika tworzenia expandedEvent ...
  
  const dedupeKey = `${reg.event_id}:${startTimeStr}`;
  if (!seenKeys.has(dedupeKey)) {
    expandedEvents.push(eventToPush);
    seenKeys.add(dedupeKey);
  }
});
```

---

## Szczegóły techniczne

### Plik 1: `src/components/events/EventDetailsDialog.tsx`

**Zmiana w funkcji `handleRegister` (linia 98-100):**

```tsx
// PRZED:
const handleRegister = () => {
  onRegister(event.id, occurrenceIndex);
};

// PO:
const handleRegister = () => {
  onRegister(event.id, occurrenceIndex);
  onOpenChange(false); // Automatyczne zamknięcie dialogu
};
```

### Plik 2: `src/hooks/useEvents.ts`

**Zmiana w funkcji `getUserEvents` (linia 574-611):**

Dodanie deduplikacji przed dodaniem eventu do listy:

```tsx
// PRZED (linia 574-611):
const expandedEvents: EventWithRegistration[] = [];
const eventMap = new Map((events || []).map(e => [e.id, e]));

registrations.forEach(reg => {
  const event = eventMap.get(reg.event_id);
  if (!event) return;
  // ... logika ...
  expandedEvents.push(...);
});

// PO:
const expandedEvents: EventWithRegistration[] = [];
const eventMap = new Map((events || []).map(e => [e.id, e]));
const seenEventTimes = new Set<string>(); // Deduplikacja

registrations.forEach(reg => {
  const event = eventMap.get(reg.event_id);
  if (!event) return;
  
  const baseEvent = { /* ... istniejąca logika ... */ };
  
  let startTimeForDedupe: string;
  let eventToPush: EventWithRegistration;

  if (isMultiOccurrenceEvent(baseEvent) && reg.occurrence_index !== null && reg.occurrence_index !== undefined) {
    const allOccurrences = getAllOccurrences(baseEvent);
    const occurrence = allOccurrences.find(o => o.index === reg.occurrence_index);
    
    if (!occurrence) return;
    
    startTimeForDedupe = occurrence.start_datetime.toISOString();
    eventToPush = {
      ...baseEvent,
      start_time: startTimeForDedupe,
      end_time: occurrence.end_datetime.toISOString(),
      // ... pozostałe pola ...
    };
  } else {
    // Legacy lub pojedyncze wystąpienie
    startTimeForDedupe = new Date(baseEvent.start_time).toISOString();
    eventToPush = baseEvent;
  }

  // Deduplikacja: klucz = event_id + start_time
  const dedupeKey = `${reg.event_id}:${startTimeForDedupe}`;
  if (!seenEventTimes.has(dedupeKey)) {
    expandedEvents.push(eventToPush);
    seenEventTimes.add(dedupeKey);
  }
});
```

### Plik 3: `src/components/dashboard/widgets/MyMeetingsWidget.tsx`

**Zmiana klucza w renderowaniu listy (linia 412-413):**

```tsx
// PRZED:
{events.map(event => (
  <div key={event.id} ...>

// PO (dla obsługi zdarzeń cyklicznych):
{events.map((event, idx) => (
  <div 
    key={`${event.id}-${(event as any)._occurrence_index ?? idx}`}
    ...>
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `EventDetailsDialog.tsx` | Dodanie `onOpenChange(false)` po rejestracji |
| `useEvents.ts` | Deduplikacja w `getUserEvents` po kluczu `event_id + start_time` |
| `MyMeetingsWidget.tsx` | Poprawka klucza React dla zdarzeń cyklicznych |

---

## Oczekiwany rezultat

1. **Po kliknięciu "Zapisz się"** → dialog automatycznie się zamyka, użytkownik widzi toast sukcesu
2. **W "Moje spotkania"** → każde wydarzenie pojawia się tylko raz, nawet przy zduplikowanych rekordach rejestracji

