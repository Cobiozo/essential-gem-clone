## Cel

1. Usunąć z e-maila z biletem przycisk CTA „Otwórz bilet online" oraz zduplikowany tekst widoczny w podglądzie Gmaila (powyżej szablonu).
2. Zagwarantować, że PDF z biletem zawsze trafia do załącznika.
3. Wysłać ponownie poprawioną wiadomość do zarejestrowanego partnera oraz gościa (Jan Kowal) wydarzenia „Kompleksowe szkolenie TEST".

## Zmiany w kodzie

### `supabase/functions/_shared/free-event-ticket.ts`

**`buildTicketEmail`** — uproszczenie treści HTML:
- Usunąć cały blok `<div>` z przyciskiem „Otwórz bilet online" oraz parametr `ticketViewUrl`.
- Zmienić zdanie wprowadzające do PDF na: „Twój bilet (PDF z kodem QR) znajduje się w załączniku tej wiadomości. Wystarczy, że okażesz go (na telefonie lub wydrukowany) podczas wydarzenia."
- Zachować nagłówek, dane wydarzenia, blok z numerem biletu i przypomnienie o świadomej obecności.

**`sendSmtp`** — naprawa duplikatu nad szablonem (plain-text part):
- Obecnie część `text/plain` wiadomości to całe HTML pozbawione tagów, co Gmail pokazuje jako szary tekst nad właściwym mailem.
- Zamienić na krótki, ręcznie napisany odpowiednik (powitanie + info „Twój bilet znajduje się w załączniku PDF" + numer biletu), zamiast `html.replace(/<[^>]*>/g, "")`.

**`issueFreeTicketForOrder`** — gwarancja PDF-a:
- Jeśli generacja PDF się nie uda (`pdfBytes === null`), zalogować błąd i **przerwać** wysyłkę zwracając `{ sent: false, reason: "pdf_failed" }` — wtedy `ticket_sent_at` nie zostanie ustawione, więc kolejne uruchomienie spróbuje ponownie.
- Usunąć fallback `sendSmtp` bez załącznika (był on dodany dla 421 timeout, ale w efekcie wysyłano mail bez biletu).
- Dla 421 timeout: zwiększyć timeout odczytu na komendzie `DATA` do 60 s i ponowić wysyłkę z załącznikiem jednokrotnie po krótkim odczekaniu.

### Ponowna wysyłka (operacja jednorazowa)

Po wdrożeniu poprawek:
1. Zidentyfikować w bazie zamówienia dla wydarzenia „Kompleksowe szkolenie TEST":
   - gość: Jan Kowal (order `ec456ea1…`, kod `DHHF47B43VX7`)
   - partner: znaleźć aktywne zamówienie z `event_form_submissions` powiązane z tym wydarzeniem (zarejestrowany, zalogowany użytkownik)
2. Wyzerować `ticket_sent_at = NULL` dla obu zamówień (przez migrację SQL, bo to UPDATE).
3. Wywołać `issueFreeTicketForOrder` dla obu zamówień (przez tymczasowe wywołanie edge funkcji lub bezpośrednio z `confirm-event-form-email` w trybie „resend").

## Czego nie zmieniam

- Szablon graficzny biletu PDF (`generate-event-ticket-pdf`) — bez zmian.
- Logika tworzenia zamówienia w `confirm-event-form-email` — bez zmian, działa.
- Inne wiadomości transakcyjne — bez zmian.
