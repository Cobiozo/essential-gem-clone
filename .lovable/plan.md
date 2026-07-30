## Cel

Klient ma widzieć przycisk „Udostępnij” w Bazie wiedzy i Bibliotece — ale dopiero po spełnieniu dwóch warunków. Dodatkowo w nagłówku Bazy wiedzy ma być dla klienta informacja o tych warunkach.

## Dlaczego dziś klient nie widzi przycisku

W `src/pages/HealthyKnowledge.tsx` (Baza wiedzy) jest twarda reguła:
`const canShare = isPartner || isAdmin;` — rola „klient” jest wykluczona niezależnie od ustawienia admina `allow_external_share` na materiale. W Bibliotece (`src/pages/KnowledgeCenter.tsx`) przycisk zależy od flagi `resource.allow_share`, więc tam gating rolowy trzeba dołożyć analogicznie.

## Warunki odblokowania dla klienta

1. Minęło 48 godzin od momentu startowego = późniejsza z dat: zatwierdzenie konta (`profiles.leader_approved_at` / `admin_approved_at` / `guardian_approved_at`) oraz pierwsze poprawne logowanie (najstarszy udany wpis w `login_audit_log`).
2. Ukończony moduł Akademii „NIEZBĘDNIK KLIENTA” (moduł istnieje: `4ddc1abc-f8a6-430c-be86-c16e992b55e2`, widoczny dla klientów) — 100% ukończonych aktywnych lekcji, liczone tak jak w `fetchBatchModuleProgress` (`training_lessons` + `training_progress`).

Partnerzy, specjaliści, liderzy i admini — bez zmian (mają dostęp od razu).

## Zakres zmian

1. **Nowy hook `src/hooks/useClientSharingAccess.ts`**
   - Zwraca `{ canShare, isClientGated, hoursRemaining, unlockAt, trainingCompleted, loading }`.
   - Dla ról nie-klienckich: `canShare = true` natychmiast.
   - Dla klienta: pobiera daty zatwierdzenia z `profiles`, pierwsze udane logowanie (RPC lub zapytanie do `login_audit_log`), postęp modułu „NIEZBĘDNIK KLIENTA” (dopasowanie po tytule, z uwzględnieniem wariantu językowego).
   - Jeżeli odczyt `login_audit_log` jest zablokowany przez RLS, dodam funkcję `SECURITY DEFINER` `get_client_sharing_status(_user_id uuid)` zwracającą komplet danych jednym wywołaniem (`SET search_path TO public`).

2. **Baza wiedzy — `src/pages/HealthyKnowledge.tsx`**
   - `canShare` z hooka zamiast `isPartner || isAdmin`.
   - Przycisk „Udostępnij” pokazuje się klientowi tylko gdy admin włączył `allow_external_share` i warunki spełnione.
   - W nagłówku, po prawej stronie na wysokości tytułu „Baza wiedzy”, dla klienta z zablokowanym udostępnianiem: karta/badge z informacją, że udostępnianie materiałów zostanie włączone po 48 godzinach od dołączenia do platformy oraz ukończeniu w Akademii „Niezbędnika klienta”, z checklistą statusu obu warunków (np. „48h: pozostało 12 h”, „Niezbędnik klienta: w trakcie”) i linkiem do Akademii. Responsywnie: obok tytułu na desktopie, pod tytułem na mobile.

3. **Biblioteka — `src/pages/KnowledgeCenter.tsx`**
   - Ten sam hook: akcja udostępniania (`allow_share`, w tym `allowShare` w dialogu grafik) widoczna dla klienta wyłącznie po spełnieniu warunków.

4. **Zabezpieczenie serwerowe (opcjonalne, zalecane)**
   - Funkcja edge generująca kody OTP/linki udostępnień odrzuca żądania klientów, którzy nie spełniają warunków — aby ukrycie przycisku nie było jedyną barierą.

## Uwagi techniczne

- Teksty przez istniejący mechanizm `tf(...)` z polskimi fallbackami; brak twardych kolorów — tylko tokeny motywu.
- Wynik hooka cache’owany na czas sesji widoku, aby nie powtarzać zapytań przy każdym renderze listy.
