## Cel

Na stronie pojedynczego wydarzenia (`/event/:slug`, np. TEST – KRAKÓW) zalogowany **partner** ma widzieć swój osobisty link partnerski do formularza rejestracyjnego powiązanego z tym konkretnym wydarzeniem — z możliwością wygenerowania go (jeśli jeszcze nie istnieje), skopiowania oraz podejrzenia statystyk (kliknięcia / zapisani).

Funkcjonalność istnieje już dla całego listingu w komponencie `MyEventFormLinks` (renderowanym na `/paid-events`). Należy ją wykorzystać w wersji "filtrowanej do jednego wydarzenia" na podstronie wydarzenia.

## Zakres zmian

### 1. `src/components/paid-events/MyEventFormLinks.tsx`
- Dodać opcjonalny prop `eventId?: string`.
- Jeżeli `eventId` jest przekazane → query filtruje formularze tylko dla tego wydarzenia (`.eq('event_id', eventId)`), a nagłówek/opis sekcji jest skrócony i dopasowany do kontekstu pojedynczego wydarzenia (np. "Twój link partnerski do tego wydarzenia").
- Brak formularzy → komponent zwraca `null` (jak obecnie), więc nic się nie pokazuje, gdy admin nie utworzył jeszcze formularza dla danego eventu.
- Brak formularzy aktywnych dla niezalogowanych / klientów / specjalistów: komponent i tak ukrywa się, gdy `!user`. Dodatkowo ograniczamy widoczność do partnerów (i administratorów) — `useAuth().isPartner || isAdmin`.

### 2. `src/pages/PaidEventPage.tsx`
- Zaimportować `MyEventFormLinks`.
- Pod sekcjami CMS (lub w bocznej kolumnie pod `PaidEventSidebar`) wyrenderować `<MyEventFormLinks eventId={event.id} />` — tylko gdy użytkownik jest zalogowany jako partner/admin.
- Lokalizacja: w głównej kolumnie treści, na samym dole (pod `contentSections.map(...)`), żeby nie psuć layoutu sidebaru sticky. Sekcja pojawi się jako wyróżniony blok "Moje narzędzia partnera" tylko dla uprawnionych ról i tylko jeśli istnieje aktywny formularz dla tego wydarzenia.

### 3. Brak zmian w bazie danych
Tabele `event_registration_forms` i `paid_event_partner_links` mają już wymagane kolumny i RLS (zatwierdzone w poprzednim kroku). Wystarczy filtrowanie po `event_id` po stronie klienta.

## Efekt dla użytkownika

- **Partner** wchodzi na stronę wydarzenia (np. TEST – KRAKÓW) → pod treścią widzi kafelek "Twój link partnerski do formularza rejestracyjnego" z przyciskiem "Wygeneruj mój link" lub gotowym linkiem `…/event-form/<slug>?ref=<kod>` + statystyki kliknięć i zapisanych.
- **Klient / Specjalista / Gość** — sekcji nie widzi.
- **Admin** — widzi sekcję jak partner (do testów).
- Na `/paid-events` (listing) zachowanie pozostaje bez zmian — dalej widać linki do wszystkich aktywnych formularzy.
