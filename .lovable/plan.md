

# Dodanie przycisku "Zaproś na wydarzenie" w kontaktach z BO/HC

## Problem

Kontakty w zakładkach "Z zaproszeń na Business Opportunity" i "Z zaproszeń na Health Conversation" nie mają przycisku zaproszenia na inne wydarzenia (ikona `Send`), który jest dostępny w kontaktach z "Mojej listy" i "Z Mojej Strony Partnerskiej".

## Rozwiązanie

Dodać przycisk zaproszenia i dialog `InviteToEventDialog` do komponentu `EventGroupedContacts.tsx`.

### Zmiany w `src/components/team-contacts/EventGroupedContacts.tsx`:

1. **Import** `Send` z lucide-react oraz `InviteToEventDialog`
2. **Dodać stan** `inviteContact` (analogicznie do `historyContact`)
3. **Dodać przycisk** `Send` w sekcji action buttons (linia 192), zaraz za przyciskiem `UserPlus` (Przenieś do Mojej listy) — przed `ContactEventInfoButton`
4. **Dodać dialog** `InviteToEventDialog` na końcu komponentu (obok `TeamContactHistoryDialog`)

Przycisk będzie wyglądał identycznie jak w `TeamContactAccordion.tsx` — ghost, icon, `h-8 w-8`, z ikoną `Send` w kolorze `text-primary`.

### Plik do edycji
| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/EventGroupedContacts.tsx` | Dodanie przycisku Send + InviteToEventDialog |

