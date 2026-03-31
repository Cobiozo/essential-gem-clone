

# Rozbudowa listy gości auto-webinaru — zapraszający + filtry + usuwanie

## Co się zmieni

Komponent `AutoWebinarGuestStats.tsx` zostanie przebudowany, aby:
1. Pobierać dane zapraszającego partnera (imię, nazwisko, eq_id) z tabeli `profiles` przez `invited_by_user_id`
2. Wyświetlać kolumnę "Zapraszający" w tabeli
3. Umożliwić adminowi usunięcie gościa z listy (cancel rejestracji)
4. Dodać panel filtrów z możliwością filtrowania po wszystkich kategoriach danych

## Filtry

Panel filtrów (rozwijany) z następującymi opcjami:
- **Zapraszający** — dropdown z listą unikalnych partnerów (+ "Brak zapraszającego")
- **Status dołączenia** — Tak / Nie / Wszyscy
- **Slot** — dropdown z unikalnymi slotami
- **Data rejestracji** — zakres dat (od–do)
- **Czas oglądania** — minimum sekund (np. > 0, > 60, > 300)
- **Wyszukiwarka tekstowa** — jak dotychczas (imię, nazwisko, email)

## Usuwanie gościa

- Przycisk kosza w każdym wierszu
- Dialog potwierdzenia przed usunięciem
- Ustawia `status = 'cancelled'` w `guest_event_registrations` (soft delete)
- Po usunięciu odświeża listę

## Szczegóły techniczne

### Plik: `src/components/admin/AutoWebinarGuestStats.tsx`

**Pobieranie danych:**
- Zapytanie do `guest_event_registrations` rozszerzone o `invited_by_user_id`
- Osobne zapytanie do `profiles` po unikalnych `invited_by_user_id` → mapa `userId → {first_name, last_name, eq_id}`
- Interfejs `GuestStat` rozszerzony o `invited_by_name: string | null`, `invited_by_eq_id: string | null`

**Filtrowanie:**
- Nowy state: `filterInviter`, `filterJoined`, `filterSlot`, `filterDateFrom`, `filterDateTo`, `filterMinWatch`
- `useMemo` łączy wszystkie filtry z wyszukiwarką tekstową
- Unikalne wartości (zapraszający, sloty) wyciągane z `stats` do dropdownów

**Usuwanie:**
- Funkcja `handleDeleteGuest(id)` → `supabase.from('guest_event_registrations').update({ status: 'cancelled', cancelled_at: now() }).eq('id', id)`
- Dialog `AlertDialog` z potwierdzeniem

**Tabela:**
- Nowa kolumna "Zapraszający" między "Email" a "Slot"
- Nowa kolumna "Akcje" na końcu z przyciskiem usuwania
- CSV eksport rozszerzony o kolumnę "Zapraszający"

**UI filtrów:**
- Przycisk "Filtry" obok wyszukiwarki, rozwijający panel z `Select` i `Input` type="date"
- Badge z liczbą aktywnych filtrów
- Przycisk "Wyczyść filtry"

### Pliki do zmiany
| Plik | Zmiana |
|------|--------|
| `src/components/admin/AutoWebinarGuestStats.tsx` | Pełna przebudowa — zapraszający, filtry, usuwanie |

Brak zmian w bazie danych — `invited_by_user_id` i `status`/`cancelled_at` już istnieją w tabeli.

