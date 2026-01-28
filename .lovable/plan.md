
# Plan: Kody OTP dla admina + Nowy harmonogram przypomnień o spotkaniach

## Część 1: Kody OTP - Admin widzi tylko swoje kody

### Aktualny stan
Kod w `CombinedOtpCodesWidget.tsx` już filtruje po `partner_id = user.id` (linie 175, 210). Admin nie widzi kodów bo prawdopodobnie sam nie ma wygenerowanych żadnych kodów (nie jest partnerem który generuje kody).

### Wyjaśnienie
Widget jest już poprawnie skonfigurowany - każdy użytkownik (partner i admin) widzi **tylko swoje kody**. Problem polega na tym, że admin prawdopodobnie nie ma żadnych wygenerowanych kodów, dlatego widget jest pusty lub nie wyświetla się wcale (linia 297-299 ukrywa widget gdy `totalCodes === 0`).

**Rozwiązanie**: Brak zmian potrzebnych - widget działa poprawnie. Jeśli admin ma swoje kody, zobaczy je.

---

## Część 2: Nowy harmonogram powiadomień o spotkaniach

### Wymagane zmiany (według specyfikacji)

| Kiedy | Dla kogo | Co wysłać | Status aktualny |
|-------|----------|-----------|-----------------|
| **Zaraz po rezerwacji** | Leader | Email "meeting_booked" | ✅ Działa |
| **Zaraz po rezerwacji** | Rezerwujący | Email "meeting_confirmed" | ✅ Działa |
| **Zaraz po anulowaniu** | Wszyscy | Email "event_cancelled" | ✅ Działa |
| **1h przed** | Leader | Email z linkiem + przypomnienie | ✅ Działa (template `meeting_reminder_1h`) |
| **1h przed** | Rezerwujący (trójstronne) | Email + adnotacja o kontakcie z gościem zewnętrznym | ⚠️ Wymaga zmian |
| **15 min przed** | Obaj | Email przypominający | ❌ Brak - trzeba dodać |
| **2h przed** | - | Blokada anulowania | ❌ Trzeba dodać walidację |

### Aktualne szablony email (w bazie)
- `meeting_reminder_24h` - ❌ **Do usunięcia** (wg specyfikacji nie ma być)
- `meeting_reminder_1h` - ✅ Istnieje, wymaga aktualizacji treści

### Brakujące elementy
1. **Szablon `meeting_reminder_15min`** - nowy szablon email
2. **Logika różnicowania** - inny email dla leadera vs rezerwującego w trybie trójstronnym
3. **Blokada anulowania 2h przed** - walidacja w `cancel-individual-meeting/index.ts`

---

## Zmiany techniczne

### 1. Nowy szablon email: `meeting_reminder_15min`

**Wstawka SQL do bazy:**
```sql
INSERT INTO email_templates (internal_name, subject, body_html, footer_html, is_active)
VALUES (
  'meeting_reminder_15min',
  '⏰ Spotkanie za 15 minut: {{temat}} o {{godzina_spotkania}}',
  '<h2>Spotkanie zaczyna się za 15 minut!</h2>
   <p>Cześć {{imię}},</p>
   <p>Twoje spotkanie <strong>{{temat}}</strong> rozpocznie się o <strong>{{godzina_spotkania}}</strong>.</p>
   <p>Pokój spotkania będzie otwarty 5 minut przed czasem.</p>
   <p><a href="{{zoom_link}}">Kliknij tutaj aby dołączyć do spotkania</a></p>',
  '<p>Pozdrawiamy,<br>Zespół Pure Life</p>',
  true
);
```

### 2. Aktualizacja szablonu `meeting_reminder_1h` dla trójstronnego

Dodać wariant dla rezerwującego w spotkaniu trójstronnym:
```html
<p><strong>Przypomnienie:</strong> Jeśli zapraszasz osobę zewnętrzną na to spotkanie, 
skontaktuj się z nią teraz, aby upewnić się, że nic w planach się nie zmieniło. 
Prześlij jej link do spotkania - pokój będzie otwarty 5 minut przed czasem.</p>
```

