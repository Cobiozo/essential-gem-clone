## Problem

Włączenie modułu szkoleniowego (`is_active = true`) rzuca błąd:

```
23503 – training_assignments_user_id_fkey
Key (user_id)=(4b58b7ee-…) is not present in table "profiles".
```

Trigger `trigger_assign_new_module` na `training_modules` po aktywacji modułu wstawia wiersze do `training_assignments` dla każdego `user_roles.user_id`. Jeden użytkownik (`4b58b7ee-eb93-4a88-895c-a51e561c6f9b`) ma rekord w `auth.users` i `user_roles`, ale nie ma wiersza w `public.profiles` → FK do `profiles(user_id)` wywala INSERT i cały UPDATE modułu.

To osierocone konto (1 sztuka w bazie) blokuje włączanie każdego modułu.

## Fix (jedna migracja)

1. **Utwardzić trigger** `assign_training_module_to_users` — dodać `AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = ur.user_id)` w klauzuli `WHERE`, żeby pojedyncze osierocone konto nigdy więcej nie zablokowało operacji admina.
2. **Wyczyścić osieroconą sesję** dla `4b58b7ee-…`:
   - `DELETE FROM public.user_roles WHERE user_id = '4b58b7ee-…' AND NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = user_roles.user_id);`
   - to samo defensywnie na `training_assignments`, `challenge_participants`, `news_hub_user_access`, `challenge_user_access` (na wypadek innych FK).
   - Konto w `auth.users` bez profilu zostaje nietknięte — nie usuwam użytkownika bez zgody.

## Weryfikacja

Po migracji: przełączenie „Aktywny" na SZYBKI START i BIZNESOWE powinno zapisać się bez błędu, toast „Zapisano".

Nie ruszam UI ani innych modułów.