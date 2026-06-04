## Cel
Naprawić nadawanie moderatora i uprawnień w panelu CMS tak, aby kliknięcie „Ustaw moderatorem” działało stabilnie, a po dodaniu użytkownika można było od razu zaznaczać konkretne moduły, akcje i ograniczenia treści.

## Diagnoza
- Frontend poprawnie pokazuje użytkowników z wyszukiwarki.
- Błąd pojawia się przy kliknięciu „Ustaw moderatorem”: `Failed to send a request to the Edge Function`.
- Test funkcji `admin-set-moderator` zwraca `404 Requested function was not found`, więc funkcja istnieje w kodzie, ale nie jest wdrożona w Supabase / Lovable Cloud.
- W logach Edge Function nie ma wywołań tej funkcji, co potwierdza, że żądanie nie trafia do działającej funkcji.
- W `supabase/config.toml` brakuje wpisu dla `admin-set-moderator`, więc trzeba ją jawnie skonfigurować i wdrożyć.

## Plan naprawy
1. Dodać konfigurację Edge Function `admin-set-moderator` w `supabase/config.toml`.
   - Ustawić ją jako funkcję z obsługą autoryzacji w kodzie.
   - Zachować weryfikację admina przez `verifyAdmin`, żeby tylko administrator mógł nadawać/odbierać moderatorów.

2. Wdrożyć funkcję `admin-set-moderator` do Supabase.
   - Po wdrożeniu przetestować wywołanie funkcji.
   - Oczekiwany wynik testu dla sztucznego ID: funkcja ma odpowiedzieć z backendu, a nie zwracać `404 Requested function was not found`.

3. Usprawnić komunikat błędu w panelu moderatorów.
   - Zamiast ogólnego `Failed to send a request to the Edge Function`, pokazać po polsku informację, że nie udało się zapisać moderatora i podać szczegół, jeśli backend go zwraca.
   - To nie zastąpi naprawy wdrożenia, ale ułatwi późniejszą diagnostykę.

4. Zweryfikować przepływ po naprawie.
   - Kliknięcie „Ustaw moderatorem” powinno przenieść użytkownika do listy moderatorów.
   - Lista nie powinna dalej pokazywać komunikatu „Brak moderatorów”.
   - Po dodaniu moderatora powinny być dostępne przełączniki uprawnień dla modułów/akcji.

## Pliki / obszary
- `supabase/config.toml`
- `src/components/admin/ModeratorsManagement.tsx`
- wdrożenie Edge Function: `admin-set-moderator`

## Bez zmian w bazie
Nie planuję migracji bazy, bo tabele i polityki dla `user_roles` oraz `moderator_permissions` już istnieją. Problem jest w niewdrożonej funkcji backendowej, nie w strukturze danych.