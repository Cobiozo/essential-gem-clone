

# 1. Naprawa paska zakładek + 2. Wyjaśnienie systemu zaproszeń Auto-Webinar

## Punkt 1: Pasek zakładek nachodzi na siebie

Na screenie widać 8 zakładek w `md:grid-cols-8` — tekst się ścieśnia i nachodzi. Zakładka "Tematy" **nie** może być usunięta — jest aktywnie używana przez system rezerwacji spotkań indywidualnych (BookMeetingDialog, useLeaderAvailability). Służy do definiowania tematów, które liderzy oferują na spotkania 1:1.

### Rozwiązanie
Zmienię układ desktop tabs z `grid-cols-8` na **scrollowalny pasek** (`flex` + `overflow-x-auto`), co wyeliminuje nachodzenie niezależnie od liczby zakładek. Alternatywnie mogę pogrupować "Tematy" i "Liderzy" pod jedną zakładkę "Spotkania indywidualne" (już jest taka zakładka — `IndividualMeetingsManagement`), ale to wymaga większego refaktoru.

**Plik:** `src/components/admin/EventsManagement.tsx`
- Zmiana `TabsList className` z `hidden md:grid md:grid-cols-8 gap-1` na `hidden md:flex md:flex-wrap gap-1` lub `overflow-x-auto` z `flex-nowrap`
- Skrócenie etykiet gdzie możliwe (np. "Spotkanie zespołowe" → "Zespołowe", "Spotkanie indywidualne" → "Indywidualne")

---

## Punkt 2: System zaproszeń i powiadomień dla Auto-Webinarów

### Obecny stan
Auto-webinary działają jako samodzielny pokój (`/auto-webinar`) **bez integracji z systemem wydarzeń**. Brak:
- Rejestracji / zaproszeń
- Powiadomień push/email
- Linków zaproszeniowych dla partnerów

### Co trzeba dobudować

Aby partnerzy mogli zapraszać na auto-webinary tak jak na inne wydarzenia, potrzebne są:

1. **Wydarzenie typu `auto_webinar` w tabeli `events`** — jedno stałe wydarzenie tworzone przez admina, które służy jako punkt wejścia do rejestracji
2. **Karta wydarzenia** na liście publicznej z informacją "Webinar automatyczny — starty co godzinę" i odliczaniem do następnego startu
3. **Link zaproszeniowy** w formacie `/e/{slug}?ref={EQID}` — identyczny jak dla innych wydarzeń, partner kopiuje go z panelu swoich zaproszeń (istniejący `UserReflinksPanel` lub karta wydarzenia)
4. **Rejestracja gościa** — formularz `/events/register/:id` (istniejący) zapisuje do `event_registrations` / `guest_event_registrations`
5. **Powiadomienia**:
   - **Dla zapraszającego**: powiadomienie gdy gość się zarejestruje (istniejący mechanizm z `guest_event_registrations`)
   - **Dla zaproszonego/zarejestrowanego**: email z potwierdzeniem rejestracji + link do pokoju `/auto-webinar`
   - **Push reminders**: konfigurowane tak samo jak dla webinarów (edge function `process-pending-notifications`), ale z uwzględnieniem że auto-webinar startuje co godzinę

### Proponowany zakres implementacji

| Zmiana | Plik |
|--------|------|
| Scrollowalny pasek zakładek | `EventsManagement.tsx` |
| Tworzenie wydarzenia auto_webinar w panelu admina | `AutoWebinarManagement.tsx` — dodanie sekcji "Powiąż z wydarzeniem" |
| Karta auto-webinar na liście wydarzeń | `EventCardCompact.tsx` — obsługa typu `auto_webinar` z countdownem |
| Link zaproszeniowy dla partnerów | Wykorzystanie istniejącego systemu slug + ref |
| Email potwierdzający z linkiem do pokoju | Modyfikacja szablonu emaila rejestracji |

Czy chcesz abym w pierwszym kroku naprawił pasek zakładek, a w drugim zaimplementował system zaproszeń i powiadomień dla auto-webinarów?

