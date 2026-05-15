## Cel

Na karcie wydarzenia w `/paid-events` wyraźnie rozdzielić **dwie grupy** danych, które dziś mieszają się w jednym bloku „Pokaż moje bilety i zapisanych":

1. **Moje bilety** — zakupy zalogowanego użytkownika (rejestracja siebie + gości, dla których kupił bilety).
2. **Zapisani przez mój link partnerski** — osoby, które weszły z jego linka i wypełniły formularz.

## Zmiany w UI

### `PaidEventCard.tsx`
- Pozostawić `MyEventTicketsInline` jako **osobny, samodzielny blok** widoczny zawsze, gdy zalogowany user ma zamówienie na to wydarzenie. Tytuł: **„Twoje bilety na to wydarzenie"** (bez powiązania z linkiem partnerskim).
- Blok partnerski (`MyEventFormLinks` → `MyEventFormReferrals`) zostaje osobno poniżej, jako sekcja „Twój link partnerski do tego wydarzenia".

### `MyEventFormReferrals.tsx`
- **Usunąć** wewnętrzną sekcję „Twoje zakupione bilety" (`myOrders` query + render). Ten komponent ma pokazywać wyłącznie tabelę osób z `event_form_submissions` zapisanych przez link partnerski usera.
- Zostaje tylko tabela: Data / Imię i nazwisko / Email / Telefon / Email potw. / Status.
- Pusty stan: „Brak zapisanych przez Twój link.".

### `MyEventFormLinks.tsx`
- Etykieta collapsible wraca do: **„Pokaż zapisanych przez mój link ({subs})"** — bez wzmianki o biletach.
- Collapsible renderuje się tylko gdy `subs > 0` (przywrócić warunek), bo bilety własne mają już własny blok wyżej.

## Wynikowy układ karty wydarzenia (zalogowany user)

```text
[ Karta eventu: data / tytuł / miejsce / Zobacz → ]
─────────────────────────────────────────────
[ Twoje bilety na to wydarzenie ]      ← MyEventTicketsInline (jeśli ma zamówienie)
  • Bilet × N, kwota, status
  • Lista uczestników: 1. Ty / 2. Gość — Edytuj
─────────────────────────────────────────────
[ Twój link partnerski do tego wydarzenia ]   ← MyEventFormLinks
  URL + Kopiuj
  ▸ Pokaż zapisanych przez mój link (X)        ← tylko gdy X > 0
      tabela: osoby z event_form_submissions
```

## Weryfikacja

Po zmianach na `/paid-events` dla `sebastiansnopek87@gmail.com`:
- Blok „Twoje bilety na to wydarzenie" pokazuje 1 zamówienie, 2 uczestników, edycja gościa działa.
- Sekcja partnerska pokazuje 1 zapisanego (siebie z formularza) — bez duplikowania biletów.

## Pliki

- `src/components/paid-events/MyEventFormReferrals.tsx` — usunąć blok `myOrders`, zostawić tylko tabelę submissions.
- `src/components/paid-events/MyEventFormLinks.tsx` — etykieta + warunek `subs > 0`.
- `src/components/paid-events/PaidEventCard.tsx` — bez zmian (już renderuje `MyEventTicketsInline` osobno).
