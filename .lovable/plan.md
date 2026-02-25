

## Plan: Rozbudowa systemu rezerwacji spotkań indywidualnych

Trzy główne zmiany:
1. Po kliknięciu powiadomienia -- wyświetlenie podsumowania konkretnego spotkania
2. Nowa zakładka "Zarezerwowane" obok "Historii" z pełnymi danymi spotkań
3. Formularz przed potwierdzeniem rezerwacji -- wymagane dane prospekta (trójstronne) lub cel konsultacji

---

### 1. Podsumowanie spotkania po kliknięciu powiadomienia

**Obecny stan**: Powiadomienie zawiera `link: '/events/individual-meetings'` i `metadata: { event_id }`. Po kliknięciu otwiera się strona z zakładkami do rezerwacji, ale brak informacji o konkretnym spotkaniu.

**Zmiana**: 
- `IndividualMeetingsPage.tsx` -- odczytać parametr URL `?event=<event_id>` z `useSearchParams`
- Jeśli parametr istnieje, wyświetlić kartę podsumowania spotkania (kto zarezerwował, z kim, kiedy, typ, link Zoom, notatki) zamiast standardowego widoku rezerwacji
- Po zamknięciu podsumowania wrócić do normalnego widoku
- Powiadomienia już przekazują `event_id` w metadata -- trzeba zmienić link na `/events/individual-meetings?event=<event_id>`

**Pliki**:
- `src/pages/IndividualMeetingsPage.tsx` -- dodać obsługę parametru `event` i komponent podsumowania
- `src/components/events/PartnerMeetingBooking.tsx` -- zmienić linki w powiadomieniach (in-app i push) na zawierające `?event=${event.id}`

### 2. Zakładka "Zarezerwowane" z pełnymi danymi

**Obecny stan**: Strona `IndividualMeetingsPage` pokazuje tylko formularz rezerwacji. Historia spotkań jest dostępna w Panelu Lidera (UnifiedMeetingSettingsForm). Brak widoku aktualnie zarezerwowanych spotkań dla rezerwującego.

**Zmiana**: Dodać trzy pod-zakładki na stronie IndividualMeetingsPage:
- **Rezerwuj** (obecny widok z formularzem)
- **Zarezerwowane** (nowa: przyszłe spotkania z pełnymi danymi)
- **Historia** (przeszłe spotkania)

**Nowy komponent `UpcomingMeetings.tsx`**:
- Pobiera przyszłe spotkania z tabeli `events` gdzie użytkownik jest hostem LUB zarejestrowanym uczestnikiem
- Wyświetla: typ spotkania, data/godzina, partner (host lub rezerwujący), link Zoom, dane prospekta i notatki (z pola `description` w events)
- Możliwość anulowania spotkania (jeśli > 2h przed startem)

**Pliki**:
- `src/components/events/UpcomingMeetings.tsx` -- nowy komponent
- `src/pages/IndividualMeetingsPage.tsx` -- dodać zakładki Rezerwuj/Zarezerwowane/Historia

### 3. Formularz danych przed potwierdzeniem rezerwacji

**Obecny stan**: Krok "Potwierdź rezerwację" (step = 'confirm') pokazuje podsumowanie (partner, data, godzina, Zoom) i przycisk "Potwierdź". Brak pól do wpisania informacji o prospekcie czy celu spotkania.

**Zmiana**: Przed przyciskiem "Potwierdź rezerwację" dodać wymagane pola:

Dla **spotkania trójstronnego**:
- Imię prospekta (wymagane)
- Nazwisko prospekta (wymagane)  
- Telefon prospekta (opcjonalnie)
- Dodatkowe informacje (pole tekstowe, opcjonalnie)

Dla **konsultacji partnerskich**:
- Cel konsultacji (wymagane, pole tekstowe)
- Dodatkowe informacje (opcjonalnie)

**Przechowywanie danych**: Dane prospekta i notatki będą zapisywane w polu `description` tabeli `events` (typ text, już istnieje) jako sformatowany tekst. To pozwala uniknąć migracji bazy danych.

**Pliki**:
- `src/components/events/PartnerMeetingBooking.tsx`:
  - Dodać stany: `prospectName`, `prospectLastName`, `prospectPhone`, `bookingNotes`, `consultationPurpose`
  - W kroku `confirm` dodać pola formularza
  - Walidacja przed wysłaniem (wymagane pola)
  - Przy tworzeniu eventu zapisać dane w polu `description`
  - Uwzględnić dane prospekta w powiadomieniach (email, in-app, push)

---

### Szczegóły techniczne

**Struktura danych w `description`** (JSON w polu text):
```text
{
  "prospect_first_name": "Jan",
  "prospect_last_name": "Kowalski",
  "prospect_phone": "+48123456789",
  "booking_notes": "Zainteresowany współpracą",
  "consultation_purpose": "Strategia rozwoju"
}
```

**Zmiana linków powiadomień** (4 miejsca w PartnerMeetingBooking + edge functions):
```text
link: `/events/individual-meetings?event=${event.id}`
url: `/events/individual-meetings?event=${event.id}`
```

**Nowe pliki**:
- `src/components/events/UpcomingMeetings.tsx`
- `src/components/events/MeetingSummaryCard.tsx` (karta podsumowania po kliknięciu powiadomienia)

**Edytowane pliki**:
- `src/pages/IndividualMeetingsPage.tsx` -- nowa struktura z zakładkami i obsługą parametru URL
- `src/components/events/PartnerMeetingBooking.tsx` -- formularz danych prospekta + zaktualizowane linki powiadomień
- `supabase/functions/send-meeting-reminders/index.ts` -- link z event_id
- `supabase/functions/cancel-individual-meeting/index.ts` -- link z event_id

