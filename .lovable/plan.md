

# Plan: Test emaili z podziękowaniem + analiza skrócenia linku zaproszeniowego

## Część 1: Wysłanie testowych emaili z podziękowaniem

Wywołam `send-post-event-thank-you` z danymi testowymi do obu adresów, symulując osobę zapraszającą (z danymi kontaktowymi).

**Parametry:**
- `recipient_email`: `sebastiansnopek87@gmail.com` i `byk1023@wp.pl`
- `recipient_name`: "Sebastian" / "Gość"
- `event_title`: "TEST"
- `inviter_user_id`: ID zalogowanego użytkownika (aby pobrać dane zapraszającego z profilu)

## Część 2: Weryfikacja automatycznego wysyłania po webinarze

System **już działa poprawnie**. Oto jak to działa:

- `process-pending-notifications` (krok 9, linia 796) uruchamia się via CRON co kilka minut
- Wyszukuje wydarzenia, które **zakończyły się w ciągu ostatnich 2 godzin** (`end_time` między 2h temu a teraz)
- Dla każdej rejestracji (użytkownik + gość) bez `thank_you_sent = true`:
  - Wywołuje `send-post-event-thank-you` z danymi zapraszającego
  - Po wysłaniu ustawia `thank_you_sent = true` w rejestracji
- **Goście**: pobiera `invited_by_user_id` z `guest_event_registrations`
- **Użytkownicy**: szuka zapraszającego przez `upline_eq_id` → `profiles`, fallback na `host_user_id`

**Wniosek**: Automatyka jest poprawna. Każdy webinar po zakończeniu wyśle podziękowania w ciągu 2h.

## Część 3: Skrócenie linku zaproszeniowego

### Obecny stan
System **już obsługuje krótkie linki** przez pole `slug` w tabeli `events`:

- **Z slugiem**: `https://purelife.info.pl/e/{slug}?ref={eq_id}` — np. `purelife.info.pl/e/test-webinar?ref=EQ123`
- **Bez sluga (fallback)**: `https://purelife.info.pl/events/register/{UUID}?invited_by={UUID}` — bardzo długi

### Jak to działa
- `/e/:slug` → `EventRegistrationBySlug` → rozwiązuje slug na event ID i `ref` (eq_id) na user UUID → przekierowuje do `/events/register/:eventId`
- Slug jest już zaimplementowany w 5 komponentach: `EventCard`, `EventCardCompact`, `MyMeetingsWidget`, `CalendarWidget`, `AutoWebinarEventView`

### Co można poprawić

**Opcja A — Zapewnić, że każde wydarzenie ma slug (automatycznie)**
- Dodać trigger bazodanowy: przy INSERT do `events`, jeśli `slug` jest NULL, auto-generować z `title` (np. "Webinar TEST" → `webinar-test`)
- Efekt: żaden link nigdy nie będzie w formacie UUID, zawsze krótki `/e/slug`

**Opcja B — Jeszcze krótszy format z kodem numerycznym**
- Zamiast sluga z tytułu, generować 5-6 znakowy kod (np. `purelife.info.pl/e/a3x9k`)
- Krótsze, ale mniej czytelne

**Rekomendacja**: Opcja A — auto-generowanie sluga z tytułu. Nie narusza istniejącej funkcjonalności, bo slug jest już w pełni obsługiwany. Jedynie gwarantuje, że każde wydarzenie go ma.

## Pliki do zmiany
1. **Bez zmian w kodzie** — wysłanie testów via curl
2. Opcjonalnie: migracja SQL z triggerem auto-generowania sluga

