

# Naprawa: ponowna rejestracja po anulowaniu zapisu na webinar

## Problem

Gdy admin anuluje rejestrację gościa (status → `cancelled`), rekord w `guest_event_registrations` pozostaje. Przy ponownej rejestracji:

1. **Sprawdzenie duplikatu** (linia 204-209 w `EventGuestRegistration.tsx`) szuka DOWOLNEGO rekordu z tym samym `event_id + email` — znajduje anulowany i pokazuje "Już jesteś zapisany"
2. **Kontakt prywatny** (`team_contacts`) został ustawiony na `is_active: false`, więc nie jest widoczny
3. **UNIQUE constraint** `(event_id, email)` blokuje INSERT nawet gdyby sprawdzenie przeszło

## Rozwiązanie

### 1. `EventGuestRegistration.tsx` — sprawdzenie tylko aktywnych rejestracji
Zmienić query sprawdzające duplikat: dodać `.neq('status', 'cancelled')`. Jeśli istnieje anulowany rekord, zamiast INSERT wykonać UPDATE (przywrócić status na `registered`, wyczyścić `cancelled_at`, zaktualizować dane).

### 2. Edge function `send-webinar-confirmation` — re-aktywacja kontaktu
Przy dodawaniu do kontaktów prywatnych, jeśli kontakt z tym emailem już istnieje ale jest `is_active: false`, zaktualizować go zamiast tworzyć nowy.

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/pages/EventGuestRegistration.tsx` | Sprawdzenie tylko niecancelowanych + UPDATE zamiast INSERT dla anulowanych |
| `supabase/functions/send-webinar-confirmation/index.ts` | Reaktywacja istniejącego kontaktu `is_active: false` |

