## Cel
Przed wejściem do panelu administratora (`/admin`) admin musi ponownie wpisać swoje hasło logowania. Bez tego widzi tylko ekran blokady, nawet jeśli jest zalogowany.

## Działanie dla użytkownika
1. Admin klika "Panel CMS" / wchodzi na `/admin`.
2. Pojawia się pełnoekranowy ekran blokady z polem hasła (to samo hasło, którym loguje się do aplikacji).
3. Po poprawnym hasle uzyskuje dostęp do panelu na czas sesji (do wylogowania lub zamknięcia karty, ~30 min bezczynności).
4. Błędne hasło → komunikat „Nieprawidłowe hasło". Po 5 błędnych próbach – 60 s blokady.

## Zakres techniczny

**Nowy komponent** `src/components/admin/AdminPasswordGate.tsx`
- Pełnoekranowa karta z ikoną kłódki, polem hasła (typ `password`, toggle eye) i przyciskiem „Odblokuj".
- Weryfikacja przez `supabase.auth.signInWithPassword({ email: user.email, password })` – Supabase nie zmienia istniejącej sesji, tylko potwierdza poprawność hasła (jeśli token się odświeży, to OK).
- Po sukcesie: zapisuje znacznik w `sessionStorage` jako `admin_cms_unlocked_at = Date.now()` oraz w stanie React Context.
- Liczy nieudane próby w `sessionStorage`, po 5 → 60 s lockout (disabled input + countdown).

**Nowy hook/context** `src/contexts/AdminGateContext.tsx`
- `isUnlocked`, `unlock()`, `lock()`.
- Auto-lock po 30 min bezczynności (reuse pattern z `useInactivityTimeout`) lub na `signOut`.
- Tylko dla użytkowników z rolą `admin` – inne role nie wchodzą na `/admin` i tak.

**Integracja w `src/pages/Admin.tsx`**
- Na samej górze renderowania: jeśli `!isUnlocked` → zwróć `<AdminPasswordGate />` zamiast całego panelu.
- Resztę kodu zostawiamy bez zmian.

**Bezpieczeństwo**
- Hasło nie jest zapisywane nigdzie (tylko boolean unlock + timestamp).
- Weryfikacja po stronie Supabase Auth, nie ma własnego hashowania.
- Brak nowych tabel ani migracji – wszystko po stronie frontu.

## Pliki do dodania/zmiany
- `src/components/admin/AdminPasswordGate.tsx` (nowy)
- `src/contexts/AdminGateContext.tsx` (nowy)
- `src/main.tsx` lub `src/App.tsx` – owinięcie providerem (tylko gałąź `/admin` lub globalnie obok `AuthProvider`)
- `src/pages/Admin.tsx` – wstawienie bramki na początku renderu

## Poza zakresem
- Nie dotyczymy żadnych innych zakładek bocznego paska poza `/admin`.
- Nie zmieniamy logiki ról ani RLS.
