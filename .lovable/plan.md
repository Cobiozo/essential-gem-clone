## Problem

Na ekranie „Moje linki partnerskie do formularzy rejestracyjnych" pojawia się czerwony błąd:
> „Uzupełnij EQID w swoim profilu, aby wygenerować link partnerski."

— mimo że partner ma uzupełniony EQID. Dotyczy wszystkich urządzeń (na iPhone było po prostu testowane), nie tylko mobilnych.

## Przyczyna

W pliku `src/components/paid-events/MyEventFormLinks.tsx` (linia ~90), zapytanie pobierające EQID partnera używa złej kolumny:

```ts
.from('profiles')
.select('eq_id')
.eq('id', user.id)        // ← BŁĄD
.maybeSingle();
```

W tabeli `profiles`:
- `id` — to klucz główny wiersza (UUID rekordu)
- `user_id` — to referencja do `auth.users.id`

Sprawdzenie w bazie potwierdza, że dla wszystkich 224 profili `id <> user_id`, więc filtr `.eq('id', user.id)` nigdy nie zwróci wiersza, `profile?.eq_id` jest `undefined`, i kod rzuca komunikat „Uzupełnij EQID...".

Wszystkie inne miejsca w projekcie (np. `LeaderLandingEditorView`, `TOTPSetup`, `PaidEventPage`) prawidłowo używają `.eq('user_id', user.id)`.

## Zmiana

Jednoliniowa poprawka w `src/components/paid-events/MyEventFormLinks.tsx`:

```ts
.eq('user_id', user.id)   // zamiast .eq('id', user.id)
```

Po zmianie kliknięcie „Wygeneruj mój link" poprawnie odczyta EQID z profilu zalogowanego partnera i utworzy/zaktualizuje wpis w `paid_event_partner_links`.

## Pliki

- `src/components/paid-events/MyEventFormLinks.tsx` — zmiana filtra w zapytaniu o `eq_id`.
