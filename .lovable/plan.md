
# Dodanie akcji do kontaktów z materiałów ZW

## Problem
Karty gości w zakładce "Z udostępnionego materiału ZW" nie mają przycisków akcji (przenieś do mojej listy, zaproś na wydarzenie, edytuj, usuń), które są dostępne w zakładkach "Z zaproszeń na...".

## Rozwiązanie
Dodanie wiersza z przyciskami akcji do każdej karty gościa w `HKMaterialContactsList.tsx`, analogicznie do `EventGroupedContacts.tsx`.

## Dostępne akcje
1. **Przenieś do Mojej listy** (`UserPlus`) — tworzy nowy `team_contacts` rekord z danymi gościa HK i oznacza `contact_source: 'Materiał ZW'`
2. **Zaproś na wydarzenie** (`Send`) — otwiera dialog `InviteToEventDialog`
3. **Historia** (`History`) — otwiera `TeamContactHistoryDialog` (dostępna tylko jeśli kontakt został przeniesiony do listy)
4. **Edytuj** (`Edit`) — otwiera formularz edycji (dostępna tylko jeśli kontakt został przeniesiony)
5. **Usuń** (`Trash2`) — soft-delete z potwierdzeniem (dostępna tylko jeśli kontakt został przeniesiony)

## Zmiany w plikach

### 1. `HKMaterialContactsList.tsx`
- Dodanie nowych props: `onMoveToOwnList`, `onEdit`, `onDelete`, `getContactHistory`
- Dodanie wiersza z przyciskami akcji pod metadanymi każdej karty (ikony: `UserPlus`, `Send`, `History`, `Edit`, `Trash2`)
- Dodanie stanów lokalnych: `deleteConfirm`, `historyContact`, `duplicateConfirm`, `inviteContact`
- Import `InviteToEventDialog`, `TeamContactHistoryDialog`, dialogi potwierdzenia (AlertDialog)
- Dla "Zaproś na wydarzenie" i "Przenieś do listy" — konwersja `HKSessionContact` do minimalnego obiektu `TeamContact` (imię, nazwisko, email, telefon)

### 2. `TeamContactsTab.tsx`
- Dodanie nowej funkcji `moveHkSessionToOwnList(session)` — tworzy kontakt via `addContact` z `contact_source: 'Materiał ZW'`, `moved_to_own_list: true`
- Przekazanie callbacków `onMoveToOwnList`, `onEdit`, `onDelete`, `getContactHistory` do `HKMaterialContactsList`

## Szczegóły techniczne
- "Przenieś do listy" dla HK sesji wymaga **utworzenia** nowego `team_contacts` (nie aktualizacji istniejącego), bo HK sesje żyją w `hk_otp_sessions`, nie w `team_contacts`
- Po przeniesieniu, karta wyświetli badge "W mojej liście" (analogicznie do zaproszeń)
- Deduplikacja po emailu — jeśli kontakt z tym emailem już istnieje, dialog potwierdzenia