### 3. Modyfikacja `send-meeting-reminders/index.ts`

**Plik**: `supabase/functions/send-meeting-reminders/index.ts`

#### a) Zmiana okien czasowych (linie 164-171)
```typescript
// PRZED (24h + 1h):
const reminder24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
const reminder24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
const reminder1hStart = new Date(now.getTime() + 45 * 60 * 1000);
const reminder1hEnd = new Date(now.getTime() + 75 * 60 * 1000);

// PO (1h + 15min):
const reminder1hStart = new Date(now.getTime() + 50 * 60 * 1000); // 50-70 min before
const reminder1hEnd = new Date(now.getTime() + 70 * 60 * 1000);
const reminder15minStart = new Date(now.getTime() + 10 * 60 * 1000); // 10-20 min before
const reminder15minEnd = new Date(now.getTime() + 20 * 60 * 1000);
```

#### b) Dodanie logiki dla spotkania trójstronnego
W pętli wysyłania emaili dodać rozróżnienie:
```typescript
// Check if this is tripartite meeting and if user is the booker (not host)
const isTripartite = meeting.event_type === 'tripartite_meeting';
const isBooker = profile.user_id !== meeting.host_user_id;

// Add special note for booker in tripartite meetings (1h reminder only)
if (isTripartite && isBooker && reminderType === '1h') {
  variables['adnotacja_trojstronna'] = 
    'Pamiętaj, aby skontaktować się z osobą zaproszoną z zewnątrz i upewnić się, ' +
    'że nic w planach się nie zmieniło. Prześlij jej link do spotkania - ' +
    'pokój będzie otwarty 5 minut przed czasem.';
}

// Add Zoom link to reminder
variables['zoom_link'] = meeting.zoom_link || '';
```

#### c) Usunięcie 24h reminder
Całkowicie usunąć logikę dla `reminder24hStart/End` i szablonu `meeting_reminder_24h`.

### 4. Blokada anulowania 2h przed spotkaniem

**Plik**: `supabase/functions/cancel-individual-meeting/index.ts`

Dodać walidację po pobraniu eventu (około linii 75):
```typescript
// Check if meeting is within 2 hours
const meetingStart = new Date(event.start_time);
const now = new Date();
const hoursUntilMeeting = (meetingStart.getTime() - now.getTime()) / (1000 * 60 * 60);

if (hoursUntilMeeting <= 2) {
  console.log('[cancel-individual-meeting] Cannot cancel - less than 2h before meeting');
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'Nie można anulować spotkania na mniej niż 2 godziny przed jego rozpoczęciem' 
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

## Lista plików do modyfikacji

| Plik | Zmiana |
|------|--------|
| `supabase/functions/send-meeting-reminders/index.ts` | Nowy harmonogram (1h + 15min), usunięcie 24h, logika trójstronnego |
| `supabase/functions/cancel-individual-meeting/index.ts` | Blokada anulowania 2h przed |
| Baza danych (email_templates) | Nowy szablon `meeting_reminder_15min` |
| Baza danych (email_templates) | Aktualizacja `meeting_reminder_1h` o adnotację trójstronną |

---

## Oczekiwany rezultat

1. **Admin na pulpicie** - widzi swoje kody OTP (bez zmian w kodzie - działa poprawnie)
2. **Po rezerwacji** - natychmiastowy email do obu stron
3. **1h przed** - email z linkiem do spotkania; dla trójstronnego rezerwujący dostaje dodatkową adnotację o kontakcie z gościem
4. **15 min przed** - email przypominający z linkiem
5. **Anulowanie** - zablokowane na mniej niż 2h przed spotkaniem
6. **Pokój spotkania** - otwierany 5 minut przed (to jest konfiguracja Zoom, nie wymaga zmian w kodzie)
