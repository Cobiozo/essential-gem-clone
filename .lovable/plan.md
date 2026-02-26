

## Zamiana przycisku UpLine na przycisk informacji o rejestracji na spotkanie

### Kontekst

Ikona dłoni (`HandHelping`) to przycisk "Poproś UpLine o pomoc". Zostanie usunięty i zastąpiony przyciskiem informacyjnym pokazującym, czy dany kontakt prywatny zarejestrował się na spotkanie (webinar).

### Dane w bazie

Tabela `guest_event_registrations` posiada kolumnę `team_contact_id` (powiązanie z kontaktem) oraz `status` (aktualnie tylko "registered"). Dane o wydarzeniach (tytuł, data) są w tabeli `events`.

### Plan zmian

#### 1. Nowy komponent: `ContactEventInfoButton.tsx`

Zastąpi `UplineHelpButton`. Komponent:
- Pobierze z bazy rejestracje gościa powiązane z danym `contact.id` (`team_contact_id`)
- Wyświetli ikonę `CalendarCheck` (jeśli ma rejestracje) lub `CalendarX2` (brak)
- Po najechaniu (tooltip) pokaże podsumowanie: ile rejestracji, na jakie spotkania
- Po kliknięciu otworzy popover/dialog z listą spotkań:
  - Tytuł wydarzenia
  - Data
  - Status rejestracji (zarejestrowany / anulowany)

#### 2. Aktualizacja `TeamContactsTable.tsx`

- Usunięcie importu `UplineHelpButton`
- Dodanie importu nowego `ContactEventInfoButton`
- Zamiana `<UplineHelpButton contact={contact} />` na `<ContactEventInfoButton contact={contact} />`

#### 3. Usunięcie pliku `UplineHelpButton.tsx`

Plik `src/components/team-contacts/UplineHelpButton.tsx` zostanie usunięty (nie jest używany nigdzie indziej).

### Wygląd nowego przycisku

- Ikona: `CalendarCheck` (zielona) gdy kontakt ma rejestracje na spotkania, `Calendar` (szara) gdy brak
- Tooltip: "Zarejestrowany na X spotkań" lub "Brak rejestracji na spotkania"
- Kliknięcie: Popover z listą wydarzeń i statusami

### Zakres

- 1 nowy plik komponentu
- 1 edycja (`TeamContactsTable.tsx`)
- 1 usunięcie (`UplineHelpButton.tsx`)
- Brak zmian w bazie danych
