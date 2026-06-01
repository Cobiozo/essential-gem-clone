## Co naprawię

1. **Treść pierwszego e-maila po rezerwacji**
   - Zmienię nagłówek wiadomości z „Potwierdź swój adres email” na: „Potwierdzenie adresu e-mail i rezerwacji miejsca na wydarzenie”.
   - Zostawię dalszą treść wiadomości bez zmiany, poza spójną pisownią „e-mail”.

2. **Kliknięcie CTA z e-maila nie może prowadzić do logowania**
   - Link `/free-event/confirm/:token` jest już zaplanowany jako publiczny fast-path, ale w publicznych ścieżkach guardów brakuje tej trasy.
   - Dodam `/free-event/confirm/` do list publicznych ścieżek, żeby użytkownik po kliknięciu z maila zawsze zobaczył ekran potwierdzenia, a nie ekran logowania.

3. **Baner / ekran informacyjny po potwierdzeniu**
   - Dopasuję ekran `FreeEventConfirmPage`, żeby jasno komunikował:
     - adres e-mail został potwierdzony,
     - rezerwacja miejsca na wydarzenie została potwierdzona,
     - użytkownik otrzyma wiadomość z biletem,
     - bilet z kodem QR będzie podstawą wejścia na wydarzenie.

4. **Brak wiadomości z biletem po potwierdzeniu**
   - Sprawdziłem bazę: najnowsza rezerwacja dla wydarzenia „Kompleksowe szkolenie TEST” ma nadal status `awaiting_email_confirmation`, brak `email_confirmed_at`, brak `ticket_code`, brak `ticket_pdf_url` i brak `ticket_sent_at`. To oznacza, że funkcja potwierdzająca nie została skutecznie wywołana albo kliknięcie nie dotarło do właściwej publicznej strony.
   - Po naprawie ścieżki publicznej kliknięcie CTA wywoła `confirm-free-event-reservation`, która generuje kod biletu, tworzy uczestnika, generuje PDF i wysyła wiadomość z biletem.

5. **Zwiększenie odporności wysyłki biletu**
   - Uporządkuję obsługę odpowiedzi z generowania PDF: jeśli PDF nie wygeneruje się poprawnie, funkcja ma nadal wysłać e-mail z linkiem do biletu online i zapisać jasne logi, zamiast sprawiać wrażenie, że nic się nie stało.
   - Jeśli PDF jest dostępny, zostanie dołączony jako załącznik tak jak obecnie.

## Szczegóły techniczne

- Pliki do zmiany:
  - `supabase/functions/register-free-event-order/index.ts`
  - `src/components/profile/ProfileCompletionGuard.tsx`
  - `src/pages/FreeEventConfirmPage.tsx`
  - opcjonalnie drobna poprawka w `supabase/functions/confirm-free-event-reservation/index.ts` dla lepszych logów i fallbacku wysyłki.

- Nie będę zmieniał mechaniki rezerwacji ani płatności; naprawa dotyczy tylko bezpłatnej rezerwacji z potwierdzeniem e-mail i biletem.