

## Dodanie przycisku anulowania spotkań w "Najbliższe Twoje spotkania"

### Zmiana

**Plik: `src/components/events/LeaderMeetingSchedule.tsx`**

1. Dodac importy: `Button`, `AlertDialog` (z komponentami), `toast` z sonner
2. Dodac stan `cancellingId` do sledzenia ktore spotkanie jest anulowane (loading state)
3. Dodac funkcje `handleCancelMeeting(eventId)`:
   - Wywoluje edge function `cancel-individual-meeting` z `{ event_id: eventId }`
   - Po sukcesie: toast sukcesu + odswiezenie listy (`loadMeetings()`)
   - Przy bledzie: toast z bledem
4. Przy kazdym spotkaniu dodac przycisk "Anuluj spotkanie" opakowany w `AlertDialog` z potwierdzeniem:
   - Tytul: "Anulować to spotkanie?"
   - Opis: informacja ze wszyscy uczestnicy zostana powiadomieni
   - Przycisk potwierdzajacy wywoluje `handleCancelMeeting`
   - Przycisk wyswietla loader gdy `cancellingId === meeting.id`

Przycisk bedzie umieszczony na dole kazdej karty spotkania, z wariantem `destructive` i ikona `XCircle`, analogicznie do widoku na screenshocie uzytkownika.

