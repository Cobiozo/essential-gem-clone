## Problemy do rozwiązania

### 1. Błąd uploadu tła biletu („new row violates row-level security policy")

Bucket `event-tickets` istnieje, polityki RLS odwołują się do `has_role(auth.uid(),'admin')` i `is_admin()`. Mimo to upload bezpośrednio z przeglądarki czasami trafia w błąd RLS (m.in. przez kolejność polityk SELECT, nakładające się reguły na `storage.objects` i fakt, że bucket jest publiczny). Najpewniejsze rozwiązanie: przenieść upload tła do funkcji brzegowej z `service_role`, która jednoznacznie weryfikuje rolę admina przez JWT i wgrywa plik z pominięciem RLS.

**Zmiany:**
- Nowa funkcja `upload-ticket-template-bg` (POST, multipart/form-data, weryfikacja admina przez `verifyAdmin`, upload do `event-tickets/templates/{eventId}/bg.{ext}` z `service_role`, zwraca `{ url, width, height }`).
- `EventTicketTemplatePanel.tsx`: zamiast `supabase.storage.upload` wywołuje fetch do nowej funkcji z FormData (plik + eventId). Po sukcesie zapisuje `background_url` w `event_ticket_templates`.
- Komunikat błędu wyświetla treść z odpowiedzi (np. „Brak uprawnień admina").

### 2. Legenda skrótów w edytorze pól biletu

W panelu `Szablon → Edytor pól` pod kanwą dodać sekcję „Dostępne pola (skróty)" — pełna lista kluczy, które system automatycznie zaciąga z zamówienia/wydarzenia, plus przycisk „Dodaj na płótno" obok każdego.

Lista skrótów do udokumentowania (zgodna z obecnym generatorem PDF):

| Klucz | Co podstawia system |
|---|---|
| `eventTitle` | Tytuł wydarzenia |
| `eventDate` | Data i godzina rozpoczęcia |
| `eventEndDate` | Data i godzina zakończenia |
| `eventLocation` | Lokalizacja (miasto/adres/online) |
| `firstName` | Imię uczestnika |
| `lastName` | Nazwisko uczestnika |
| `fullName` | Imię + nazwisko |
| `email` | E-mail uczestnika |
| `phone` | Telefon uczestnika |
| `ticketName` | Nazwa biletu (np. „Bilet wstępu") |
| `ticketCode` | Kod biletu (np. EVJT5GJXJVYJ) |
| `seatNumber` | Numer miejsca (dla biletów grupowych) |
| `orderNumber` | Numer zamówienia |
| `qr` | Kod QR z linkiem do weryfikacji |

**Zmiany:**
- W `EventTicketTemplatePanel.tsx` rozszerzyć `FIELD_LABELS` o nowe klucze (`eventEndDate`, `fullName`, `email`, `phone`, `orderNumber`) i dodać pod edytorem kartę „Legenda skrótów" — tabelka z kluczem, opisem oraz akcją „Dodaj" (gdy pole nie jest jeszcze na kanwie).
- W `generate-event-ticket-pdf` dopisać podstawianie nowych kluczy (mapowanie z `order`, `attendee`, `event`).

### 3. Weryfikacja biletu zwraca „Ticket code is required"

Bug po stronie front-endu: `TicketVerification.tsx` wysyła do funkcji `verify-event-ticket` body z polami `ticket_code` / `perform_check_in`, ale funkcja oczekuje `ticketCode` / `markAsCheckedIn`. Stąd 400 „Ticket code is required". Dodatkowo:
- Funkcja przyjmuje tylko `status === 'paid'` — bezpłatne rezerwacje mają `status = 'confirmed'`, więc nawet po naprawie front-endu zwracałaby NOT_PAID.
- Sprawdza rolę admina po nieistniejącej kolumnie `profiles.role` zamiast tabeli `user_roles`.
- Odpowiedź funkcji ma kształt `{ valid, attendee, event, order, ticket }`, a front oczekuje `data.ticket.buyer_name`, `event_title`, `event_date`, `is_checked_in` itp. — wynik pokazałby się jako „prawidłowy", ale puste pola.
- Bilet jest na wydarzenie 4 lipca 2026, a sprawdzenie `TOO_EARLY` blokuje check-in więcej niż 2h przed startem. Dla potrzeb panelu admina (weryfikacja przed dniem wydarzenia) wprowadzić tryb „tylko sprawdź" (`markAsCheckedIn=false`) który nie zwraca TOO_EARLY — informuje tylko „bilet ważny, check-in możliwy od X" zamiast `valid:false`.

**Zmiany:**
- `TicketVerification.tsx`: wysyłać `ticketCode` i `markAsCheckedIn`; mapować odpowiedź z nowego kształtu (`attendee.firstName + lastName`, `event.title`, `event.date`, `checkedIn`, `ticketCode` z `order.ticketCode`).
- `supabase/functions/verify-event-ticket/index.ts`:
  - akceptować zarówno `ticketCode` jak i `ticket_code` (oraz `markAsCheckedIn`/`perform_check_in`) – wsteczna kompatybilność,
  - rola admina przez `user_roles` (`has_role`),
  - akceptować statusy `paid` **oraz** `confirmed` (wydarzenia bezpłatne) jako ważne,
  - dla `markAsCheckedIn=false` zwracać `valid:true` nawet gdy `now < checkInStart`, dorzucając pole `checkInStartsAt` jako informację (front pokaże „bilet ważny, check-in dostępny od …"),
  - zachować `TOO_EARLY`/`EVENT_ENDED` tylko gdy faktycznie próbuje wykonać check-in.

## Pliki do zmiany
- `supabase/functions/upload-ticket-template-bg/index.ts` (nowy)
- `supabase/functions/verify-event-ticket/index.ts`
- `supabase/functions/generate-event-ticket-pdf/index.ts`
- `src/components/admin/paid-events/editor/EventTicketTemplatePanel.tsx`
- `src/components/admin/paid-events/TicketVerification.tsx`

Brak zmian w bazie – polityki RLS pozostają, ale upload tła idzie bocznym kanałem przez funkcję brzegową.
