

# Analiza systemu powiadomień i emaili dla gości na spotkania

## Podsumowanie — 3 ścieżki powiadomień

System obsługuje 3 różne typy spotkań/wydarzeń z różnymi ścieżkami powiadomień:

```text
┌──────────────────────────┬─────────────────────────┬──────────────────────────┐
│  WEBINARY (goście)       │ SPOTKANIA INDYWIDUALNE  │ TRÓJSTRONNE (prospect)   │
│  guest_event_registr.    │ event_registrations      │ events.description JSON  │
├──────────────────────────┼─────────────────────────┼──────────────────────────┤
│ ✅ Potwierdzenie email   │ ✅ Email meeting_booked  │ ❌ BRAK potwierdzenia    │
│    send-webinar-confirm. │    + meeting_confirmed   │    email do prospekta    │
│                          │    (send-notif-email)    │                          │
├──────────────────────────┼─────────────────────────┼──────────────────────────┤
│ ✅ 5 przypomnień email   │ ✅ 5 przypomnień email   │ ✅ 5 przypomnień email   │
│    send-bulk-webinar-rem │    send-meeting-remind.  │    send-prospect-meeting │
│    (via CRON 5min)       │    (via CRON 15min)      │    (via send-mtg-remind) │
├──────────────────────────┼─────────────────────────┼──────────────────────────┤
│ ✅ Link Zoom: 1h + 15min │ ✅ Link Zoom: w emailu   │ ✅ Link Zoom: 2h + 15min │
│    (includeLink flag)    │    (we wszystkich)       │    (z prospect email)    │
├──────────────────────────┼─────────────────────────┼──────────────────────────┤
│ ❌ Push — brak           │ ✅ Push: 5 okien         │ ❌ Push — brak (gość     │
│    (goście nie mają kont)│    + in-app notification │    nie ma konta)         │
└──────────────────────────┴─────────────────────────┴──────────────────────────┘
```

## Zidentyfikowane problemy

### Problem 1: Webinary — link Zoom w przypomnieniu 24h, 12h, 2h NIE jest wysyłany
W `send-bulk-webinar-reminders`, konfiguracja jasno pokazuje:
- `24h`: `includeLink: false`
- `12h`: `includeLink: false`  
- `2h`: `includeLink: false`
- `1h`: `includeLink: true` ✅
- `15min`: `includeLink: true` ✅

**To jest zamierzone** — link wysyłany jest dopiero 1h i 15min przed startem. Potwierdzenie przy rejestracji też nie zawiera linka (mówi "Link do dołączenia otrzymasz w wiadomościach przypominających"). **OK — zgodne z polityką.**

### Problem 2: Spotkania trójstronne — prospect NIE dostaje potwierdzenia rezerwacji
Gdy partner rezerwuje spotkanie trójstronne, system:
- ✅ Wysyła email do lidera (`meeting_booked`)
- ✅ Wysyła email do rezerwującego (`meeting_confirmed`)
- ❌ **NIE wysyła emaila do prospekta** (osoby zewnętrznej)

Prospect dostaje dopiero **przypomnienia** (24h, 12h, 2h, 1h, 15min) dzięki logice w `send-meeting-reminders` → `send-prospect-meeting-email`. Ale **nie dostaje początkowego potwierdzenia** z datą i godziną.

**Wpływ**: Prospect dowiaduje się o spotkaniu dopiero 24h przed nim (z pierwszego przypomnienia), zamiast natychmiast po rezerwacji.

### Problem 3: CRON interwał — spotkania indywidualne sprawdzane co 15 minut
`send-meeting-reminders` jest wywoływane co 15 minut (via `pg_cron`), co jest mniej granularne niż webinary (co 5 minut via `process-pending-notifications`). Przy 15-minutowym oknie (10-20 min), istnieje ryzyko pominięcia okna, ale w praktyce jest to mało prawdopodobne.

### Problem 4: Brak deduplikacji w BookMeetingDialog
W `BookMeetingDialog.tsx` (linia 242-269) emaile do lidera i rezerwującego są wysyłane przez `send-notification-email` z hardcoded UUID event_type_id. Jeśli te ID nie istnieją w bazie `email_event_types`, emaile mogą się nie wysyłać — ale brak catch/toast na błąd (`.catch` loguje tylko do console).

## Co działa poprawnie

1. **Goście webinarów** — pełny flow: potwierdzenie + 5 przypomnień email z linkiem od 1h
2. **Zarejestrowani użytkownicy spotkań indywidualnych** — pełny flow: email potwierdzenie + 5 przypomnień + push + in-app
3. **Deduplikacja przypomnień** — `meeting_reminders_sent` z unikalnym indexem zapobiega powtórzeniom
4. **Natychmiastowy link** — jeśli gość webinarowy zapisze się <15min przed startem, dostaje link od razu

## Rekomendowany plan naprawy

### Zmiana 1: Email potwierdzenie do prospekta po rezerwacji trójstronnego
W `useLeaderAvailability.ts` i `PartnerMeetingBooking.tsx`, po utworzeniu spotkania trójstronnego, dodać wywołanie `send-prospect-meeting-email` z `reminder_type: 'booking'`.

`send-prospect-meeting-email` już obsługuje typ `booking` — ma go w `subjectMap`:
```
booking: `Zaproszenie na spotkanie — ${meeting_date}`
```
Wystarczy dodać wywołanie po stronie klienta.

### Zmiana 2: Brak zmian wymaganych
Reszta systemu działa poprawnie. Goście webinarowi i użytkownicy spotkań indywidualnych dostają pełen zestaw powiadomień i emaili z linkami.

## Pliki do edycji
- `src/hooks/useLeaderAvailability.ts` — dodać wywołanie `send-prospect-meeting-email` z type `booking` po utworzeniu spotkania trójstronnego
- `src/components/events/PartnerMeetingBooking.tsx` — analogicznie

