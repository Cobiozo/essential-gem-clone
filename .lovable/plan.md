## Problem

W zakładce **Eventy → Formularze → Zgłoszenia → Partnerzy** ten sam partner (np. Sebastian Snopek) pojawia się wielokrotnie. Weryfikacja w bazie potwierdza:

| Email | Liczba wpisów |
|---|---|
| sebastiansnopek87@gmail.com | 6 |
| sebastiansnopek.eqology@gmail.com | 2 |
| dawidkowalczyk.king@gmail.com | 2 |
| byk1023@wp.pl | 2 |
| xdawidkowalczyk@gmail.com | 2 |

**Przyczyna**: każde kliknięcie „Kup bilet / Zarezerwuj" przez tę samą osobę tworzy nowy rekord w `paid_event_orders`, a backfill mirrored każde zamówienie do `event_form_submissions` jako osobny wpis. Dodatkowo brak ograniczenia unikalności pozwalał na duplikaty.

Wbrew temu co sugeruje wiadomość — funkcja „Wyślij ponownie e-mail" (ikona koperty) **nie tworzy** nowego wpisu, ona aktualizuje istniejący. Ale problem efektywnie ten sam: lista pokazuje wielokrotnie tego samego partnera/gościa.

## Rozwiązanie

Jedna pozycja na unikalną parę **(formularz, e-mail)** — niezależnie od liczby zamówień, ponowień maila czy rejestracji.

### 1. Deduplikacja istniejących danych (migracja)

Dla każdej pary `(form_id, lower(email))`:
- zachować **najnowszy** wpis (`created_at DESC`),
- agregować na nim metadane wszystkich zamówień (lista `order_ids` w `submitted_data`),
- usunąć pozostałe duplikaty,
- przeliczyć `submission_count` na `paid_event_partner_links`.

### 2. Unikalny indeks bazodanowy

```sql
CREATE UNIQUE INDEX event_form_submissions_form_email_unique
  ON event_form_submissions (form_id, lower(email));
```

Twardy bezpiecznik — od tego momentu baza fizycznie nie pozwoli na drugi wpis tej samej osoby w tym samym formularzu.

### 3. Idempotentne mirrorowanie zamówień (Edge Function)

W `register-event-transfer-order/index.ts`:
- zamiast `insert` użyć `upsert` z `onConflict: 'form_id,email'` (po dodaniu unikalnego indeksu),
- jeśli wpis istnieje — **nie inkrementować** `submission_count` partnera (to ten sam partner/gość),
- aktualizować jedynie `submitted_data.order_ids` (dopisanie nowego `order_id` do listy), tak aby admin miał wgląd we wszystkie powiązane zamówienia tej osoby.

### 4. Brak zmian w resendzie

`send-event-form-confirmation` już teraz tylko aktualizuje istniejący rekord — zostawiamy bez zmian. Po pkt 1–3 ponowne wysłanie maila nigdy nie wygeneruje nowej pozycji.

## Pliki

- nowa migracja: `supabase/migrations/<ts>_dedupe_event_form_submissions.sql`
  - dedup + unique index + przeliczenie liczników
- `supabase/functions/register-event-transfer-order/index.ts`
  - zamiana `insert` na `upsert`/`select-then-update`, warunkowy increment licznika

## Efekt po wdrożeniu

W zakładce „Partnerzy" widoczne będą 4 unikalne osoby (zamiast 12), liczniki partnerów będą poprawne, a każde kolejne kliknięcie „Kup bilet" lub „Wyślij ponownie e-mail" przez tę samą osobę zaktualizuje istniejący wiersz, nigdy nie utworzy nowego.