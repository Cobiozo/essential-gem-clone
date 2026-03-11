

# Brakujące powiadomienia dla gości spotkań (meeting_guest_tokens)

## Zidentyfikowany problem

Goście zaproszeni na spotkania wewnętrzne (WebRTC) — tacy jak Ewa Miukut — **nie dostają żadnych emaili**. System `meeting_guest_tokens` tworzy token i zapisuje kontakt, ale nigdy nie wysyła emaila z:
- Potwierdzeniem zaproszenia
- Datą i godziną spotkania  
- Linkiem do pokoju spotkania
- Przypomnieniami przed spotkaniem

Cały flow polega na ręcznym udostępnieniu linku `/meeting/{room_id}` przez zapraszającego.

## Co trzeba zrobić

### Zmiana 1: Email potwierdzenie po wygenerowaniu tokenu
W `generate-meeting-guest-token/index.ts` — po utworzeniu tokenu gościa, wysłać email z:
- Potwierdzeniem zaproszenia (data, godzina)
- Linkiem do pokoju spotkania: `https://purelife.lovable.app/meeting/{room_id}`
- Informacją kto zaprasza

Wykorzysta istniejący SMTP (z tabeli `smtp_settings`), analogicznie do `send-prospect-meeting-email`.

### Zmiana 2: Przypomnienia dla gości w `send-meeting-reminders`
W `send-meeting-reminders/index.ts` — po sekcji obsługi prospektów, dodać sekcję obsługi gości z `meeting_guest_tokens`:
- Pobrać gości z `meeting_guest_tokens` dla danego `event_id`
- Wysłać im przypomnienia w 5 oknach (24h, 12h, 2h, 1h, 15min)
- Link do pokoju (`/meeting/{room_id}`) dołączany od 2h przed spotkaniem
- Deduplikacja via `meeting_reminders_sent` z `prospect_email` = guest email + `reminder_type` = `guest_{type}`

### Pliki do edycji
1. **`supabase/functions/generate-meeting-guest-token/index.ts`** — dodać wysyłkę emaila potwierdzającego po utworzeniu tokenu (SMTP inline, analogicznie do send-prospect-meeting-email)
2. **`supabase/functions/send-meeting-reminders/index.ts`** — dodać sekcję pobierającą `meeting_guest_tokens` dla każdego spotkania i wysyłającą przypomnienia do gości

### Szczegóły techniczne

**Email potwierdzenie (generate-meeting-guest-token):**
- Po linii z `console.log` (sukces), pobrać SMTP settings
- Zbudować HTML email z: imię gościa, tytuł wydarzenia, data/godzina, link do pokoju
- Wysłać via raw SMTP (ten sam wzorzec co w `send-prospect-meeting-email`)
- Nie blokować response — `catch` na błąd

**Przypomnienia (send-meeting-reminders):**
- Po sekcji `// === Send prospect email for tripartite meetings ===` dodać nową sekcję
- Query: `meeting_guest_tokens` WHERE `event_id = meeting.id`
- Dla każdego gościa: sprawdzić `meeting_reminders_sent` (deduplikacja), wysłać email, zapisać sent
- Link do pokoju: `https://purelife.lovable.app/meeting/{room_id}` — dołączany w `2h`, `1h`, `15min`
- Użyć `buildGuestReminderHtml()` (nowa funkcja, analogiczna do `buildProspectEmailHtml`)

