

# Post-webinar follow-up email — szybka akcja admina

## Kontekst
Obecnie w panelu `EventRegistrationsManagement` admin widzi listę zapisanych użytkowników i gości, ale nie ma przycisku "Wyślij email po webinarze do wszystkich uczestników". Istnieje jedynie opcja wysyłki pojedynczych przypomnień do gości. System ma już infrastrukturę: szablony email, SMTP, edge function `send-single-email` (dla użytkowników platformy) i `send-webinar-email` (dla gości z templatem).

## Plan

### 1. Nowy szablon email: `webinar_followup`
Wstawienie do tabeli `email_templates` szablonu follow-up w stylu PureLife (HTML z logo, kolorystyką marki). Zmienne: `{{imię}}`, `{{event_title}}`, `{{event_date}}`. Treść: podziękowanie za udział, opcjonalny link do nagrania, CTA.

### 2. Nowa Edge Function: `send-post-webinar-email`
Funkcja przyjmuje `event_id`, `template_id` i opcjonalny `custom_message`. Logika:
- Pobiera wszystkich uczestników z `event_registrations` (status = registered) + `guest_event_registrations` (status IN registered, attended)
- Dla użytkowników platformy — email z `profiles`
- Dla gości — email bezpośrednio z rekordu
- Wysyła w batchach po 10 (jak istniejący `send-bulk-webinar-reminders`)
- Loguje każdy email w `email_logs`
- Zwraca statystyki: wysłane/błędy

### 3. UI w `EventRegistrationsManagement.tsx`
Dodanie przycisku "Wyślij email po webinarze" w sekcji akcji nad tabelami. Po kliknięciu:
- Dialog z wyborem szablonu email (domyślnie `webinar_followup`)
- Opcjonalne pole tekstowe na dodatkową wiadomość (zmienna `{{custom_message}}`)
- Podsumowanie: ile osób (użytkownicy + goście) otrzyma email
- Przycisk potwierdzenia z progress bar
- Po zakończeniu: toast z wynikiem (X z Y wysłanych)

### Zmiany w plikach

| Plik | Zmiana |
|------|--------|
| `email_templates` (DB INSERT) | Szablon `webinar_followup` z HTML w stylu PureLife |
| `supabase/functions/send-post-webinar-email/index.ts` | Nowa edge function — bulk send do wszystkich uczestników wydarzenia |
| `src/components/admin/EventRegistrationsManagement.tsx` | Przycisk + dialog "Wyślij email po webinarze" |

### Przepływ admina
1. Admin wybiera wydarzenie z listy
2. Klika "Wyślij email po webinarze" (przycisk z ikoną Mail)
3. W dialogu widzi: szablon (domyślny lub własny), pole custom_message, liczbę odbiorców
4. Potwierdza — system wysyła emaile do wszystkich zapisanych (użytkownicy + goście)
5. Wynik w toaście: "Wysłano 45 z 47 emaili"

