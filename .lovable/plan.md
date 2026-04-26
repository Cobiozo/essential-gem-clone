## Problem

Po anulowaniu rejestracji przez gościa baner sukcesu „Rejestracja anulowana" zawiera link **„Strona główna"**, który prowadzi do `/` — gość po anulowaniu nie powinien być przekierowywany nigdzie ani widzieć tego linku. Ekran ma być finalny, statyczny.

## Zmiana

Plik: `src/pages/EventFormCancelPage.tsx`

W stanie `state === 'ok'` (linia 103) **usuwam pojedynczy element**:

```tsx
<a href="/" className="text-primary underline text-sm inline-block pt-2">Strona główna</a>
```

Wszystko inne pozostaje:
- Stan `idle` (przycisk „Wróć" przed potwierdzeniem) — bez zmian.
- Stan `error` — link „Strona główna" **zostaje**, bo gość musi mieć drogę wyjścia gdy token jest nieprawidłowy.
- Baner wydarzenia, ikona, tekst potwierdzenia, ostrzeżenie o płatności — bez zmian.

## Bezpieczeństwo i regresja

- Brak zmian w bazie, RLS, edge functions ani logice anulowania.
- Brak wpływu na ekran `EventFormConfirmPage` (potwierdzenie) — tam analogiczny link nie istnieje w wariancie sukcesu.
- Zmiana czysto wizualna, dotyczy wyłącznie jednej linijki w jednym stanie.