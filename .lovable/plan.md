

# Naprawa: link rejestracyjny nie działa dla auto-webinarów

## Problem

URL `purelife.info.pl/e/szansa-biznesowa-dewp?ref=1234567890` wyświetla "Nie znaleziono wydarzenia" ponieważ:

1. `EventRegistrationBySlug.tsx` rozwiązuje slug poprawnie (filtruje tylko `is_active`), ale...
2. Przekierowuje do `EventGuestRegistration.tsx`, który filtruje `.eq('is_published', true)` (linia 91)
3. Auto-webinar ma `is_published: false` (bo nie jest widoczny w kalendarzu) → zapytanie zwraca pusty wynik

Flaga `is_published` kontroluje widoczność w kalendarzu, **nie** dostępność rejestracji. Rejestracja powinna działać dla każdego aktywnego wydarzenia.

## Rozwiązanie

| Plik | Zmiana |
|------|--------|
| `src/pages/EventGuestRegistration.tsx` (linia 91) | Usunąć `.eq('is_published', true)` z zapytania — rejestracja wymaga tylko `is_active: true` |

Jedna linia do usunięcia. Reszta flow (email z potwierdzeniem, dodanie do kontaktów, powiadomienia) już działa poprawnie dzięki istniejącemu systemowi `send-webinar-confirmation` i `process-pending-notifications`.

