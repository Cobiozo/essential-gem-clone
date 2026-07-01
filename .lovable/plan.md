## Problem

Moderator z uprawnieniem `users` widzi zera i „Brak użytkowników", bo:

1. **Frontend blokuje wywołanie** — w `src/pages/Admin.tsx` `useEffect` i sama `fetchUsers` mają warunek `activeTab === 'users' && isAdmin`. Moderator nie jest `isAdmin`, więc RPC nigdy się nie odpala. To samo dotyczy `pages`, `content`, `settings`.
2. **RPC odrzuca nie-adminów** — `public.get_user_profiles_with_confirmation()` rzuca `Access denied. Admin role required.` gdy wywołujący nie jest adminem. Trzeba dopuścić moderatora, ale tylko jeśli ma moduł `users` (klucz `users` lub `users:view`) w `moderator_permissions.modules`.
3. **Log aktywności moderatora nie powstaje** — `useAdminActivityLog` loguje tylko jeśli `isAdmin`. Moderatorskie akcje (add/edit/export użytkowników, moderacja postów itd.) nigdy nie trafiają do `admin_activity_log`, więc admin ich nie widzi i dzienny raport jest pusty.
4. **Dzienny raport dla `sebastiansnopek87`** — funkcja `send-admin-activity-digest` istnieje, ale nie ma sekcji dedykowanej moderatorom (kto, co, kiedy, jaki moduł, jaki cel).

## Plan naprawy

### 1. Odblokowanie modułu Użytkownicy dla moderatora

`src/pages/Admin.tsx`:
- `fetchUsers`: usunąć wewnętrzny warunek na `isAdmin`, zostawić check `activeTab === 'users'`.
- `useEffect` ładujący dane per zakładka: zamienić `isAdmin` na `(isAdmin || canAction('users','view'))` dla users, analogicznie dla innych zakładek, do których moderator ma dostęp (`pages`, `content`, `settings` — użyć odpowiednich kluczy modułów).
- Elementy destrukcyjne (usuwanie, zmiana emaila/EQ ID, reset MFA/hasła, wysyłka maila grupowego, edycja ról) obwarować `canAction('users','edit')`; export CSV — `canAction('users','export')`. Admin zawsze przechodzi (bo `canAction` zwraca true dla admina).

### 2. Poprawa RPC `get_user_profiles_with_confirmation`

Migracja SQL: zmienić guard, aby dopuszczał również moderatora z aktywnym modułem `users` (pełny) lub `users:view`:

```sql
IF NOT (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.moderator_permissions mp ON mp.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'moderator'
      AND (mp.modules ? 'users' AND (mp.modules->>'users')::boolean
           OR mp.modules ? 'users:view' AND (mp.modules->>'users:view')::boolean)
  )
) THEN
  RAISE EXCEPTION 'Access denied.';
END IF;
```

Uwaga: to daje read-only dostęp do listy użytkowników. Endpointy mutujące (usuń usera, reset hasła itp.) pozostają admin-only w edge functions — nie ruszamy ich.

### 3. Logowanie aktywności moderatora

`src/hooks/useAdminActivityLog.ts`:
- Zamiast `if (!user || !isAdmin) return;` → `if (!user) return; if (!isAdmin && !isModerator) return;`.
- Dołożyć w `details` znacznik `actor_role: 'admin'|'moderator'` (odczyt z `useModeratorAccess`).

Migracja: dodać kolumnę `actor_role text default 'admin'` w `admin_activity_log` (nullable, bez łamania istniejących wpisów), plus indeks po `actor_role, created_at`.

RLS na `admin_activity_log`: upewnić się, że INSERT jest dozwolony dla admina i moderatora (obecnie tylko admin — dodać policy dla moderatora, ale tylko z `admin_user_id = auth.uid()`, żeby nie mógł podszyć innych).

### 4. Podgląd aktywności moderatorów w panelu admina

- W istniejącej sekcji „Dziennik aktywności admina" dodać filtr **Rola: Admin / Moderator / Wszyscy** oraz kolumnę „Rola aktora".
- Domyślnie pokazywać oba typy; badge kolorem odróżnia moderatora.

### 5. Dobowy raport moderatorski dla `sebastiansnopek87@gmail.com`

`supabase/functions/send-admin-activity-digest/index.ts`:
- Dodać osobny query: wpisy z ostatnich 24 h gdzie `actor_role = 'moderator'`, zgrupowane per moderator (imię, nazwisko, email), z listą akcji (`action_type`, `action_description`, `target_table`, `target_id`, `details`, `created_at`).
- Wygenerować sekcję HTML „Raport aktywności moderatorów (ostatnie 24 h)" i wysłać zawsze na `sebastiansnopek87@gmail.com` (dodatkowo do istniejącej listy adminów — nie duplikować, jeśli już tam jest).
- Jeśli brak akcji: krótka informacja „Brak aktywności moderatorów w ostatnich 24 h".
- CRON już istnieje raz na dobę — bez zmian w harmonogramie.

### 6. Weryfikacja (po wdrożeniu)

- Zalogować się jako `sebastiansnopek.eqology@gmail.com` (moderator z modułem `users`) → wejść w Użytkownicy, potwierdzić że lista się ładuje i liczniki > 0.
- Wykonać w panelu jakąś akcję moderatorską (np. odświeżenie, eksport) → potwierdzić wpis w `admin_activity_log` z `actor_role='moderator'`.
- Ręcznie odpalić `send-admin-activity-digest` → sprawdzić, że mail zawiera sekcję moderatorską i dotarł do `sebastiansnopek87@gmail.com`.

## Poza zakresem

- Nie zmieniam mechaniki uprawnień moderatora (klucze modułów, `canAction`) — działa poprawnie, problem był po stronie gatingu w Admin.tsx i RPC.
- Nie zmieniam edge functions mutujących użytkowników — pozostają admin-only.