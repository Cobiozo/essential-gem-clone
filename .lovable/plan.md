
## Co ustaliłem

1. `2 terminy` w panelu admina oznacza, że dla jednego użytkownika istnieją **2 osobne rekordy rejestracji** w `event_registrations` dla tego samego wydarzenia.
2. Dla `ivamaj@wp.pl` system **wysłał przypomnienia** do wydarzenia `Szkolenie Pure Calling`:
   - 24h
   - 12h
   - 2h
   - 1h  
   Są na to wpisy w `email_logs`.
3. W jej przypadku są nawet **2 aktywne rejestracje** do tego samego wydarzenia, więc przypomnienia poszły **podwójnie**.
4. Główny błąd architektury jest inny: obecna logika przypomnień wybiera wydarzenia do wysyłki po `events.start_time`, a nie po **konkretnych terminach z `occurrences`**. To oznacza, że w wydarzeniach cyklicznych kolejne terminy mogą być pomijane albo obsługiwane błędnie.
5. Dodatkowo panel admina grupuje rejestracje użytkownika i pokazuje badge `2 terminy`, ale to dziś ukrywa ważny szczegół: czy to są **2 różne terminy**, czy **duplikat tego samego terminu**.

## Wniosek biznesowy

Docelowa zasada powinna być taka:

- każde wydarzenie jednorazowe = 1 termin,
- każde wydarzenie cykliczne = wiele terminów,
- **przypomnienie email ma być wysyłane per realny termin**, z właściwą datą i godziną,
- ale **nie wolno wysyłać dubli** tylko dlatego, że istnieją dwa błędne rekordy rejestracji do tego samego terminu.

## Plan naprawy

### 1. Naprawić logikę wyboru terminów do przypomnień
Przebuduję mechanizm tak, aby funkcja przypomnień operowała na **instancjach terminów**, nie na samym `event.start_time`.

To znaczy:
- dla zwykłego wydarzenia używany będzie jeden termin z `start_time`,
- dla cyklicznego wydarzenia funkcja rozwinie `occurrences` do listy konkretnych dat/godzin,
- cron będzie sprawdzał okna 24h / 12h / 2h / 1h / 15min względem **każdego terminu osobno**.

### 2. Wysyłać przypomnienia per termin, nie per surowy rekord
Wysyłka będzie liczona na kluczu typu:

```text
event_id + occurrence_index + user_id/email + reminder_type
```

Dzięki temu:
- użytkownik zapisany na 2 różne terminy dostanie 2 zestawy przypomnień,
- użytkownik z 2 błędnymi rekordami do tego samego terminu dostanie tylko 1 przypomnienie dla danego okna.

### 3. Dodać trwały rejestr wysyłek per termin
Obecne flagi typu `reminder_1h_sent` w `event_registrations` są za słabe dla wydarzeń cyklicznych.

Dodam osobną tabelę logującą wysyłki przypomnień per termin, np. w modelu:
- event
- occurrence_index / termin
- odbiorca
- typ przypomnienia
- status
- timestamp wysyłki

To rozwiąże:
- cykliczne wydarzenia,
- resetowanie flag,
- deduplikację,
- audyt co dokładnie poszło i dla którego terminu.

### 4. Zmienić edge function przypomnień
`send-bulk-webinar-reminders` zostanie przebudowana tak, aby:
- liczyła prawidłową datę/godzinę dla konkretnego terminu,
- wstawiała do template właściwe `event_date` i `event_time`,
- sprawdzała, czy dla tego konkretnego terminu przypomnienie już było wysłane,
- logowała metadane z `occurrence_index` i faktycznym `occurrence_datetime`.

### 5. Zmienić scheduler / proces wywołujący wysyłkę
`process-pending-notifications` nie może już wybierać wydarzeń tylko po `events.start_time`.

Zamiast tego:
- będzie pobierał aktywne wydarzenia webinarowe/szkoleniowe,
- rozwijał ich terminy,
- wybierał tylko te terminy, które wpadają w aktualne okno przypomnienia,
- wywoływał wysyłkę dla konkretnego terminu.

### 6. Naprawić admin panel rejestracji
W `EventRegistrationsManagement.tsx` zmienię prezentację `2 terminy`, aby było jasne:
- jakie są konkretne terminy,
- który `occurrence_index` dotyczy którego terminu,
- czy są rekordy nieprawidłowe / zduplikowane.

Najlepszy kierunek:
- rozwinąć wiersz użytkownika,
- pokazać listę zapisów:
  - data i godzina terminu,
  - status,
  - occurrence_index,
  - informacja o przypomnieniach.

### 7. Obsłużyć dane wadliwe już istniejące
Na bazie widać, że mogą istnieć rekordy typu:
- dwa zapisy do tego samego wydarzenia,
- occurrence_index wskazujący na nieistniejący termin,
- stare wpisy po zmianach harmonogramu.

Dlatego dodam:
- migrację / skrypt porządkujący logikę przyszłych wysyłek,
- zabezpieczenie, by nie wysyłać dubli przy takich danych,
- oznaczanie lub pomijanie rekordów z niepoprawnym `occurrence_index`.

## Co to zmieni dla Twojego przypadku

Po wdrożeniu:
- jeśli użytkownik jest zapisany na **kolejny realny termin** wydarzenia cyklicznego, dostanie przypomnienia przed tym terminem,
- jeśli ma **więcej niż jeden różny termin**, dostanie przypomnienia dla każdego z nich,
- jeśli ma **duplikat tego samego terminu**, nie dostanie podwójnych maili,
- admin będzie widział, skąd bierze się `2 terminy`.

## Zakres zmian

### Backend
- migracja bazy pod rejestr wysyłek per termin,
- przebudowa `send-bulk-webinar-reminders`,
- przebudowa `process-pending-notifications`.

### Admin UI
- poprawa widoku `2 terminy`,
- rozwinięcie szczegółów terminów,
- lepsza diagnostyka duplikatów.

## Uwagi techniczne
- Dla zalogowanych użytkowników `occurrence_index` już istnieje w `event_registrations`, więc to da się naprawić porządnie.
- Dla gości `guest_event_registrations` obecnie nie ma pola `occurrence_index`, więc jeśli goście też mają być obsługiwani per termin w wydarzeniach cyklicznych, trzeba będzie rozszerzyć schemat także dla gości.
- Przypadek `ivamaj@wp.pl` nie jest brakiem wysyłki — to raczej potwierdzenie, że obecny system działa na poziomie rekordów rejestracji, ale nie rozumie jeszcze poprawnie pojęcia „realnego terminu”.

## Kolejność wdrożenia
1. Dodać model wysyłek per termin w bazie.
2. Przebudować wybór terminów w schedulerze.
3. Przebudować wysyłkę maili na logikę per termin.
4. Dodać deduplikację tego samego terminu dla jednego odbiorcy.
5. Ulepszyć admin panel, żeby pokazywał szczegóły terminów i duplikaty.
