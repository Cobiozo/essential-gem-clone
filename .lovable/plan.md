

# Naprawa: PureBox znikający z paska bocznego dla nie-adminów

## Problem
Tabele `purebox_settings` i `purebox_user_access` mają wyłącznie polityki RLS typu `ALL` ograniczone do adminów (`has_role(auth.uid(), 'admin')`). Partnerzy, klienci i specjaliści otrzymują puste wyniki → hook `usePureBoxVisibility` zwraca `false` → zakładka PureBox znika z sidebara.

## Rozwiązanie
Dodać dwie nowe polityki RLS umożliwiające SELECT dla wszystkich zalogowanych użytkowników, zachowując istniejące polityki admin-only (które obsługują INSERT/UPDATE/DELETE):

1. **`purebox_settings`** — wszyscy authenticated mogą czytać (`USING (true)`). Ustawienia widoczności nie są danymi wrażliwymi — hook i tak filtruje po roli.
2. **`purebox_user_access`** — użytkownicy mogą czytać tylko swoje rekordy (`USING (user_id = auth.uid())`).

## Migracja SQL
```sql
-- Allow all authenticated users to read purebox visibility settings
CREATE POLICY "authenticated_select_purebox_settings"
ON public.purebox_settings
FOR SELECT
TO authenticated
USING (true);

-- Allow users to read their own purebox access grants
CREATE POLICY "users_select_own_purebox_access"
ON public.purebox_user_access
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

## Pliki do modyfikacji
| Plik | Zmiana |
|---|---|
| Nowa migracja SQL | 2 polityki RLS (SELECT) |

Żadne zmiany w kodzie frontendu nie są potrzebne — hook `usePureBoxVisibility` już poprawnie odpytuje te tabele.

