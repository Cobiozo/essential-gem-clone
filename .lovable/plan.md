
Cel: po odblokowaniu użytkownika przez admina ma on natychmiast zniknąć z zakładki „Zablokowani” u lidera oraz odzyskać dostęp.

Diagnoza (potwierdzona w kodzie i danych):
1) Główna przyczyna jest w RPC `admin_toggle_user_status`:
- funkcja zmienia tylko `profiles.is_active`
- nie aktualizuje tabeli `user_blocks`
- efekt: użytkownik może być aktywny (`profiles.is_active = true`), ale nadal mieć aktywny wpis blokady (`user_blocks.is_active = true`), więc dalej widnieje na liście „Zablokowani” u lidera.

2) To jest dokładnie ścieżka używana w Adminie:
- `src/pages/Admin.tsx` → `toggleUserStatus()` wywołuje `rpc('admin_toggle_user_status', ...)`
- nie wywołuje `leader_unblock_user`, więc rekord blokady zostaje „wiszący”.

3) Potwierdzenie stanu niespójności:
- w bazie istnieje aktywny `user_blocks` dla użytkownika, który w `profiles` ma już `is_active = true`.

Plan naprawy:

1. Migracja SQL: poprawa logiki `admin_toggle_user_status` (kluczowe)
- `CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(...)`
- zachować obecną walidację (admin-only, brak auto-dezaktywacji siebie).
- po aktualizacji `profiles` dodać:
  - gdy `new_status = true` (odblokowanie):
    - dezaktywować aktywne rekordy `user_blocks` dla tego użytkownika:
      - `is_active = false`
      - `unblocked_at = now()`
      - `unblocked_by_user_id = auth.uid()`
  - gdy `new_status = false` (blokowanie):
    - na razie bez tworzenia nowego `user_blocks` (poza zakresem zgłoszenia), żeby nie rozszerzać behavioru bez potrzeby.

Efekt:
- admin-odblokowanie przez przełącznik statusu będzie spójne z listą blokad lidera.

2. Migracja SQL: jednorazowy cleanup historycznych niespójności (ważne dla „tu i teraz”)
- w tej samej migracji dodać UPDATE naprawczy:
  - dezaktywować wszystkie rekordy `user_blocks.is_active = true` tam, gdzie `profiles.is_active = true`
  - uzupełnić `unblocked_at` i `unblocked_by_user_id` (jeśli puste) na sensowne wartości techniczne.
- to natychmiast usunie już „zawieszone” pozycje z list liderów.

3. Lekka korekta frontu admina (`src/pages/Admin.tsx`) dla natychmiastowej spójności UI
- po sukcesie `toggleUserStatus()` dodać:
  - `queryClient.invalidateQueries({ queryKey: ['admin-user-blocks'] })`
- dzięki temu adnotacje o blokadzie na liście admina też odświeżą się od razu (bez ręcznego refreshu).

4. Weryfikacja po wdrożeniu (scenariusz E2E)
- Scenariusz A (najważniejszy):
  1. Lider blokuje użytkownika (pojawia się w „Zablokowani” u lidera).
  2. Admin odblokowuje go przez przełącznik statusu w `/admin?tab=users`.
  3. Oczekiwane:
     - użytkownik znika z „Zablokowani” u lidera (bez reloadu),
     - użytkownik jest aktywny w strukturze,
     - konto może się zalogować i korzystać z aplikacji.
- Scenariusz B:
  - odblokowanie przez admina z zakładki, która używa `leader_unblock_user`, nadal działa poprawnie i bez regresji.

Sekwencja wdrożenia:
1) migracja z poprawką funkcji + cleanup danych,
2) mała poprawka invalidacji query w Admin.tsx,
3) test E2E na żywym przepływie lider → admin → lider.

Uwagi techniczne:
- Nie trzeba zmieniać `useLeaderBlocks.ts` ani `useOrganizationTree.ts` dla samej logiki biznesowej odblokowania — realtime/subskrypcje już są.
- Problem jest semantyczny (niespójny stan danych), nie renderingowy.
- Po tej poprawce oba kanały odblokowania (admin toggle i unblock) będą prowadziły do tego samego końcowego stanu biznesowego.
