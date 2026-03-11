

# Plan: Ukrycie anulowanych rejestracji z widoków

Użytkownik nie chce widzieć rejestracji ze statusem `cancelled`. Zamiast pokazywać je z badge "Anulowano", po prostu je pomijamy.

## Zmiany w 2 plikach

### 1. `src/components/team-contacts/ContactEventHistory.tsx` (formularz edycji)
- Linia 35: Dodać `.neq('status', 'cancelled')` do zapytania Supabase, aby nie pobierać anulowanych rejestracji.

### 2. `src/components/team-contacts/ContactEventInfoButton.tsx` (popover z listą wydarzeń)
- Linia 43: Dodać `.neq('status', 'cancelled')` do zapytania Supabase.
- Linia 69-73: Usunąć case `cancelled` z `getStatusBadge` (już niepotrzebny).

