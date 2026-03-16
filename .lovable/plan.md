

# Plan: Status zaproszenia w InviteToEventDialog

## Zmiana

**Plik: `src/components/team-contacts/InviteToEventDialog.tsx`**

Po pobraniu listy wydarzeń, wykonać dodatkowe zapytanie do `guest_event_registrations` filtrując po `email = contact.email` i `status = 'registered'`, pobierając listę `event_id`.

Konkretne zmiany:
1. Dodać stan `invitedEventIds: Set<string>` 
2. W `useEffect` (po `fetchEvents`) dodać `fetchInvitedEvents()` — zapytanie do `guest_event_registrations` WHERE `email = contact.email` AND `status = 'registered'`, SELECT `event_id`
3. W renderowaniu każdego wydarzenia: jeśli `event_id ∈ invitedEventIds` → wyświetlić zielony badge `✅ Zaproszenie wysłane` zamiast aktywnego przycisku "Zaproś"
4. Po udanym wysłaniu zaproszenia (`handleInvite`) → dodać `event.id` do `invitedEventIds` (optymistyczny update) zamiast zamykania dialogu

| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/InviteToEventDialog.tsx` | Sprawdzenie statusu zaproszeń + badge "Zaproszenie wysłane" |

