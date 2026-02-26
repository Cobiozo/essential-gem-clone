
## Poprawa informacji po rejestracji na webinar + brakujace przypomnienie 15min

### Wyniki audytu

#### 1. Kontakty prywatne partnera -- DZIALA POPRAWNIE
Funkcja `send-webinar-confirmation` (linia 182-240) poprawnie zapisuje gości do `team_contacts` jako kontakt prywatny (`contact_type: 'private'`) z notatką źródłową i statusem `observation`, gdy parametr `invited_by_user_id` jest obecny w rejestracji.

#### 2. Przypomnienia email -- CZESCIOWO BRAKUJE
- 24h przed -- DZIALA (`process-pending-notifications`, linie 313-453, szuka webinarów 24-30h przed)
- 1h przed -- DZIALA (`process-pending-notifications`, linie 456-596, szuka webinarów 50-70 minut przed, wysyła email z linkiem Zoom)
- 15 minut przed -- BRAK dla webinarów (istnieje tylko dla spotkań indywidualnych w `send-meeting-reminders`)

#### 3. Komunikat po rejestracji -- NIEPELNY
Linia 242 w `EventGuestRegistration.tsx` mówi tylko: *"Przypomnienie o webinarze otrzymasz 24 godziny przed jego rozpoczęciem."* -- nie informuje o przypomnieniach 1h i 15min z linkiem do spotkania.

Dodatkowo, gdy do webinaru pozostało mniej niż 24h, informacja o przypomnieniu 24h jest myląca (bo go nie otrzyma).

---

### Plan zmian

#### Zmiana 1: Dodanie przypomnienia 15 minut przed webinarem

**Plik: `supabase/functions/send-webinar-email/index.ts`**
- Rozszerzyć typ `WebinarEmailRequest['type']` o `'reminder_15min'`
- Dodać mapowanie w `getTemplateInternalName` i `getEventTypeKey` na `'webinar_reminder_15min'`

**Plik: `supabase/functions/process-pending-notifications/index.ts`**
- Dodać sekcję 5c po sekcji 5b: "Process webinar reminders (15min before event)"
- Szukać webinarów zaczynających się za 10-20 minut
- Sprawdzać pole `reminder_15min_sent` (do dodania w migracji)
- Wysyłać email typu `reminder_15min` z linkiem Zoom
- Wysyłać push notification: "Webinar za 15 minut: {tytuł}"
- Aktualizować `reminder_15min_sent` i `reminder_15min_sent_at`
- Dodać licznik `webinarReminders15min` do `results`

**Migracja SQL:**
- Dodać kolumny `reminder_15min_sent` (boolean, default false) i `reminder_15min_sent_at` (timestamptz) do tabeli `guest_event_registrations`
- Dodać szablon email `webinar_reminder_15min` do `email_templates`
- Dodać typ zdarzenia `webinar_reminder_15min` do `email_event_types`
- Powiązać szablon z typem zdarzenia w `email_template_event_types`

#### Zmiana 2: Lepszy komunikat po rejestracji (dynamiczny)

**Plik: `src/pages/EventGuestRegistration.tsx`** (linie 241-243)

Zastąpić statyczny tekst dynamicznym komunikatem zależnym od czasu do webinaru:

```text
// Logika:
const hoursUntilEvent = (startDate.getTime() - Date.now()) / (1000 * 60 * 60);

// Gdy > 24h: "Otrzymasz przypomnienia: 24h, 1h i 15 minut przed webinarem 
//             z linkiem do spotkania."
// Gdy 1-24h: "Otrzymasz przypomnienia: 1h i 15 minut przed webinarem 
//             z linkiem do spotkania."
// Gdy < 1h: "Otrzymasz przypomnienie 15 minut przed webinarem 
//            z linkiem do spotkania."
```

---

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `supabase/functions/send-webinar-email/index.ts` | Dodanie typu `reminder_15min` |
| `supabase/functions/process-pending-notifications/index.ts` | Sekcja 5c: przypomnienie 15min przed webinarem |
| `src/pages/EventGuestRegistration.tsx` | Dynamiczny komunikat o przypomnieniach |
| Migracja SQL | Kolumny `reminder_15min_sent/at`, szablon email, typ zdarzenia |

### Co juz dziala poprawnie (bez zmian)
- Zapis kontaktu do `team_contacts` partnera zapraszającego
- Przypomnienie 24h z email i push
- Przypomnienie 1h z email, linkiem Zoom i push
- Potwierdzenie rejestracji (email natychmiast)
