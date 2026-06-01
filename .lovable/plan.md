## Plan: dwa naprawy w obsłudze biletów

### 1) Panel "Twoje bilety na to wydarzenie" (karta wydarzenia w zakładce Eventy)

Obecnie widać tu wszystkie zamówienia (w tym anulowane) i brakuje przycisku otwierającego bilet z QR.

Zmiany w `src/components/paid-events/MyEventTicketsInline.tsx`:

- **Filtrowanie:** zwykły zalogowany użytkownik widzi tylko jeden aktualny, ważny bilet – statusy `paid` i `completed` (oraz `confirmed` dla darmowych). Anulowane / zwrócone / nieudane / wygasłe są ukryte.
- **Widoczność dla admina:** sekcja „+N anulowanych" oraz pełna lista nieaktywnych zamówień renderowana wyłącznie gdy zalogowany użytkownik ma rolę `admin` (`useAuth().isAdmin`). Pozostali nie zobaczą żadnej informacji o anulowanych pozycjach.
- **Przycisk „Otwórz bilet (kod QR)":** dla każdego aktywnego biletu z `ticket_code` dodajemy przycisk linkujący do istniejącej strony `/ticket/:code` (`src/pages/TicketPage.tsx`), gdzie wyświetla się ten sam bilet z QR co w mailu. Otwarcie w nowej karcie.
- **Etykiety/skrót:** licznik „X biletów" liczy tylko aktywne. Tekst statusu pokazuje tylko aktualny, ważny bilet.

### 2) Lista zgłoszeń w CMS – brakuje partnerów

W `Admin → Płatne wydarzenia → Formularze → [wydarzenie] → Zgłoszenia` widać tylko gościa, mimo że Sebastian Snopek ma opłacone zamówienie (`paid_event_orders`).

Diagnoza:
- Formularz `50a75084-…` jest poprawnie powiązany z eventem `c38f3e14-…` (Kompleksowe szkolenie TEST).
- W bazie istnieje 9 zamówień dla tego eventu (1 opłacone, 1 oczekujące, 7 anulowanych), w tym opłacone od zalogowanego partnera (`user_id = 629a2d9a-…`).
- Komponent `EventFormSubmissions.tsx` próbuje już mergować `paid_event_orders`, ale nie pokazuje żadnego z 9 rekordów – zatem zapytanie wraca puste (najpewniej cichy błąd / brak danych z powodu obsługi typu `eventId`).

Zmiany w `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx`:

- **Twardy log błędów** dla zapytania `event-form-submissions-orders` (console.error + toast w przypadku błędu RLS/uprawnień, aby było wiadomo dlaczego pusto).
- **Bezpieczne pobranie zamówień przez Edge Function** jako fallback: jeżeli bezpośredni `select` zwróci 0 rekordów, użyjemy istniejącej autoryzacji admina (`verifyAdmin`) – stworzymy nową edge function `admin-list-event-orders` (input: `event_id`, wymaga roli `admin`), która użyje `service_role` i zwróci pełną listę zamówień wraz z `ticket_code`, statusem, danymi kupującego, `email_confirmed_at`, `checked_in`. To gwarantuje, że admin widzi wszystkich partnerów niezależnie od subtelnych problemów RLS / cache.
- **Mapowanie do wiersza zgłoszenia** pozostaje jak dziś, ale dodajemy `email_status` = `confirmed`/`sent`/`cancelled` oraz uwzględniamy status `awaiting_email_confirmation` jako „pending" (kolor żółty).
- **Zakładki Goście/Partnerzy:** `isPartnerSubmission` rozszerzamy o sprawdzenie czy `email` zamówienia pasuje (case-insensitive) do dowolnego rekordu `profiles` – wtedy gość, który ma już konto, też trafi do „Partnerzy". Dla rekordów z `__source = 'order' && __orderUserId` zawsze partner.
- **Dedup**: jeżeli ten sam e-mail występuje i w `event_form_submissions`, i w `paid_event_orders`, pokazujemy oba wiersze (zachowanie obecne) – admin chce widzieć każdy ślad.

### Techniczne szczegóły

- Nowa edge function: `supabase/functions/admin-list-event-orders/index.ts` – używa `verifyAdmin` z `_shared/admin-auth.ts`, zwraca `paid_event_orders` (+ joinem `paid_event_tickets.name`) dla podanego `event_id`.
- Komponent admina najpierw próbuje bezpośredniego `select`, a w razie błędu lub pustej odpowiedzi (gdy są inne wskaźniki, że powinny być rekordy – np. licznik z `event_form_submission_counts` lub po prostu zawsze) wywołuje edge function.
- W `MyEventTicketsInline` link do biletu: `window.open('/ticket/' + ticket_code, '_blank')` lub `<Link to>` – używamy istniejącej trasy `/ticket/:code`.
- Brak zmian w bazie ani w typach Supabase.

### Weryfikacja po implementacji

1. Karta wydarzenia jako zwykły partner (Sebastian) → widoczny tylko 1 opłacony bilet + przycisk „Otwórz bilet (QR)", brak anulowanych.
2. Karta wydarzenia jako admin → ten sam widok + opcjonalna lista anulowanych pod spodem.
3. Admin → Formularze → Zgłoszenia: widoczny gość `jan kowal` i partner `Sebastian Snopek` (zakładka „Partnerzy (1)").
