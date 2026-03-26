

# Plan: Zakładka "Webinary ogólne" + Rejoin po odświeżeniu

## Problem 1: Brak zakładki "Z zaproszeń na webinary ogólne"

**Przyczyna**: W `useTeamContacts.ts` (linia 462) kontakty z wydarzeń bez wpisu w `auto_webinar_config` domyślnie trafiają do `idsBO` (Business Opportunity). Standardowe webinary i szkolenia zespołowe nie mają kategorii i są błędnie klasyfikowane jako BO.

**Rozwiązanie**: Dodać trzecią kategorię kontaktów — "Z zaproszeń na webinary ogólne" — dla wydarzeń, które NIE mają wpisu w `auto_webinar_config`.

### Zmiany w plikach:

**`src/hooks/useTeamContacts.ts`**:
- Dodać `eventContactIdsGeneral` (Set) i `eventGroupedContactsGeneral` (Map)
- Zmienić logikę klasyfikacji: jeśli `event_id` NIE istnieje w `categoryMap` → kontakt trafia do "general", NIE do BO
- Jeśli `categoryMap.get(event_id) === 'business_opportunity'` → BO
- Jeśli `categoryMap.get(event_id) === 'health_conversation'` → HC

**`src/components/team-contacts/TeamContactsTab.tsx`**:
- Dodać `privateSubTab: 'events-general'`
- Dodać przycisk "Z zaproszeń na webinary ogólne" z badge
- Renderować `EventGroupedContacts` z `eventGroupedContactsGeneral`

## Problem 2: Nie można wrócić po odświeżeniu strony

**Przyczyna**: Po odświeżeniu, `useAutoWebinarSync` ustawia `isTooLate=true` i `currentVideo=null`. Efekt rejoin (linia 67) poprawnie wykrywa istniejącą sesję i ustawia `hasExistingSession=true`, ale hook synchronizacji nadal trzyma `currentVideo=null` bo nie wie o tej flage.

**Rozwiązanie**: Przekazać `hasExistingSession` do `useAutoWebinarSync` jako parametr, aby hook pomijał blokadę `isTooLate` i zamiast tego zwracał wideo z poprawnym offsetem.

### Zmiany w plikach:

**`src/hooks/useAutoWebinarSync.ts`**:
- Dodać parametr `bypassLateBlock?: boolean`
- W `calculateExplicitSlots`: jeśli `bypassLateBlock=true` i `sinceSlot > lateJoinMaxSec`, NIE ustawiać `isTooLate` — zamiast tego kontynuować do odtwarzania z offsetem `sinceSlot`

**`src/components/auto-webinar/AutoWebinarEmbed.tsx`**:
- Przenieść sprawdzanie sesji (localStorage-based) PRZED wywołaniem `useAutoWebinarSync`
- Przekazać `hasExistingSession` do `useAutoWebinarSync` jako `bypassLateBlock`
- Upewnić się, że check sesji nie wymaga `currentVideo` (sprawdzać po `guestEmail` + dzisiejsza data w `auto_webinar_views`)

### Szczegóły techniczne — rejoin flow:

```text
Refresh → mount
  ├─ localStorage check: aw_session_* exists? → bypassLateBlock=true
  ├─ useAutoWebinarSync(videos, config, isGuest, slot, preview, bypassLateBlock=true)
  │   └─ sinceSlot > lateJoinMax BUT bypassLateBlock → skip isTooLate
  │   └─ setCurrentVideo(video), setStartOffset(sinceSlot)
  └─ Video plays from correct offset (e.g. 3:45 into webinar)
```

Dodatkowo: async check w `auto_webinar_views` (DB) jako fallback, jeśli localStorage jest wyczyszczony.

