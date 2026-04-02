

# Natychmiastowe wysyłanie emaili po zakończeniu webinaru

## Problem

Obecnie emaile po webinarze (thank_you / missed_event) są wysyłane tylko przez CRON co 5 minut. Użytkownik chce, żeby email dotarł 5-10 sekund po zakończeniu nagrania.

## Rozwiązanie

### 1. Trigger z klienta w `AutoWebinarEmbed.tsx`

Dodać `useEffect` reagujący na `isVideoEnded === true` dla gości. Gdy wideo się skończy i ekran podziękowania się pojawi, komponent od razu wywoła edge function `send-post-event-thank-you`:

```
isVideoEnded → true → useEffect → supabase.functions.invoke('send-post-event-thank-you', {
  event_id, recipient_email, recipient_name, event_title,
  inviter_user_id, source_type: 'guest_event_registration',
  source_id: guestRegistrationId, email_type: 'thank_you'
})
```

- Zabezpieczenie `useRef` przed podwójnym wywołaniem
- Pobiera dane wydarzenia i zapraszającego z już dostępnych danych w komponencie (config, registration)
- Oznacza `thank_you_sent = true` na rejestracji gościa po udanej wysyłce

### 2. Email "missed_event" — nadal przez CRON

Goście, którzy nie dołączyli, nie mają otwartej strony webinaru, więc trigger kliencki nie zadziała. CRON (Step 9b) dalej obsługuje `missed_event` — to jest poprawne. Bez zmian.

### 3. Deduplikacja

Edge function `send-post-event-thank-you` nie sprawdza `thank_you_sent` — robi to CRON przed wywołaniem. Dodać w edge function sprawdzanie `thank_you_sent` w `guest_event_registrations`, żeby CRON nie wysłał duplikatu jeśli klient już wysłał.

### Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | useEffect na `isVideoEnded` — natychmiastowe wywołanie send-post-event-thank-you |
| `supabase/functions/send-post-event-thank-you/index.ts` | Sprawdzanie `thank_you_sent` przed wysyłką (deduplikacja) |

