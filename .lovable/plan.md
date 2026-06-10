## Zmiany do wprowadzenia

### 1. Nagłówek linku — zmiana globalna
Nagłówek widoczny na zrzucie pochodzi z `src/components/paid-events/PaidEventCard.tsx` (linia 188), nie z `MyEventFormLinks.tsx`. Dlatego poprzednia zmiana nie była widoczna na karcie wydarzenia.

- **`src/components/paid-events/PaidEventCard.tsx`** — zmienić fallback klucza `events.partnerLinkTitle` z `'Twój link partnerski do tego wydarzenia'` na `'Twój link zapraszający na to wydarzenie'`.
- **`src/components/paid-events/MyEventFormLinks.tsx`** — upewnić się, że oba warianty (z `eventId` i bez) używają sformułowania „zapraszający"; nagłówek listy zmienić z „Moje linki partnerskie do formularzy rejestracyjnych" na „Moje linki zapraszające na wydarzenia".
- **`src/components/admin/paid-events/editor/EventTicketsPanel.tsx`** (linia 392) — w opisie audience `guest_only` zamienić frazę „weszli przez link partnerski" na „weszli przez link zapraszający".

Komentarze techniczne (`MyEventFormReferrals.tsx`) zostawiam — to JSDoc, nie UI.

### 2. Weryfikacja śledzenia rejestracji z linku gościa — bez zmian w kodzie

Sprawdziłem przepływ end-to-end. System **już dziś** poprawnie rozpoznaje rejestracje pochodzące z linku gościa i przypisuje je do jego konta:

1. Gość generuje link w `MyEventFormLinks.tsx`. Brak EQID → kod gościa `g-<8 znaków z user.id>` (deterministyczny, unikalny per user). Wpis ląduje w `paid_event_partner_links` z `partner_user_id = <user.id gościa>`, `ref_code = 'g-…'`, `form_id`, `event_id`.
2. Osoba zaproszona otwiera `/event-form/<slug>?ref=g-XXXXXXXX`. `EventFormPublicPage.tsx` wywołuje RPC `submit_event_form(_ref_code := 'g-…')`.
3. RPC `submit_event_form` (SECURITY DEFINER) wyszukuje rekord w `paid_event_partner_links` po `ref_code + form_id + is_active`, pobiera z niego `partner_user_id` i zapisuje go w `event_form_submissions.partner_user_id`. **Logika nie rozróżnia, czy `ref_code` należy do partnera czy gościa — działa tak samo.**
4. RPC zwiększa `paid_event_partner_links.submission_count` i dodaje wpis do CRM gościa w `team_contacts` (z pominięciem, gdy e-mail należy do użytkownika platformy).

Skutki dla widoków:
- **Gość** widzi swoich zapisanych przez `MyEventFormReferrals` (`SELECT … WHERE partner_user_id = auth.uid()` — polityka RLS już dopuszcza gościa, bo filtruje po `auth.uid()`).
- **Admin** widzi to w `GuestRegistrationsPanel` (zarówno w zakładce „Rejestracje gości", jak i w karcie pojedynczego gościa) — panel filtruje `paid_event_partner_links` po `partner_user_id` gościa oraz pokazuje powiązane submissions z `event_form_submissions`.

Nie wymaga to migracji ani zmian w RPC — schemat i polityki już wspierają ten przepływ. Po zatwierdzeniu wykonam tylko punkt 1 (UI) i potwierdzę w preview, że nagłówek się zmienił.