
# Naprawa anulowania spotkan indywidualnych - blokada 2h i zwalnianie terminu

## Zidentyfikowane problemy

### Problem 1: CalendarWidget pozwala anulowac spotkania indywidualne bez ograniczen
Widget "Webinary i spotkania" pod kalendarzem wyswietla przycisk "Wypisz sie" dla WSZYSTKICH zarejestrowanych wydarzen, wlacznie ze spotkaniami indywidualnymi (`tripartite_meeting`, `partner_consultation`). Nie sprawdza:
- Czy to spotkanie indywidualne (ktore wymaga Edge Function do anulowania)
- Czy jest mniej niz 2h do spotkania

Wywoluje standardowa funkcje `cancelRegistration()` ktora jedynie usuwa rejestracje uzytkownika BEZ:
- Oznaczenia wydarzenia jako `is_active: false`
- Anulowania rejestracji hosta
- Wysylki powiadomien email
- Zwalniania terminu

### Problem 2: Termin nie wraca po anulowaniu
Poniewaz CalendarWidget uzywa `cancelRegistration()` zamiast Edge Function `cancel-individual-meeting`, wydarzenie pozostaje `is_active: true`. System sprawdzania dostepnosci slotow (`PartnerMeetingBooking`) filtruje po `is_active: true`, wiec termin nadal jest "zajety".

### Dowod z bazy danych
Spotkanie Sebastian Snopek z Elzbieta Dabrowska (21.02.2026, 16:00 Warszawa):
- Event ID: `2cf51ff7-...` — `is_active: true` (powinno byc `false`)
- Sebastian (booker): status `cancelled` o 15:05 — 55 minut przed spotkaniem
- Elzbieta (host): status `registered` — nie zostala powiadomiona
- Anulowanie przeszlo przez `cancelRegistration()` zamiast Edge Function

### Problem 3: MyMeetingsWidget nie obejmuje meeting_private
Przycisk anulowania w MyMeetingsWidget jest wyswietlany tylko dla `tripartite_meeting` i `partner_consultation`, pomija `meeting_private`.

## Plan napraw

### 1. CalendarWidget — dodac obsluge spotkan indywidualnych

W funkcji `getRegistrationButton()` (linia ~186-210), PRZED wyswietleniem przycisku "Wypisz sie", dodac sprawdzenie:
- Czy wydarzenie jest typu `tripartite_meeting`, `partner_consultation` lub `meeting_private`
- Jesli tak: NIE pokazywac przycisku "Wypisz sie" jesli do spotkania jest mniej niz 2h
- Jesli wiecej niz 2h: pokazac przycisk "Anuluj spotkanie" ktory wywola Edge Function `cancel-individual-meeting` (tak jak robi to juz `onCancelRegistration` w `EventDetailsDialog`)

### 2. CalendarWidget — dodac logike anulowania przez Edge Function

Dla spotkan indywidualnych przycisk powinien:
1. Wyswietlac "Anuluj spotkanie" zamiast "Wypisz sie"
2. Wywolywac `cancel-individual-meeting` Edge Function
3. Byc ukryty gdy do spotkania < 2h

### 3. MyMeetingsWidget — dodac meeting_private do listy typow

W warunku na liniach 239 i 285, dodac `'meeting_private'` obok `tripartite_meeting` i `partner_consultation`.

### 4. EventDetailsDialog — dodac meeting_private do canCancel

W warunku `canCancel` (linia 96), dodac `'meeting_private'` do tablicy typow.

### 5. Naprawic konkretne spotkanie w bazie

Wydarzenie `2cf51ff7-...` wymaga recznej naprawy — ustawic `is_active: false` aby zwolnic termin.

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/dashboard/widgets/CalendarWidget.tsx` | Dodac logike blokowania "Wypisz sie" dla spotkan indywidualnych < 2h, zamienic na "Anuluj" z wywolaniem Edge Function |
| `src/components/dashboard/widgets/MyMeetingsWidget.tsx` | Dodac `meeting_private` do warunkow wyswietlania przycisku anulowania |
| `src/components/events/EventDetailsDialog.tsx` | Dodac `meeting_private` do warunku `canCancel` |

## Szczegoly techniczne

### CalendarWidget.tsx — zmiana getRegistrationButton()

Obecna logika (linia 186-210):
```text
if (event.is_registered) {
  // Pokazuje "Wypisz sie" dla WSZYSTKICH wydarzen
  return <Button onClick={() => cancelRegistration(...)}>Wypisz sie</Button>
}
```

Nowa logika:
```text
if (event.is_registered) {
  const isIndividualMeeting = ['tripartite_meeting', 'partner_consultation', 'meeting_private'].includes(event.event_type);
  
  if (isIndividualMeeting) {
    const minutesUntil = (eventStart.getTime() - now.getTime()) / (1000 * 60);
    if (minutesUntil > 120) {
      // Pokaz "Anuluj spotkanie" z Edge Function
      return <Button onClick={() => handleCancelIndividualMeeting(event)}>Anuluj spotkanie</Button>;
    }
    // < 2h — nie pokazuj zadnego przycisku anulowania
    return <Badge>Zapisany/a</Badge>;
  }
  
  // Dla zwyklych wydarzen — standardowe "Wypisz sie"
  return <Button onClick={() => cancelRegistration(...)}>Wypisz sie</Button>;
}
```

Funkcja `handleCancelIndividualMeeting` wywola Edge Function `cancel-individual-meeting` (identyczna logika jak juz istnieje w `onCancelRegistration` w EventDetailsDialog, linia 473-505).

### MyMeetingsWidget.tsx — zmiana warunkow

Linia 239 i 367:
```text
// Bylo:
event.event_type === 'tripartite_meeting' || event.event_type === 'partner_consultation'

// Bedzie:
['tripartite_meeting', 'partner_consultation', 'meeting_private'].includes(event.event_type)
```

### EventDetailsDialog.tsx — zmiana canCancel

Linia 96:
```text
// Bylo:
['tripartite_meeting', 'partner_consultation'].includes(event.event_type)

// Bedzie:
['tripartite_meeting', 'partner_consultation', 'meeting_private'].includes(event.event_type)
```

### Naprawa danych — event 2cf51ff7

Ustawic `is_active: false` dla anulowanego spotkania, aby termin 15:00 UTC u Elzbiety Dabrowskiej zostal zwolniony.

## Wplyw na istniejacy kod

- Nie narusza logiki webinarow, szkolen zespolowych ani spotkan publicznych — te dalej uzywaja standardowego "Wypisz sie"
- Edge Function `cancel-individual-meeting` juz ma wbudowana walidacje 2h serwerowa — to jest druga warstwa ochrony
- Nie wymaga zmian w bazie danych ani nowych Edge Functions
