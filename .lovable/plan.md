
## Dodanie Web Push z konfigurowalnymi przypomnieniami do webinarow

### Opis funkcji
Dodanie do formularza tworzenia webinarow:
1. Przelacznik "Web Push" obok istniejacych SMS i E-mail
2. Do 3 konfigurowalnych przypomnien z wartosciami: 1, 2, 3, 5, 10, 15, 30 minut przed startem
3. Dynamiczne dodawanie przypomnien przyciskiem "+" (max 3, bez duplikatow)
4. Edge function/CRON respektujacy te ustawienia i obliczajacy poprawny czas w tresci powiadomienia

### Zmiany w bazie danych (migracja SQL)

Dodanie 2 nowych kolumn do tabeli `events`:
```text
push_reminder_enabled  BOOLEAN DEFAULT false
push_reminder_minutes  JSONB DEFAULT NULL   -- np. [5, 15, 30]
```

Kolumna `push_reminder_minutes` przechowuje tablice do 3 wartosci w minutach (np. `[5, 15, 30]`).

Dodanie tabeli sledzenia wyslanych push-przypomnien:
```text
event_push_reminders_sent (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  user_id UUID,
  guest_email TEXT,
  reminder_minutes INT,       -- wartosc z konfiguracji (np. 5)
  sent_at TIMESTAMPTZ DEFAULT now()
)
```
Z unikalnym indeksem na `(event_id, COALESCE(user_id, '00000000-...'), COALESCE(guest_email,''), reminder_minutes)` zapobiegajacym duplikatom.

### Zmiany w WebinarForm.tsx

W sekcji "Przypomnienia" (Collapsible, linie 667-693):
- Dodac trzeci Switch "Web Push" z ikona `Bell`
- Pod switchem Web Push, gdy wlaczony -- sekcja z dynamicznymi selektorami:
  - Pierwszy Select z wartosciami [1,2,3,5,10,15,30] min
  - Przycisk "+" obok, ktory dodaje kolejny Select (max 3 lacznie)
  - Kazdy kolejny Select filtruje juz wybrane wartosci
  - Przycisk "x" do usuwania wybranego przypomnienia (przy 2. i 3.)
- Dane zapisywane w formularzu jako `push_reminder_enabled: boolean` i `push_reminder_minutes: number[]`

### Zmiany w typach (src/types/events.ts)

Dodanie do `WebinarFormData`:
```text
push_reminder_enabled: boolean;
push_reminder_minutes: number[];
```

### Zmiany w handleSave (WebinarForm.tsx)

W obiekcie `webinarData` dodac:
```text
push_reminder_enabled: form.push_reminder_enabled,
push_reminder_minutes: JSON.stringify(form.push_reminder_minutes)
```

### Zmiany w process-pending-notifications/index.ts

Dodanie nowej sekcji "5d" po istniejacych przypomnieniach webinarowych:

1. Pobranie webinarow z `push_reminder_enabled = true` i `push_reminder_minutes IS NOT NULL`
2. Dla kazdego webinaru parsowanie tablicy minut (np. `[5, 15, 30]`)
3. Dla kazdej wartosci minut sprawdzenie czy `start_time` wypada w oknie czasowym:
   - Okno: `now + (minutes - margin)` do `now + (minutes + margin)`, gdzie margin = polowa interwalu CRON (np. 1 minuta)
4. Pobranie zarejestrowanych uzytkownikow (event_registrations + guest_event_registrations)
5. Sprawdzenie w `event_push_reminders_sent` czy push juz nie zostal wyslany
6. Obliczenie poprawnego czasu w tresci:
   - `minutesRemaining = Math.round((eventStart - now) / 60000)`
   - Tresc: "Webinar za X minut: {title}" (nie za 5 minut jesli faktycznie zostaly 4)
7. Wywolanie `send-push-notification` z odpowiednim payloadem
8. Zapis do `event_push_reminders_sent`

### Logika obliczania poprawnego czasu

Kluczowa czesc -- jesli CRON zadziala np. 4 minuty przed startem a ustawione jest 5 minut:
```text
const minutesLeft = Math.round((eventStart - now) / 60000);
const title = `Webinar za ${minutesLeft} min: ${webinar.title}`;
const body = `Rozpoczecie o ${formattedTime}`;
```

Okno tolerancji dla kazdego przypomnienia: `[configuredMinutes - 2, configuredMinutes + 2]` minut przed startem. To zapewnia ze CRON uruchamiany co minute zlapie kazde przypomnienie.

### Pliki do zmiany/utworzenia

| Plik | Operacja | Opis |
|------|----------|------|
| Migracja SQL | Nowa | Kolumny `push_reminder_enabled`, `push_reminder_minutes` + tabela `event_push_reminders_sent` |
| `src/types/events.ts` | Edycja | Dodanie pol do `WebinarFormData` |
| `src/components/admin/WebinarForm.tsx` | Edycja | UI: switch Web Push + dynamiczne selektory minut |
| `supabase/functions/process-pending-notifications/index.ts` | Edycja | Nowa sekcja wysylania push-przypomnien wg konfiguracji |

### Wyglad UI (sekcja Przypomnienia)

```text
[v] Przypomnienia
  [ ] SMS
  [v] E-mail
  [v] Web Push
      [Select: 30 min] [x]  [Select: 15 min] [x]  [Select: 5 min] [x]
      (maks. 3 przypomnienia)
```

Kazdy Select zawiera opcje: 1 min, 2 min, 3 min, 5 min, 10 min, 15 min, 30 min -- z wylaczeniem juz wybranych wartosci. Przycisk "+" pojawia sie tylko gdy jest mniej niz 3 przypomnien.
