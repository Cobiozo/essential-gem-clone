

## Zmiana formularza prospekta i system powiadomien e-mail dla prospekta

### 1. Zmiana formularza rezerwacji (PartnerMeetingBooking.tsx)

**Pola obowiazkowe:**
- Imie (prospect_first_name) -- wymagane
- Dodatkowe informacje (booking_notes) -- wymagane (zmiana z opcjonalnego)

**Pola opcjonalne:**
- Nazwisko (prospect_last_name) -- opcjonalne
- Telefon (prospect_phone) -- opcjonalne  
- Email prospekta (prospect_email) -- NOWE pole, opcjonalne

**Ostrzezenie przy braku emaila:**
Pod polem email wyswietlic komunikat: "Brak adresu e-mail oznacza, ze prospekt nie otrzyma wiadomosci przypominajacych o spotkaniu. Partner dołaczajacy musi samodzielnie zadbac o przekazanie danych do dolaczenia."

**Wiadomosc motywacyjna:**
Pod formularzem dodac adnotacje: "Niezaleznie od powiadomien systemowych, dbaj o profesjonalne podejscie do kazdego zaproszonego -- zadne systemy nie zastapia kontaktu bezposredniego z prospektem az do momentu odbycia spotkania."

**Walidacja:**
- `prospectFirstName.trim()` i `bookingNotes.trim()` -- wymagane
- Usuniecie wymogu `prospectLastName` z walidacji

### 2. Zapis danych prospekta (description JSON)

Rozszerzenie obiektu JSON zapisywanego w polu `description` o `prospect_email`:

```text
{
  prospect_first_name: "...",
  prospect_last_name: "...",   // opcjonalne
  prospect_phone: "...",       // opcjonalne
  prospect_email: "...",       // opcjonalne (NOWE)
  booking_notes: "..."
}
```

### 3. Nowy stan w komponencie

Dodanie `prospectEmail` state i reset po rezerwacji.

### 4. Wyslanie e-maila do prospekta przy rezerwacji

Po udanej rezerwacji, jesli `prospect_email` jest podany, wywolac nowa edge function `send-prospect-meeting-email` z danymi:
- prospect_email, prospect_first_name
- data/godzina spotkania
- imie i nazwisko zapraszajacego partnera
- event_id
- typ: "booking_confirmation"

### 5. Nowa Edge Function: `send-prospect-meeting-email`

Funkcja wysylajaca e-maile do prospekta. Przyjmuje parametry:
- `event_id`, `prospect_email`, `prospect_first_name`
- `reminder_type`: "booking", "24h", "12h", "2h", "15min"
- `inviter_name` (imie partnera zapraszajacego)
- `meeting_date`, `meeting_time`
- `zoom_link` (tylko dla 2h i 15min)

Tresc e-maili:
- **Rezerwacja**: Informacja ze spotkanie zainicjowane przez [imie partnera], termin i godzina. Bez linku.
- **24h**: Ponowienie informacji o terminie i godzinie. Bez linku.
- **12h**: Ponowienie + "2 godziny przed spotkaniem otrzymasz link do pokoju. Jesli nie otrzymasz -- skontaktuj sie z osoba zapraszajaca."
- **2h**: Link do Zoom + mile slowa o nowym spojrzeniu na zdrowie i przyszlosc.
- **15min**: Jak 2h ale z podkresleniem "juz za 15 minut, badz punktualnie!"

Funkcja korzysta z SMTP (analogicznie do send-meeting-reminders).

### 6. Rozszerzenie Edge Function: `send-meeting-reminders`

Dodanie obslugi prospekta:
- Przy kazdym spotkaniu trojstronnym odczytac `description` JSON i sprawdzic `prospect_email`
- Jesli email istnieje, wyslac odpowiedni reminder do prospekta (24h, 12h, 2h, 15min)
- Dodanie okna 12h (11h-13h przed spotkaniem) i 2h (110-130 min przed)
- Logowanie dostarczenia w `meeting_reminders_sent` z user_id = null i dodatkowym polem lub specjalnym identyfikatorem

### 7. Nowe szablony e-mail

Utworzenie 5 szablonow w bazie (tabela `email_templates`):
- `prospect_booking_confirmation` -- potwierdzenie rezerwacji
- `prospect_reminder_24h` -- przypomnienie 24h
- `prospect_reminder_12h` -- przypomnienie 12h z info o linku
- `prospect_reminder_2h` -- link do spotkania + mile slowa
- `prospect_reminder_15min` -- link + "za 15 minut"

### 8. Wyswietlanie emaila prospekta w widokach

Aktualizacja wyswietlania danych prospekta w:
- `UpcomingMeetings.tsx` -- pokazac email prospekta jesli podany
- `LeaderMeetingSchedule.tsx` -- pokazac email prospekta
- `IndividualMeetingsHistory.tsx` -- pokazac email prospekta

### Podsumowanie plikow do modyfikacji/utworzenia

**Modyfikacja:**
- `src/components/events/PartnerMeetingBooking.tsx` -- formularz, walidacja, zapis, wyslanie emaila
- `supabase/functions/send-meeting-reminders/index.ts` -- nowe okna 12h/2h, obsluga prospect_email
- `src/components/events/UpcomingMeetings.tsx` -- wyswietlanie emaila
- `src/components/events/LeaderMeetingSchedule.tsx` -- wyswietlanie emaila
- `src/components/events/IndividualMeetingsHistory.tsx` -- wyswietlanie emaila

**Nowe:**
- `supabase/functions/send-prospect-meeting-email/index.ts` -- edge function do emaili prospekta

**Baza danych (SQL):**
- Insert 5 nowych szablonow email do `email_templates`

