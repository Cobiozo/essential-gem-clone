

## Plan: Emaile po wydarzeniach — pełne nazwy webinarów, bez skrótów

### Kontekst
W zatwierdzonym planie (który jeszcze nie został wdrożony) padły skróty "BO" i "HC" w opisie wiadomości email dla gości, którzy nie dołączyli do spotkania. Użytkownik wymaga, aby w treści emaili zawsze pojawiały się pełne nazwy wydarzeń (np. "Business Opportunity", "Health Conversation"), a nie skróty.

### Co się zmienia w porównaniu z poprzednim planem

Jedyna zmiana dotyczy treści szablonu emaila "sorry you missed it" — zamiast wstawiania skrótu kategorii (BO/HC), email będzie używał pełnego tytułu wydarzenia (`event_title`), który jest już dostępny w danych przekazywanych do funkcji.

### Plan implementacji (3 zadania z poprzedniego planu + korekta)

#### 1. Usunąć wysyłkę podziękowań dla zarejestrowanych użytkowników
**Plik:** `supabase/functions/process-pending-notifications/index.ts`
- Usunąć blok linii 888-951 (przetwarzanie `event_registrations` dla thank-you)
- Partnerzy, specjaliści i klienci nie otrzymują emaili po spotkaniu

#### 2. Dodać sprawdzanie obecności dla gości
**Plik:** `supabase/functions/process-pending-notifications/index.ts`
- W bloku przetwarzania `guest_event_registrations` (linie 953-997):
  - Sprawdzić czy event ma konfigurację auto-webinaru (`auto_webinar_config`)
  - Jeśli tak: szukać widoku w `auto_webinar_views` po emailu gościa + video z tego eventu
  - Jeśli widok istnieje z `watch_duration_seconds > 0` → wysłać podziękowanie (typ `thank_you`)
  - Jeśli brak widoku lub `watch_duration_seconds = 0` → wysłać email "przykro nam" (typ `missed_event`)
  - Przekazać `email_type` i `event_title` do funkcji `send-post-event-thank-you`

#### 3. Dodać szablon "przykro nam" z pełnym tytułem wydarzenia
**Plik:** `supabase/functions/send-post-event-thank-you/index.ts`
- Dodać parametr `email_type` (`thank_you` | `missed_event`)
- Dodać nową funkcję `buildMissedEventHtml` z treścią:
  - "Przykro nam, że nie udało Ci się dołączyć do spotkania **[pełny tytuł wydarzenia]**"
  - "Wierzymy, że wszystko jest u Ciebie w porządku"
  - "Aby uzyskać nowy termin spotkania **[pełny tytuł wydarzenia]**, skontaktuj się z [imię i nazwisko partnera, email, telefon]"
  - Przycisk CTA: "Napisz do [imię partnera]" lub "Napisz do nas"
- **Wszędzie w szablonach używany jest `eventTitle`** — pełny tytuł z bazy danych, bez żadnych skrótów

### Pliki do modyfikacji
1. `supabase/functions/process-pending-notifications/index.ts`
2. `supabase/functions/send-post-event-thank-you/index.ts`

### Co pozostaje bez zmian
- Istniejący szablon `buildThankYouHtml` — bez zmian (już używa `eventTitle`)
- `send-guest-thank-you-email` (WebRTC) — bez zmian
- Frontend, komponenty, baza danych — bez zmian

