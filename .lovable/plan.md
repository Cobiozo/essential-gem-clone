
Cel: naprawić sytuację, w której administrator po wejściu w „Pure – Kontakty” nadal nie widzi swoich kontaktów prywatnych i zaproszonych gości.

Co już potwierdziłem podczas analizy:
1) Dane są w bazie:
- dla admina `629a2d9a-994a-4e6a-a9c4-8ae0b07e3770` istnieją kontakty (`private_active=2`, `team_active=1`),
- zaproszeni goście mają poprawnie ustawione `invited_by_user_id` i `team_contact_id` w `guest_event_registrations`.
2) Poprzednia poprawka w `useTeamContacts.ts` (domyślny filtr `user_id = user.id` dla admina) jest logicznie poprawna.
3) Rzeczywista przyczyna jest w UI uprawnień:
- `src/pages/MyAccount.tsx` ukrywa zakładkę `teamContacts` dla admina,
- obecnie: `teamContacts: isPartner || isSpecjalista || (isClient && canSearchSpecialists)`,
- przez to komponent `TeamContactsTab` w ogóle się nie renderuje dla „czystego” admina, mimo że sidebar prowadzi admina na `/my-account?tab=team-contacts...`.

Plan wdrożenia:

1. Ujednolicenie dostępu admina do zakładki „Pure – Kontakty”
- Plik: `src/pages/MyAccount.tsx`
- Zmienić warunek widoczności:
  - z: `isPartner || isSpecjalista || (isClient && canSearchSpecialists)`
  - na: `isUserAdmin || isPartner || isSpecjalista || (isClient && canSearchSpecialists)`
- Efekt: tab trigger + `TabsContent` dla `team-contacts` będą renderowane także dla admina.

2. Spójność nawigacji (sidebar vs. My Account)
- Zachować obecne `visibleFor: ['partner', 'specjalista', 'admin']` w sidebarze (już poprawne).
- Po zmianie z kroku 1 nawigacja i ekran docelowy będą spójne (koniec sytuacji „link jest, ale treści brak”).

3. Twarda weryfikacja po wdrożeniu
- Wejść jako admin na: `/my-account?tab=team-contacts&subTab=private`.
- Sprawdzić:
  - czy zakładka „Pure – Kontakty” jest widoczna,
  - czy w „Kontakty prywatne” pojawiają się rekordy admina (w tym goście zaproszeni przez link webinarowy),
  - czy przełączanie `subTab=private/team` działa poprawnie.
- Dodatkowo: wykonać test E2E zaproszenia gościa (rejestracja z linku admina → kontakt pojawia się w prywatnych kontaktach admina).

Zakres zmian:
- tylko frontend (`MyAccount.tsx`), bez migracji DB i bez zmian RLS.

Ryzyko:
- niskie; zmiana dotyczy jedynie warunku widoczności zakładki i nie ingeruje w logikę zapisu danych.
