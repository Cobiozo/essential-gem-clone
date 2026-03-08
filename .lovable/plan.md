
# Plan: Poprawka wyświetlania szczegółów spotkań trójstronnych/konsultacji

## Problem
W `EventDetailsDialog` pole `description` dla spotkań trójstronnych zawiera dane JSON (prospekt, telefon, notatki, cel), które wyświetlane są jako surowy tekst JSON.

## Rozwiązanie

### `src/components/events/EventDetailsDialog.tsx`

1. Dodać interfejs `ProspectData` (jak w `MeetingSummaryCard.tsx`)
2. Dodać funkcję `parseProspectData` — próbuje sparsować `description` jako JSON
3. Dla spotkań `tripartite_meeting` i `partner_consultation`:
   - Jeśli JSON parsuje się poprawnie → wyświetlić ładną kartę z danymi:
     - **Trójstronne**: Imię i nazwisko prospekta, telefon, notatki
     - **Konsultacje**: Cel konsultacji, notatki
   - Jeśli nie parsuje → wyświetlić description jak dotychczas (fallback)
4. Użyć ikon `FileText`, `Phone`, `MessageSquare`, `Target` (jak w `MeetingSummaryCard`)
5. Kolorystyka: violet dla trójstronnych, fuchsia dla konsultacji

### Pliki do edycji:
1. `src/components/events/EventDetailsDialog.tsx`
