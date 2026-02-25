

## Zmiana komunikatu informacyjnego w zależności od typu spotkania

### Opis
Obecnie na dole formularza rezerwacji wyświetlany jest ten sam komunikat motywacyjny niezależnie od typu spotkania. Należy wyświetlać inny tekst dla spotkań trójstronnych i inny dla konsultacji partnerskich.

### Zmiana

**Plik: `src/components/events/PartnerMeetingBooking.tsx`** (linie 1228-1234)

Zamiana stałego tekstu na warunkowy w zależności od `meetingType`:

- **Spotkanie trójstronne** (`tripartite`) -- obecny tekst bez zmian:
  > "Niezależnie od powiadomień systemowych, dbaj o profesjonalne podejście do każdego zaproszonego -- żadne systemy nie zastąpią kontaktu bezpośredniego z prospektem aż do momentu odbycia spotkania."

- **Konsultacje dla partnerów** (`consultation`) -- nowy tekst:
  > "Aby spotkanie przebiegło sprawnie i merytorycznie, opisz możliwie dokładnie cel konsultacji, tak aby prowadzący mógł się odpowiednio przygotować. Pamiętaj, że warunkiem rezerwacji konsultacji jest ukończenie wymaganych szkoleń w Akademii."

### Zakres
- 1 plik, zmiana w jednym miejscu (sekcja "Motivational message", linie 1228-1234)

