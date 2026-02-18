
# System gosci w spotkaniach wideo z CRM i analityka

## Zakres

System umozliwiajacy niezalogowanym osobom dolaczanie do spotkan wideo jako goscie, z automatycznym zapisem danych do kontaktow prywatnych zapraszajacego, zbiorczej tabeli gosci dla admina, gromadzeniem analityki (czas uczestnictwa, zrodlo) oraz automatycznym emailem z podziekowaniem po zakonczeniu spotkania.

---

## 1. Zmiany w bazie danych

### Nowa tabela `meeting_guest_tokens`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| room_id | text NOT NULL | ID pokoju |
| event_id | uuid FK events | Powiazane wydarzenie |
| inviter_user_id | uuid NOT NULL | Kto zaprosil goscia (wlasciciel kontaktu) |
| first_name | text NOT NULL | Imie goscia |
| last_name | text NOT NULL | Nazwisko goscia |
| email | text NOT NULL | Email goscia |
| token | text UNIQUE | Wygenerowany token sesji |
| expires_at | timestamptz | Waznosc (4h od wygenerowania) |
| used_at | timestamptz | Kiedy dolaczyl |
| created_at | timestamptz DEFAULT now() | |
| UNIQUE(room_id, email) | | Jeden token na email na spotkanie |

### Nowa tabela `meeting_guest_analytics`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid PK | |
| guest_token_id | uuid FK meeting_guest_tokens | |
| event_id | uuid FK events | |
| room_id | text | |
| joined_at | timestamptz | Kiedy dolaczyl |
| left_at | timestamptz | Kiedy wyszedl |
| duration_seconds | integer | Czas uczestnictwa |
| join_source | text | Skad dolaczyl (referrer, user-agent itp.) |
| device_info | text | Typ urzadzenia (mobile/desktop, OS) |
| thank_you_email_sent | boolean DEFAULT false | Czy wyslano email z podziekowaniem |
| thank_you_email_sent_at | timestamptz | Kiedy wyslano |
| created_at | timestamptz DEFAULT now() | |

### Modyfikacja tabeli `meeting_room_participants`

- `user_id` -> zmiana na NULLABLE (gosc nie ma user_id)
- Nowa kolumna `guest_token_id` uuid NULLABLE FK meeting_guest_tokens
- Nowy constraint: CHECK (user_id IS NOT NULL OR guest_token_id IS NOT NULL)
- Aktualizacja UNIQUE: dodanie osobnego indeksu dla gosci

### Modyfikacja tabeli `events`

- Nowa kolumna `allow_guest_access` boolean DEFAULT false

### Modyfikacja tabeli `meeting_chat_messages`

- `user_id` -> zmiana na NULLABLE
- Nowa kolumna `guest_token_id` uuid NULLABLE

### RLS dla nowych tabel

- `meeting_guest_tokens`: INSERT/SELECT publiczny (anon) z ograniczeniem do wlasnego tokenu
- `meeting_guest_analytics`: INSERT publiczny, SELECT dla admina i inviter_user_id
- Aktualizacja RLS na `meeting_room_participants` i `meeting_chat_messages` aby obslugiwaly guest_token_id

---

## 2. Nowe Edge Functions

### `generate-meeting-guest-token` (verify_jwt = false)

- Wejscie: room_id, first_name, last_name, email, inviter_user_id
- Walidacja: event istnieje, allow_guest_access = true, email format OK
- Generuje krotki token (crypto.randomUUID + hash)
- Zapisuje w meeting_guest_tokens
- **Automatycznie dodaje goscia do team_contacts zapraszajacego** jako kontakt prywatny (contact_type = 'private', role = 'client', relationship_status = 'potential_partner')
- **Automatycznie dodaje goscia do meeting_guest_analytics** (wstepny rekord)
- Zwraca: token, guest_token_id

### `verify-meeting-guest-token` (verify_jwt = false)

- Wejscie: token, room_id
- Sprawdza: istnieje, nie wygasl, pasuje do room_id
- Zwraca: dane goscia (imie, nazwisko, email, guest_token_id, inviter info)

### `send-guest-thank-you-email` (verify_jwt = false)

- Wyzwalany po opuszczeniu spotkania przez goscia (lub cron po zakonczeniu wydarzenia)
- Wejscie: guest_token_id
- Pobiera: dane goscia, dane zapraszajacego, dane wydarzenia
- Wysyla email z:
  - Podziekowaniem za uczestnictwo w spotkaniu [tytul]
  - Informacja o osobie kontaktowej (zapraszajacy): imie, nazwisko, email
  - Zacheta do kontaktu w sprawie kolejnych spotkan, szkolen
  - Informacja o mozliwosci dolaczenia do zespolu Pure Life i Eqology
- Aktualizuje `meeting_guest_analytics.thank_you_email_sent = true`

---

## 3. Zmiany frontend

### `src/pages/MeetingRoom.tsx`

Nowa logika:
- Jesli `!user` i URL zawiera `?guest=true&inviter={userId}`:
  - Sprawdz sessionStorage po istniejacy token
  - Jesli brak -> pokaz `GuestAccessForm`
  - Jesli jest -> weryfikuj tokenem i wpusc do lobby
- Nowy stan: `'guest-form'` w maszynie stanow
- Po dolaczeniu goscia: zapisanie referrer i device info do analytics

### Nowy komponent `src/components/meeting/GuestAccessForm.tsx`

