## Problem

Na liście „Zarządzanie użytkownikami" użytkownik, który dostał funkcję moderatora:
- pojawia się wielokrotnie (po jednym wierszu na każdą rolę),
- jego badge pokazuje „moderator" zamiast pierwotnej roli (np. „Partner").

Przyczyna leży w bazie, nie w UI. Funkcja RPC `public.get_user_profiles_with_confirmation` zwraca rolę z `user_roles` (JOIN po `user_id`):

```text
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
SELECT ..., ur.role::text AS role, ...
```

Gdy w `user_roles` istnieją 2 wpisy (`partner` + `moderator`), RPC zwraca 2 wiersze, a kolumna `role` przyjmuje wartość `moderator` w jednym z nich. UI tylko wiernie wyświetla to, co dostał.

## Cel

Funkcja moderatora ma być wyłącznie dodatkową flagą uprawnień (widok wybranych modułów admina). Nie zmienia roli ani nie duplikuje wpisu na liście użytkowników. Partner zostaje Partnerem.

## Plan zmian (tylko backend RPC)

1. Migracja: `CREATE OR REPLACE FUNCTION public.get_user_profiles_with_confirmation` z dwoma poprawkami:
   - źródłem roli wyświetlanej w panelu jest `profiles.role` (bazowa rola: admin/partner/specjalista/client/user), a nie `user_roles.role`,
   - usuwamy `LEFT JOIN public.user_roles` — nie jest już potrzebny, więc znikają duplikaty wierszy.
   - Sygnatura zwracana (kolumny) pozostaje identyczna, żeby nie ruszać kodu frontu/typów.

2. Nie zmieniamy żadnego komponentu React. `ModeratorsManagement.tsx` dalej zarządza rolą `moderator` w `user_roles` + `moderator_permissions`. Hook `useModeratorAccess` dalej czyta uprawnienia z tych samych tabel.

3. Weryfikacja po migracji:
   - Sebastia Snopek (partner + moderator) pojawia się raz, z badge „Partner".
   - Zakładka „Moderatorzy" nadal pokazuje go jako moderatora z modułami.
   - Wejście tego użytkownika do panelu admina (tylko dozwolone moduły) działa jak dotąd.

## Czego NIE zmieniamy

- Tabel `user_roles`, `moderator_permissions`, triggera `sync_profile_role_from_user_roles` (już naprawiony — pomija `moderator`).
- Edge function `admin-set-moderator`.
- Widoków/komponentów listy użytkowników, badge'y, filtrów.
