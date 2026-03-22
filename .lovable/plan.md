

# Naprawa: błąd wysyłki formularza + kolor czcionki

## Problem 1: Błąd wysyłki emaila z załącznikiem
Funkcja `save-partner-lead` wywołuje `send-single-email` przekazując **service role key** jako Bearer token. Jednak `send-single-email` robi `supabase.auth.getUser()` na tym tokenie — co nie zadziała, bo service role key nie jest tokenem JWT użytkownika. Wynik: `{ success: false, error: "Unauthorized" }`.

Formularz sam się zapisuje poprawnie (lead trafia do kontaktów), ale email z załącznikiem nie jest wysyłany.

### Rozwiązanie
Zamiast wywoływać `send-single-email` (która wymaga autentykacji użytkownika), zaimplementować wysyłkę SMTP **bezpośrednio** w `save-partner-lead`:
- Pobrać ustawienia SMTP z tabeli `smtp_settings`
- Użyć tego samego kodu SMTP co w `send-single-email` (connect, EHLO, AUTH, MAIL FROM, RCPT TO, DATA z załącznikiem)
- Owinąć HTML brandingiem (helper `wrapWithBranding`)

Alternatywnie (prostsze): dodać w `send-single-email` obsługę tokena service role — sprawdzić, czy token === service role key, i jeśli tak, pominąć `getUser()`.

**Rekomendacja**: Prostsze rozwiązanie — w `send-single-email` dodać warunek: jeśli Bearer token = service role key, pominąć walidację użytkownika (zaufane wewnętrzne wywołanie). To wymaga minimalnych zmian.

### Plik: `supabase/functions/send-single-email/index.ts`
- Linie 318-324: dodać sprawdzenie, czy token === service role key → jeśli tak, pominąć `getUser()` i traktować jako wewnętrzne wywołanie
- Po zmianie: **redeploy** obu funkcji (`save-partner-lead` i `send-single-email`)

## Problem 2: Kolor czcionki niewidoczny
Potrzebuję więcej kontekstu — proszę wskazać, w którym edytorze sekcji nie można zmienić koloru (Hero, Header, TextImage, Footer, ContactForm, InnerElement?). Na screenshocie widoczny jest formularz na stronie partnerskiej — czy chodzi o kolor tekstu w:
- opisie formularza (`description`)?
- nagłówkach sekcji na stronie?
- innym elemencie?

Jeśli chodzi o edytor sekcji np. Hero/TextImage — `ColorInput` powinien działać. Sprawdzę rendering kolorów po wskazaniu konkretnej sekcji.

## Zmiany techniczne

| Plik | Zmiana |
|------|--------|
| `supabase/functions/send-single-email/index.ts` | Dodać bypass `getUser()` dla wywołań z service role key |
| Redeploy: `send-single-email`, `save-partner-lead` | Konieczne po każdej zmianie edge functions |