- Formularz: Imie, Nazwisko, Email (walidacja Zod)
- Przycisk "Dolacz jako gosc"
- Po submit: wywolanie `generate-meeting-guest-token`
- Zapis tokenu do sessionStorage
- Przejscie do lobby

### `src/components/meeting/MeetingLobby.tsx`

- Nowe propsy: `guestMode?: boolean`, `guestDisplayName?: string`
- Jesli guestMode: ukrycie ustawien hosta, wyswietlenie "Dolaczasz jako gosc"

### `src/components/meeting/VideoRoom.tsx`

- Nowe propsy: `guestTokenId?: string`, `guestMode?: boolean`
- Rejestracja uczestnika z `guest_token_id` zamiast `user_id`
- Przy opuszczeniu spotkania:
  - Aktualizacja `meeting_guest_analytics` z `left_at` i obliczenie `duration_seconds`
  - Wywolanie `send-guest-thank-you-email`
- TURN credentials: Edge Function `get-turn-credentials` musi akceptowac guest token

### `src/components/meeting/MeetingChat.tsx`

- Obsluga goscia: wysylanie wiadomosci z `guest_token_id` zamiast `user_id`
- Wyswietlanie imienia goscia z oznaczeniem "(Gosc)"

### `src/components/meeting/MeetingControls.tsx`

- Ukrycie opcji hosta/co-hosta dla gosci
- Brak PiP, widoku i ustawien - tylko mikrofon, kamera, czat, opusc

### `src/components/meeting/ParticipantsPanel.tsx`

- Wyswietlanie gosci z etykieta "Gosc"
- Brak opcji co-host dla gosci

---

## 4. Panel admina - zbiorczy widok gosci

### Nowy komponent w panelu admina

- Tabela z lista wszystkich gosci ze wszystkich spotkan
- Kolumny: Imie, Nazwisko, Email, Spotkanie, Data, Czas uczestnictwa, Zapraszajacy, Email wyslany
- Filtry: po dacie, spotkaniu, zapraszajacym
- Export do CSV/Excel

---

## 5. Automatyczny zapis do kontaktow zapraszajacego

Przy generowaniu tokenu goscia:
- INSERT do `team_contacts` z `user_id = inviter_user_id`
- `contact_type = 'private'`
- `role = 'client'`
- `relationship_status = 'potential_partner'`
- `notes = 'Gosc spotkania: [tytul wydarzenia] - [data]'`
- Jesli kontakt z tym emailem juz istnieje u zapraszajacego -> aktualizacja notatki

---

## 6. Analityka goscia

Dane gromadzone automatycznie:
- **join_source**: `document.referrer` + parametry URL
- **device_info**: User-Agent (parsowanie na mobile/desktop, OS, przegladarka)
- **joined_at / left_at**: czas dokladny z obliczeniem duration_seconds
- **Powiazanie z inviter_user_id**: kto zaprosil

---

## 7. Przepływ goscia (krok po kroku)

```text
1. Uzytkownik platformy generuje link zaproszenia: /meeting-room/{roomId}?guest=true&inviter={userId}
2. Gosc klika link -> widzi formularz (imie, nazwisko, email)
3. Po wypelnieniu -> Edge Function generuje token, dodaje do kontaktow zapraszajacego
4. Gosc przechodzi do lobby (podglad kamery/mikrofonu)
5. Dolacza do spotkania
6. System zapisuje: czas dolaczenia, referrer, device info
7. Gosc opuszcza spotkanie
8. System: oblicza czas uczestnictwa, wysyla email z podziekowaniem
9. Email zawiera: dane kontaktowe zapraszajacego, info o Pure Life/Eqology
10. Admin widzi goscia w zbiorczym panelu
```

---

## 8. Bezpieczenstwo

- Token wygasa po 4h
- Jeden token na email na spotkanie (UNIQUE constraint)
- Gosc NIE moze: zmieniac ustawien, wyciszac innych, byc co-hostem
- Rate limiting w Edge Function (max 10 tokenow/min)
- Email goscia walidowany przez Zod
- Guest token nie daje dostepu do zadnych innych zasobow platformy

---

## 9. Modyfikacja `get-turn-credentials`

- Dodanie alternatywnej sciezki autoryzacji: jesli brak JWT, sprawdz header `X-Guest-Token`
- Weryfikacja tokenu przez zapytanie do `meeting_guest_tokens`
- Zwrot TURN credentials jesli token wazny

---

## Podsumowanie plikow

| Plik | Zmiana |
|------|--------|
| Migracja SQL | 2 nowe tabele, modyfikacja 3 istniejacych |
| `generate-meeting-guest-token/index.ts` | Nowa Edge Function |
| `verify-meeting-guest-token/index.ts` | Nowa Edge Function |
| `send-guest-thank-you-email/index.ts` | Nowa Edge Function |
| `get-turn-credentials/index.ts` | Obsluga guest token |
| `supabase/config.toml` | 3 nowe funkcje |
| `MeetingRoom.tsx` | Obsluga stanu goscia |
| `GuestAccessForm.tsx` | Nowy komponent |
| `MeetingLobby.tsx` | Props guestMode |
| `VideoRoom.tsx` | Rejestracja goscia, analytics |
| `MeetingChat.tsx` | Czat goscia |
| `MeetingControls.tsx` | Ograniczenia dla gosci |
| `ParticipantsPanel.tsx` | Etykieta "Gosc" |
| Panel admina | Nowy widok zbiorczy gosci |
