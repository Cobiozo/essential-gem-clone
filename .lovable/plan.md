

# Plan: Przebudowa emaila z podziękowaniem — fokus na osobę zapraszającą

## Problem
Obecny email z podziękowaniem (screenshot) pokazuje generyczny przycisk "Skontaktuj się z nami" bez danych osoby zapraszającej. Cel: osoba zapraszająca ma być **centralnym punktem kontaktu** w emailu, a `support@purelife.info.pl` jedynie dodatkowym wsparciem.

## Zakres zmian

### 1. `send-post-event-thank-you/index.ts` — przebudowa `buildThankYouHtml()`

Nowa struktura emaila:
- **Nagłówek**: logo + "Dziękujemy za udział!" (bez zmian)
- **Podziękowanie**: Cześć {imię}, dziękujemy za udział w "{tytuł}"
- **Sekcja osoby zapraszającej** (wyróżniona, centralny element):
  - Nagłówek: "Twoja osoba kontaktowa — skontaktuj się bezpośrednio!"
  - Imię i nazwisko, email, telefon zapraszającego
  - Treść: "{inviterName} zaprosił/a Cię na to wydarzenie i jest Twoim bezpośrednim kontaktem. To właśnie ta osoba pomoże Ci..."
  - Lista: kolejne spotkania, produkty Eqology, dołączenie do zespołu, tematy z wydarzenia
  - **Główny CTA**: "Napisz do {inviterName}" (mailto z danymi zapraszającego)
- **Sekcja dodatkowa** (mała, na dole):
  - "Dodatkowe wsparcie: support@purelife.info.pl" — jako drugorzędny kontakt
- **Stopka**: automatyczna wiadomość Pure Life Center

Gdy brak danych zapraszającego (fallback): email kieruje do `support@purelife.info.pl` jako jedyny kontakt.

### 2. `send-guest-thank-you-email/index.ts` — analogiczna zmiana szablonu inline

Ten sam wzorzec: zapraszający jako główny kontakt, support jako dodatkowy.

### 3. Deploy obu funkcji

### 4. Test — wysłanie emaili do obu adresów testowych

## Pliki do zmiany
- `supabase/functions/send-post-event-thank-you/index.ts` — `buildThankYouHtml()`
- `supabase/functions/send-guest-thank-you-email/index.ts` — inline HTML template

