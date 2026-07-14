## Problem

W panelu admina (Eventy → Rejestracje → Goście) kolumna „Powiadomienia" pokazuje tylko dwa ogólne znaczniki: ✉ (email potwierdzający) i ⏰ (jakiekolwiek przypomnienie). Nie widać, które konkretnie przypomnienie (24h / 12h / 2h / 1h / 15min) trafiło do danego gościa i nie ma przycisku „Wyślij ponownie" dla konkretnego typu — dlatego przy awariach CRON-a nie można ani zweryfikować kto dostał, ani nadgonić brakujących wysyłek z linkiem do Zoom.

Dane o realnych wysyłkach już są w tabeli `occurrence_reminders_sent` (klucz: `event_id + occurrence_datetime + reminder_type + recipient_email`) — trzeba je tylko wyeksponować w UI i podpiąć akcje.

## Zakres zmian

### 1. Backend — nowy tryb pojedynczej wysyłki w `send-bulk-webinar-reminders`

Dodać opcjonalne parametry do istniejącej edge function:

- `recipient_emails: string[]` — lista konkretnych adresów, do których wysłać.
- `force: boolean` — pomija sprawdzanie `occurrence_reminders_sent` (żeby faktycznie wysłać powtórnie).

Zachowanie:
- Gdy `recipient_emails` podane: pobiera się tylko wpisy z `guest_event_registrations` / `event_registrations` pasujące do tych maili + eventu + wybranej okazji (jak dziś).
- `force=true` nie kasuje zapisu w `occurrence_reminders_sent`, tylko go pomija przy dedupie i robi `upsert` po wysyłce (znany conflict target już to zniesie).
- Logowanie do `email_logs` i `occurrence_reminders_sent` bez zmian.

To trzyma jedną ścieżkę wysyłki (te same szablony `webinar_reminder_2h/1h/15min` z linkiem Zoom) — nie tworzymy równoległej funkcji.

### 2. Frontend — kolumna „Powiadomienia" per gość

W `src/components/admin/EventRegistrationsManagement.tsx` (tab Goście):

1. Po załadowaniu gości dla wybranego eventu/okazji dociągnąć rekordy z `occurrence_reminders_sent`:
   ```
   .from('occurrence_reminders_sent')
   .select('recipient_email, reminder_type, created_at')
   .eq('event_id', selectedEventId)
   .eq('occurrence_datetime', termDatetime.toISOString())
   ```
   i zbudować mapę `email → { '24h'?: date, '12h'?: date, '2h'?: date, '1h'?: date, '15min'?: date }`.
2. Zamienić dwa obecne ogólne znaczniki na siatkę 5 mini-badge'ów (`24h | 12h | 2h | 1h | 15m`) — każdy w jednym z trzech stanów:
   - zielony ✓ z tooltipem „Wysłano: 14.07.2026 19:44" (jeśli jest wpis w `occurrence_reminders_sent`),
   - szary ✗ „Nie wysłano" (brak wpisu, ale termin już minął ± okno),
   - neutralny „—" gdy dane okno przypomnienia jest jeszcze przed nami.
3. Zostawić pierwszy badge ✉ z `confirmation_sent` (email potwierdzający rejestrację) — bez zmian.

### 3. Frontend — akcje „Ponów"

Dwa poziomy:

- **Per gość (kolumna Akcje)**: obok istniejącej koperty dodać dropdown „Ponów przypomnienie ▾" z pozycjami `24h / 12h / 2h / 1h / 15min`. Klik → wywołanie funkcji z `recipient_emails: [guest.email]`, `reminder_type`, `event_id`, `occurrence_index`/`occurrence_datetime`, `force: true`. Toast „Wysłano do X" i odświeżenie mapy.
- **Zbiorczo (nad tabelą, obok „Email po webinarze")**: przycisk „Ponów wysyłkę ▾" z pięcioma typami. Wysyła do **wszystkich gości aktualnego eventu/okazji, którzy nie mają jeszcze wpisu** dla wybranego typu (bez `force` — tylko uzupełnienie braków). Do tego drugi wariant „Wyślij ponownie do wszystkich (force)" pod potwierdzeniem AlertDialog.

Obie akcje dostępne tylko dla admina (obecny gating tabu wystarczy).

### 4. Weryfikacja

- Wybrać event ze zrzutu (72 gości), otworzyć zakładkę Goście — każdy wiersz ma 5 kolorowych statusów zamiast jednego ⏰.
- Kliknąć „Ponów 15min" dla gościa bez zielonego znacznika, potwierdzić że pojawił się wpis w `occurrence_reminders_sent` i mail dotarł.
- Sprawdzić że dedup `send-bulk-webinar-reminders` nadal działa dla CRON-owego trybu automatycznego (bez `force`).

## Sekcja techniczna

Pliki do zmiany:
- `supabase/functions/send-bulk-webinar-reminders/index.ts` — parametry `recipient_emails`, `force`; filtr odbiorców i pominięcie `alreadySentEmails` gdy `force`.
- `src/components/admin/EventRegistrationsManagement.tsx` — nowe zapytanie do `occurrence_reminders_sent`, mapa per email, nowa kolumna, dropdowny akcji, obsługa toastów i re-fetch.
- Ewentualnie mały helper w `src/lib/` do wyliczania „czy okno 2h/1h/15min już minęło" na potrzeby stanu „—" vs „✗".

Bez zmian schematu bazy — `occurrence_reminders_sent` już zawiera wszystko, czego potrzebujemy (event_id, occurrence_datetime, reminder_type, recipient_email, created_at).