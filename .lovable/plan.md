## Cel
Gość (rola `guest`) generuje własny link partnerski do wydarzenia tak samo jak partner, widzi zapisanych przez ten link, a administrator widzi to w zakładce „Goście" w panelu admina.

## Stan obecny
- Tabela `paid_event_partner_links` (kolumny: `partner_user_id`, `form_id`, `event_id`, `ref_code`, `click_count`, `submission_count`) — już istnieje.
- Tabela `event_form_submissions` (`partner_user_id`, `partner_link_id`, `form_id`, `event_id`, dane gościa, statusy) — już istnieje.
- RLS pozwala każdemu zalogowanemu użytkownikowi tworzyć własny link (`auth.uid() = partner_user_id`) i czytać własne rejestracje — działa dla gościa bez zmian.
- Komponent `MyEventFormLinks.tsx` i lista w `PaidEventsListPage.tsx` są zagatekowane na `isPartner || isAdmin` — gość jest blokowany.
- W `GuestsManagement.tsx` brak widoku linków/rejestracji gościa.

Brak migracji DB — wykorzystujemy istniejące tabele i polityki.

## Zmiany

### 1. Odblokowanie linku partnerskiego dla gościa
`src/components/paid-events/MyEventFormLinks.tsx`
- `useAuth()` rozszerzyć o `isGuest`.
- `enabled` w query → `!!user && (isPartner || isAdmin || isGuest)`.
- Końcowy guard `if (!user || (!isPartner && !isAdmin && !isGuest) || forms.length === 0) return null;`.
- Wymóg EQID: gość nie ma EQID — zmienić ref_code: jeśli brak `eq_id`, użyć stabilnego `g-<8-znaków-z-user.id>` (prefix `g-` jednoznacznie identyfikuje gościa-promotora). Walidacja unikalności — `upsert` po `(partner_user_id, form_id)` już zapewnia jeden link na formularz.
- Tekst nagłówka pozostaje, ale w `headerDesc` dla gościa pokazać krótką notkę „Twój link rejestruje zaproszonych pod Tobą".

`src/pages/PaidEventsListPage.tsx`
- `canSeeForms` już zawiera `isGuest` — bez zmian; weryfikacja, że sekcja `MyEventFormLinks` jest pokazywana również gościowi (po zmianach w pkt 1 będzie).

### 2. Filtrowanie listy formularzy dla gościa
`src/components/paid-events/MyEventFormLinks.tsx`
- Pobrać `useGuestVisibility()`; jeśli `guestActive`, odfiltrować `forms` do tych, których `event_id` jest dozwolone przez `gv('events', form.event_id)` (spójne z istniejącym filtrem listy wydarzeń).

### 3. Widok rejestracji w panelu wydarzenia gościa
Komponent `MyEventFormReferrals.tsx` już renderuje listę osób zapisanych przez link aktualnie zalogowanego użytkownika i działa generycznie po `auth.uid()`. Bez zmian.

### 4. Panel administratora — zakładka „Goście"
`src/components/admin/GuestsManagement.tsx`
- W liście `guests` (`GuestsList`) dla każdego gościa dodać sekcję rozwijaną „Linki partnerskie i rejestracje" (Collapsible):
  - Query A: `paid_event_partner_links` po `partner_user_id = guest.id` z joinem do `paid_events!event_id (title, event_date, location)` i `event_registration_forms!form_id (title, slug)`.
  - Query B per link: `event_form_submissions` po `partner_link_id = link.id` (lub `partner_user_id = guest.id` zgrupowane po `form_id`) — pola: `first_name`, `last_name`, `email`, `phone`, `status`, `payment_status`, `created_at`.
  - Renderować tabelkę: wydarzenie → tytuł formularza → URL linku (z przyciskiem „Kopiuj"), licznik kliknięć, licznik zapisanych, rozwijana lista zapisanych osób.
  - Eksport XLSX rejestracji per gość (wzorzec z `LeaderEventRegistrationsView.tsx`).
- Nowa pod-zakładka u góry zakładki „Goście" (jeśli są już zakładki) lub samodzielna karta na dole listy: „Podsumowanie rejestracji gości" — agregat wszystkich linków gości i ich rejestracji w jednej tabeli filtrowanej po wydarzeniu.

### 5. Drobne porządki
- W `useGuestVisibility.ts` upewnić się, że `sidebar.items.paidEvents = true` i schema admina pozwala administratorowi włączać konkretne wydarzenia per gość — to już zrobione w poprzedniej iteracji, tutaj tylko weryfikacja.
- W `PaidEventsListPage` upewnić się, że gość po wejściu w wydarzenie widzi sekcję „Mój link partnerski" (komponent `MyEventFormLinks` z propem `eventId`) — wynika z pkt 1.

## Szczegóły techniczne
- Brak migracji DB i brak nowych edge functions.
- Ref-code gościa: prefix `g-` + skrót `user.id` (deterministyczny, stabilny). Nie koliduje z EQID partnerów (te są numeryczne/alfanumeryczne bez prefiksu `g-`).
- Statystyki (`click_count`, `submission_count`) inkrementują się istniejącym mechanizmem śledzenia kliknięć/submitów.
- Powiązanie rejestracji z gościem-promotorem: zapisywane w `event_form_submissions.partner_user_id` przez istniejącą logikę formularza (zaczytuje ref z URL → `paid_event_partner_links` → `partner_user_id`).

## Out of scope
- Prowizje finansowe od rejestracji gościa.
- Zmiany szablonów maili.
- Generowanie linku partnerskiego do form innych niż „event registration form" (np. webinarów).
