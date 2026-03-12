

# Naprawa znikającego webinaru z widżetu "Moje spotkania"

## Problem
Filtr w MyMeetingsWidget (linie 116-125) ukrywa wydarzenia które:
1. Mają `meeting_room_id`
2. Już się rozpoczęły (`start_time <= now`)
3. Pokój nie jest wykryty jako aktywny

To powoduje, że event "test" znika, mimo że jest w trakcie trwania (end_time > now). Intencja tego filtra miała być: ukrywaj zakończone eventy z nieaktywnym pokojem. Ale event się nie zakończył — jest w swoim oknie czasowym.

## Zmiana

**Plik:** `src/components/dashboard/widgets/MyMeetingsWidget.tsx` — linie 116-125

Zmienić logikę filtra tak, by ukrywał wydarzenia z `meeting_room_id` tylko gdy event **już się zakończył** (end_time <= now) i pokój nie jest aktywny. Dla eventów w trakcie trwania (start_time <= now < end_time) — zawsze pokazuj:

```typescript
const upcomingEvents = userEvents.filter(e => {
    const now = new Date();
    const endTime = new Date(e.end_time);
    const startTime = new Date(e.start_time);
    const roomId = (e as any).meeting_room_id;
    
    // Event still in future or in progress → always show
    if (endTime > now) return true;
    
    // Event ended: keep only if room is still active (overtime)
    if (roomId && activeRoomIds.has(roomId)) return true;
    
    return false;
});
```

Jedna zmiana, ~10 linii.

