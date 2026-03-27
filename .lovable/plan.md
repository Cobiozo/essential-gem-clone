
## Co jest faktycznie zepsute

Masz rację: problem nie jest w samym widoku popovera, tylko w tym, że dane o obecności nie są poprawnie wiązane z konkretnym kontaktem prywatnym.

Po sprawdzeniu kodu i danych w bazie widać 3 konkretne źródła błędu:

1. `ContactEventInfoButton.tsx` pokazuje obecność tylko po `guest_registration_id`
- zielona ikona pobiera rejestracje po `team_contact_id`
- potem szuka widoków w `auto_webinar_views` wyłącznie po `guest_registration_id`
- jeśli rekord widoku ma `guest_registration_id = null`, UI pokazuje `Nie dołączył`, nawet jeśli gość realnie oglądał

2. W bazie rekordy widoku dla gości istnieją, ale są niepodpięte do rejestracji
- dla adresu Doroty są rekordy w `auto_webinar_views`
- mają `guest_email = tatanabacznosci@gmail.com`, `joined_at`, `watch_duration_seconds`
- ale wszystkie mają `guest_registration_id = null`
- dlatego prywatne kontakty nie potrafią ich przypisać do konkretnego wpisu kontaktu

3. Sam fallback po e-mailu też nie może być „naiwny”
- ten sam e-mail ma wiele różnych rejestracji:
  - różne kontakty prywatne
  - różne wydarzenia
  - różne sloty
  - nawet różne kategorie BO/HC
- więc zwykłe „dopasuj po e-mailu” może przypisać oglądanie do złej osoby

Dodatkowo znalazłem ważną przyczynę techniczną:
- publiczna strona webinaru przekazuje `guestEmail` i `guestSlotTime`
- `AutoWebinarEmbed.tsx` próbuje ustalić `guestRegistrationId` przez zapytanie do `guest_event_registrations`
- ale gość anon nie ma bezpiecznej polityki SELECT pozwalającej odczytać wyłącznie własną rejestrację po zakodowanym linku
- przez to `guestRegistrationId` zostaje `null`
- a potem `useAutoWebinarTracking.ts` zapisuje widok bez powiązania z rejestracją

## Plan naprawy bez psucia obecnej funkcjonalności

### 1. Naprawić źródło problemu: wiązanie widoku z właściwą rejestracją gościa
W `AutoWebinarEmbed.tsx`:
- zmienić rozwiązywanie `guestRegistrationId`, aby wybierało właściwą rejestrację nie tylko po `email + event_id`, ale też z uwzględnieniem `slot_time`
- normalizować e-mail (`trim().toLowerCase()`) po obu stronach
- wybierać najnowszą pasującą rejestrację dla konkretnego slotu

Efekt:
- nowo tworzone rekordy `auto_webinar_views` będą miały poprawny `guest_registration_id`
- dane zaczną trafiać dokładnie do właściwego kontaktu prywatnego partnera

### 2. Dodać bezpieczne RLS dla gościa, ale tylko do własnej rejestracji
Potrzebna będzie migracja SQL dla `guest_event_registrations`, która:
- pozwoli anon odczytać wyłącznie własną rejestrację auto-webinarową
- dostęp musi być maksymalnie zawężony do danych z linku gościa:
  - po `email`
  - po `event_id`
  - najlepiej także po `slot_time`
- nie otwierać publicznego dostępu do wszystkich rejestracji, bo to są dane osobowe

To jest kluczowe, bo bez tego frontend gościa dalej nie ustali poprawnego `guest_registration_id`.

### 3. Uodpornić `ContactEventInfoButton.tsx` na stare dane historyczne
Dla już zapisanych rekordów, które mają `guest_registration_id = null`, dodać precyzyjny fallback:
- najpierw dopasowanie po `guest_registration_id`
- jeśli brak, wtedy dopasowanie po:
  - e-mailu kontaktu
  - właściwym wydarzeniu
  - kategorii / configu
  - i jeśli dostępne, zgodnym slocie czasowym
- wybierać najlepszy rekord widoku:
  - z największym `watch_duration_seconds`
  - lub najpełniejszym zestawem danych `joined_at/left_at`

To pozwoli od razu poprawnie pokazywać starsze przypadki, takie jak Dorota, bez czekania na nowe wejścia do pokoju.

### 4. Rozszerzyć dane pokazywane przy zielonej ikonie
W popoverze przy kontakcie prywatnym dodać precyzyjniejsze informacje:
- status: `Dołączył` / `Nie dołączył`
- godzina wejścia
- czas oglądania
- opcjonalnie godzina wyjścia, jeśli istnieje
- logika ma być per konkretna rejestracja, nie globalnie per e-mail

To zachowa obecny UX, ale pokaże dane zgodne z rzeczywistością.

### 5. Nie naruszać działających części systemu
Zakres zmian ograniczę wyłącznie do:
- `src/components/auto-webinar/AutoWebinarEmbed.tsx`
- `src/hooks/useAutoWebinarTracking.ts` tylko jeśli będzie potrzebne drobne uszczelnienie
- `src/components/team-contacts/ContactEventInfoButton.tsx`
- migracji SQL dla RLS `guest_event_registrations`

Nie będę ruszać:
- odtwarzania webinaru
- synchronizacji wideo
- istniejącego grupowania kontaktów
- działania BO/HC
- aktualnych paneli admina poza logiką źródła danych

## Efekt po wdrożeniu

Po tej poprawce:
- zielona ikona w kontaktach prywatnych będzie pokazywać prawdziwe dane obecności
- partner zobaczy, czy konkretny zaproszony gość był na spotkaniu
- zobaczy też ile czasu spędził na spotkaniu
- stare rekordy bez `guest_registration_id` będą nadal możliwe do sensownego przypisania fallbackiem
- nowe rekordy będą już zapisywane poprawnie u źródła

## Technicznie najważniejsze ustalenie
To nie jest problem „braku widoków”. Widoki istnieją. Problem polega na tym, że:
```text
rejestracja kontaktu prywatnego != poprawnie powiązany rekord auto_webinar_views
```

Czyli trzeba naprawić:
```text
guest link -> resolve registration -> save view with guest_registration_id -> show exact stats in private contacts
```
