

## Zabezpieczenie webinarow haslem (spotkania wewnetrzne)

### Cel
Dodanie mozliwosci ustawienia hasla dostepu do wewnetrznego pokoju spotkania podczas tworzenia webinaru/szkolenia. Uczestnicy musza podac haslo przed wejsciem do lobby.

### Zmiany

#### 1. Migracja SQL - nowa kolumna `meeting_password`

Dodanie kolumny `meeting_password text` do tabeli `events`:

```sql
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS meeting_password text;
```

Haslo przechowywane jako zwykly tekst (nie jest to secret -- to haslo dostepu do pokoju, widoczne dla admina/hosta).

#### 2. WebinarForm.tsx - pole hasla w sekcji "Wewnetrzny pokoj spotkania"

Gdy `use_internal_meeting` jest wlaczony, pod togglem pojawi sie dodatkowe pole:
- Switch "Zabezpiecz haslem" + pole tekstowe na haslo
- Przycisk do generowania losowego hasla (6 znakow)
- Haslo zapisywane w kolumnie `meeting_password` przy insercie/update

Pole pojawi sie bezposrednio pod istniejacym blokiem "Wewnetrzny pokoj spotkania" (linia 424-446).

#### 3. TeamTrainingForm.tsx - to samo pole hasla

Analogiczna zmiana w formularzu szkolen (jesli rowniez ma toggle `use_internal_meeting`).

#### 4. MeetingRoom.tsx - bramka hasla przed lobby

W `verifyAccess()` (linia 101-156), po sprawdzeniu ze uzytkownik ma dostep:
- Pobrac rowniez `meeting_password` z eventu
- Jesli `meeting_password` nie jest null/pusty, ustawic nowy status `'password-gate'` zamiast `'lobby'`
- Nowy ekran (inline w MeetingRoom.tsx) -- prosty formularz z polem na haslo i przyciskiem "Dolacz"
- Po wpisaniu poprawnego hasla -> przejscie do `'lobby'`
- Host/admin/tworca pomijaja bramke hasla (wchodza bezposrednio)

#### 5. Typy TypeScript

Dodanie `meeting_password?: string | null` do `WebinarFormData` i `EventFormData` w `src/types/events.ts`.

### Logika bezpieczenstwa

- **Host, admin i tworca** zawsze omijaja haslo (automatyczne przejscie do lobby)
- **Gosc (guest mode)** -- bramka hasla przed formularzem goscia
- Haslo sprawdzane po stronie klienta (porownanie z wartoscia z bazy). To jest wystarczajace bo:
  - RLS i tak kontroluje kto widzi event
  - Haslo sluzy jako dodatkowa warstwa "wiedzy" (czy ktos dostal haslo od organizatora), nie jako bezpieczenstwo kryptograficzne

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| Migracja SQL | `ALTER TABLE events ADD COLUMN meeting_password text` |
| `src/types/events.ts` | Dodanie `meeting_password` do typow formularzy |
| `src/components/admin/WebinarForm.tsx` | Pole hasla pod togglem wewnetrznego spotkania |
| `src/components/admin/TeamTrainingForm.tsx` | Analogiczne pole hasla |
| `src/pages/MeetingRoom.tsx` | Bramka hasla przed lobby + nowy status `password-gate` |
