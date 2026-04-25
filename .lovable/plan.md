# Usunięcie żółtego paska z logo z maila potwierdzenia rejestracji

## Co zmieniamy

W mailu potwierdzającym zgłoszenie na wydarzenie (`send-event-form-confirmation`) na samej górze wyświetla się żółto-złoty pasek (gradient `#D4AF37 → #F5E6A3 → #D4AF37`) z dwoma logo: Pure Life i Eqology IBP.

Zgodnie z prośbą — pasek znika całkowicie. Email zaczyna się od bannera ustawionego przez administratora w formularzu (`form.banner_url`). Reszta treści (tytuł, powitanie, dane płatności, przyciski potwierdzenia/anulowania, stopka) pozostaje bez zmian.

## Zachowanie po zmianie

- Jeśli admin ustawił banner w formularzu → email zaczyna się od bannera (pełna szerokość, na górze białej karty).
- Jeśli admin nie ustawił bannera → email zaczyna się od razu od tytułu formularza i powitania (bez żadnego nagłówka graficznego).

## Zmiany techniczne

**Plik:** `supabase/functions/send-event-form-confirmation/index.ts`

1. Usunąć cały blok `<div style="padding:24px;background:linear-gradient(...)">…</div>` (linie ~140–152) zawierający tabelę z dwoma logo.
2. Usunąć nieużywane już stałe `logoUrl` i `eqologyLogoUrl` (linie 9–10).
3. Pozostawić bez zmian renderowanie `${opts.bannerUrl ? <img …/> : ""}` — to jest banner ustawiony przez admina i ma być jedynym elementem graficznym na górze.
4. Po zmianie zredeployować Edge Function `send-event-form-confirmation`.

## Co NIE jest zmieniane

- Komponent `src/components/branding/DualBrandHeader.tsx` (używany na publicznych stronach potwierdzenia/anulowania w przeglądarce) — pozostaje bez zmian, bo to inny kontekst niż mail.
- Pozostałe maile (`send-webinar-confirmation`, `register-event-transfer-order`) — nie ruszamy, bo użytkownik mówi konkretnie o mailu z formularzy rejestracyjnych widocznym w załączonym screenshocie.
- Treść maila, przyciski Potwierdzam/Anuluj, sekcja danych do płatności, stopka — bez zmian.
