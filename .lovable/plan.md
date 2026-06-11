## Problem

Dialog szczegółów spotkania (`src/components/events/EventDetailsDialog.tsx`) dla `partner_consultation` i `tripartite_meeting` pokazuje sekcję „Dane konsultacji / Dane spotkania trójstronnego" z polami zapisanymi w `events.description` (JSON). Dla konsultacji partnerskich JSON zawiera tylko `consultation_purpose` i `booking_notes` — nie ma w ogóle informacji **kto zarezerwował** spotkanie. Lider widzący „Konsultacje dla partnerów" w swoim kalendarzu nie wie, z kim ma to spotkanie.

Symetrycznie partner-rezerwujący widzi pole „Prowadzący" — to działa, bo `event.host_profile` jest dociągane.

Brakuje danych „rezerwującego" partnera. W bazie tę informację mamy: `events.created_by` = `user.id` partnera, który wykonał rezerwację (`PartnerMeetingBooking.tsx:671`).

## Rozwiązanie

W `EventDetailsDialog.tsx`:

1. Dla `event.event_type ∈ {partner_consultation, tripartite_meeting}` dociągnąć profil rezerwującego z `profiles` po `events.created_by` (osobny `useEffect`, analogicznie do istniejącego pobierania `zoom_link`):

```ts
const [bookerProfile, setBookerProfile] = useState<{ first_name, last_name, phone_number, email } | null>(null);
```

Pobranie tylko gdy `created_by !== host_user_id` (żeby nie duplikować) i tylko dla powyższych typów. Pole `email` z `profiles` (jeśli brak, fallback do `get-user-emails` pomijamy — wystarczy imię, nazwisko, telefon).

2. W sekcji „Dane konsultacji / Dane spotkania trójstronnego" dodać wiersz **„Rezerwujący"** (ikona `User`) z imieniem i nazwiskiem rezerwującego — pokazywany tylko gdy:
   - aktualny `user.id` (`useAuth`) === `event.host_user_id` (czyli widzimy spotkanie jako prowadzący), **lub**
   - widz jest adminem (drugi przypadek: nie pogarszamy admin UX).
   
   Pod wierszem opcjonalnie telefon (jeśli `bookerProfile.phone_number`).

3. Zachować istniejący wiersz „Prowadzący" — dla rezerwującego (`user.id === event.created_by`) to już pokazuje dane lidera prowadzącego spotkanie (z `event.host_profile`).

4. Dla `partner_consultation` aktualnie sekcja „Dane konsultacji" wyświetla się tylko gdy `prospectData` udało się sparsować z JSON. To OK — dla konsultacji partnerskich JSON istnieje (zawiera `consultation_purpose`), więc sekcja będzie widoczna.

5. Dla `tripartite_meeting` rezerwujący jest osobny od prospekta (gość spoza systemu). Wiersz „Rezerwujący" też pasuje — pokazuje partnera, który stworzył spotkanie (oprócz pól prospekta).

### Wynikowy układ sekcji (lider patrzący na konsultację)

```
Dane konsultacji
  Prowadzący: <host_profile>   (już jest)
  Rezerwujący: <booker_profile>  ← nowe
  Telefon: <booker.phone>        ← nowe (jeśli jest)
  Cel: <consultation_purpose>
  Notatki: <booking_notes>
```

Rezerwujący patrzący na to samo spotkanie widzi standardowo „Prowadzący: <lider>" — bez zmian.

## Pliki do zmiany

- `src/components/events/EventDetailsDialog.tsx`
  - dodać import `useAuth` z `@/contexts/AuthContext`
  - dodać `useState` + `useEffect` pobierający `bookerProfile` z `profiles` po `event.created_by`
  - rozszerzyć sekcję z `prospectData` o wiersze „Rezerwujący" + telefon, warunkowo gdy `user?.id === event.host_user_id` (lub admin)

Brak zmian w bazie, edge functions ani w komponencie rezerwacji.
