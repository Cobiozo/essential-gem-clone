

# Zmiany w kontaktach prywatnych

## 1. Usunięcie EQID z widoku kontaktów prywatnych

Kontakty prywatne nie mają EQID (to osoby spoza systemu). Trzeba usunąć wyświetlanie "EQID: -" w obu widokach:

**TeamContactAccordion.tsx** (linia 195-197): Usunąć linię `EQID: {contact.eq_id || '-'}` ale tylko gdy `contactType === 'private'`.

**TeamContactsTable.tsx** (linia 131): Usunąć kolumnę EQID dla kontaktów prywatnych (podobnie jak ukrywanie kolumny Status dla team_member).

## 2. Przy imieniu i nazwisku tylko status relacji (bez roli "Klient")

Na screenshocie widać: **"katarzyna Snopek test `Klient` `Obserwacja`"** -- ma byc tylko status, bez badge "Klient".

**TeamContactAccordion.tsx** (linia 192): Warunkowe ukrycie `getRoleBadge()` dla kontaktów prywatnych. Kontakty prywatne mają zawsze rolę `client`, więc badge "Klient" jest zbędny. Pokazywać tylko `getStatusBadge()`.

**TeamContactsTable.tsx**: Analogicznie -- ukryć kolumnę "Rola" dla kontaktów prywatnych, zostawić tylko Status.

Dodatkowo: ujednolicić etykiety statusów w `TeamContactAccordion` i `TeamContactFilters` z nowymi wartościami:
- `observation` → "Czynny obserwujący" (nie "Obserwacja")
- Dodać `potential_client` → "Potencjalny klient"
- Usunąć stare wartości (`active`, `potential_specialist`, `suspended`)

## 3. Podział kontaktów prywatnych na "Z zaproszeń" i "Własna lista"

Rozróżnienie oparte na istnieniu rekordu w `guest_event_registrations` powiązanego przez `team_contact_id`.

**Podejście**: W `TeamContactsTab.tsx` podzielić zakładkę "Kontakty prywatne" na dwa podzakładki (nested Tabs):
- **Własna lista** -- kontakty prywatne, które NIE mają żadnych rekordów w `guest_event_registrations`
- **Z zaproszeń na wydarzenia** -- kontakty prywatne, które MAJĄ co najmniej 1 rekord w `guest_event_registrations`

**Implementacja**:
1. W `useTeamContacts.ts` dodać pobieranie listy `contact_id` z `guest_event_registrations` (jednorazowe zapytanie `SELECT DISTINCT team_contact_id FROM guest_event_registrations WHERE team_contact_id IS NOT NULL`).
2. Przekazać tę listę do komponentów wyświetlających -- filtrować kontakty na dwie grupy.
3. Alternatywnie: dodać podzakładki w `TeamContactsTab.tsx` sekcji "private" z filtrowaniem po stronie frontendu.

**Pliki do zmiany**:
- `src/components/team-contacts/TeamContactAccordion.tsx` -- ukrycie EQID i roli dla prywatnych, aktualizacja statusów
- `src/components/team-contacts/TeamContactsTable.tsx` -- ukrycie EQID i roli dla prywatnych
- `src/components/team-contacts/TeamContactFilters.tsx` -- aktualizacja opcji filtrów statusu
- `src/components/team-contacts/TeamContactsTab.tsx` -- dodanie podzakładek "Własna lista" / "Z zaproszeń"
- `src/hooks/useTeamContacts.ts` -- dodanie pobierania ID kontaktów z rejestracji wydarzeń

