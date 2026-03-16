

# Plan: Email z podziękowaniem po wydarzeniu + test sekwencji emaili

## Analiza obecnego stanu

### Istniejące emaile "thank you":
1. **`send-guest-thank-you-email`** — wysyłany TYLKO do gości (meeting_guest_tokens), TYLKO po opuszczeniu pokoju WebRTC (VideoRoom.tsx), wymaga min. 30s uczestnictwa. Nie dotyczy gości webinarów Zoom ani zalogowanych użytkowników.
2. **`send-post-webinar-email`** — ręczny email follow-up wysyłany przez admina z panelu (nie automatyczny). Używa szablonu `webinar_followup` z bazy.

### Brakujący email:
Nie ma **automatycznego** emaila z podziękowaniem za uczestnictwo wysyłanego po zakończeniu webinaru/wydarzenia do WSZYSTKICH uczestników (zalogowanych + gości). Istniejący `send-guest-thank-you-email` jest ograniczony do gości WebRTC i nie zawiera treści o "wróć do osoby zapraszającej".

### Logo:
`send-guest-thank-you-email` **NIE** ma logo Pure Life Center (złoty nagłówek). Używa fioletowego gradientu zamiast złotego z logo.

---

## Co zostanie zbudowane

### 1. Nowa Edge Function: `send-post-event-thank-you`

Automatyczny email z podziękowaniem wysyłany po zakończeniu wydarzenia do wszystkich uczestników.

**Odbiorcy:**
- Zalogowani użytkownicy (z `event_registrations`)
- Goście (z `guest_event_registrations`)

**Treść emaila:**
- Złoty nagłówek z logo Pure Life Center
- Podziękowanie za uczestnictwo w konkretnym wydarzeniu
- Sekcja z danymi osoby zapraszającej (jeśli istnieje `invited_by_user_id`)
- Tekst zachęcający do kontaktu z osobą zapraszającą: "to nie jedyne takie spotkanie", "dzięki tej osobie możesz otrzymywać informacje o kolejnych wydarzeniach"
- Fallback gdy brak zapraszającego: zachęta do kontaktu z Zespołem Pure Life

**Wyzwalanie:**
- Nowy krok w `process-pending-notifications` (CRON) — sprawdza wydarzenia zakończone w ciągu ostatnich 2h i wysyła podziękowania do uczestników, którym jeszcze nie wysłano
- Nowa kolumna `thank_you_sent` / `thank_you_sent_at` w `guest_event_registrations` i `event_registrations`

### 2. Aktualizacja `send-guest-thank-you-email`

- Zamiana fioletowego nagłówka na złoty z logo Pure Life Center (spójność brandingu)

### 3. Test: wysłanie sekwencji emaili do sebastiansnopek87@gmail.com

Sekwencja emaili jakie dostaje osoba rejestrująca się 24h przed webinarem:

1. **Potwierdzenie rejestracji** — `send-webinar-confirmation` (typ: confirmation)
2. **Przypomnienie 24h** — `send-webinar-confirmation` (typ: reminder, template: webinar_reminder_24h)
3. **Przypomnienie 12h** — `send-bulk-webinar-reminders` (typ: 12h)
4. **Przypomnienie 2h** — `send-bulk-webinar-reminders` (typ: 2h)  
5. **Przypomnienie 1h z linkiem** — `send-bulk-webinar-reminders` (typ: 1h)
6. **Przypomnienie 15min z linkiem** — `send-webinar-email` (typ: reminder_15min)
7. **Podziękowanie po wydarzeniu** — `send-post-event-thank-you` (NOWY)

Wyślę te emaile testowo przez `supabase.functions.invoke()` z odpowiednimi parametrami.

---

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `supabase/functions/send-post-event-thank-you/index.ts` | **NOWY** — email z podziękowaniem po wydarzeniu |
| `supabase/functions/send-guest-thank-you-email/index.ts` | Aktualizacja nagłówka na złoty z logo |
| `supabase/functions/process-pending-notifications/index.ts` | Nowy krok: wysyłanie podziękowań po zakończonych wydarzeniach |
| Migracja SQL | Kolumny `thank_you_sent` / `thank_you_sent_at` w `event_registrations` i `guest_event_registrations` |

### Test emaili
Po wdrożeniu — wywołanie edge functions z testowymi danymi na adres `sebastiansnopek87@gmail.com` symulujące pełną sekwencję rejestracji 24h przed webinarem (7 emaili).

