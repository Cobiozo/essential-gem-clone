
## Naprawa stref czasowych we wszystkich powiadomieniach i emailach

### Problem
Spotkanie zaplanowane na 17:00 (Europe/Warsaw) jest wyswietlane w powiadomieniach jako 16:00, poniewaz edge functions formatuja czas w UTC zamiast w strefie Europe/Warsaw. Dotyczy to:

1. **cancel-individual-meeting** -- uzywa `format(eventStart, 'HH:mm')` (date-fns) bez strefy czasowej = UTC
2. **process-pending-notifications** -- uzywa `toLocaleTimeString('pl-PL')` bez opcji `timeZone` = UTC na serwerze Deno

Jedyna funkcja ktora robi to poprawnie to **send-meeting-reminders** (uzywa `timeZone: 'Europe/Warsaw'`).

### Rozwiazanie

#### Zmiana 1: `cancel-individual-meeting/index.ts`

Zamienic formatowanie daty i godziny (linie 194-196) z:
```text
const eventStart = new Date(event.start_time);
const dateStr = format(eventStart, 'dd.MM.yyyy', { locale: pl });
const timeStr = format(eventStart, 'HH:mm');
```
Na uzycie `toLocaleDateString`/`toLocaleTimeString` z `timeZone: 'Europe/Warsaw'` (ten sam wzorzec co send-meeting-reminders):
```text
const eventStart = new Date(event.start_time);
const dateStr = eventStart.toLocaleDateString('pl-PL', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Warsaw'
});
const timeStr = eventStart.toLocaleTimeString('pl-PL', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw'
});
```

Dodatkowo: dodac etykiete strefy czasowej do powiadomien in-app i push w tej samej funkcji, np. "17:00 (Warsaw)" zamiast samego "17:00".

Mozna tez usunac import `format` i `pl` z date-fns, poniewaz nie beda juz uzywane.

#### Zmiana 2: `process-pending-notifications/index.ts`

Dodac `timeZone: 'Europe/Warsaw'` do dwoch miejsc:
- Linia 376-385 (przypomnienie 24h dla webinarow)
- Linia 517-526 (przypomnienie 1h dla webinarow)

Zmiana:
```text
const formattedTime = eventDate.toLocaleTimeString('pl-PL', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw'
});
const formattedDate = eventDate.toLocaleDateString('pl-PL', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Warsaw'
});
```

#### Zmiana 3: Etykieta strefy czasowej w tresciach powiadomien

We wszystkich trzech edge functions dodac informacje o strefie czasowej do wyswietlanego czasu:
- Format: `"17:00 (Warsaw)"` zamiast `"17:00"`
- Dotyczy: in-app notifications (message), push notifications (body), email payload

Miejsca:
- **cancel-individual-meeting**: linie 225, 239 -- powiadomienia in-app i push
- **send-meeting-reminders**: linie 504, 522 -- push i in-app
- **process-pending-notifications**: przekazuje czas do send-webinar-email (wystarczy dodac etykiete do formattedTime)

### Podsumowanie zmian
- 3 pliki edge functions do zmodyfikowania
- Glowna przyczyna: brak `timeZone: 'Europe/Warsaw'` w formatowaniu czasu
- Dodatkowa zmiana: dodanie etykiety "(Warsaw)" dla jasnosci
