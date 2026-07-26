## Co wykazał audyt (zweryfikowane na bazie)

**Mapa — Żabno i inni "znikający" użytkownicy**
- W bazie jest 261 profili, 171 ma komplet miasto + kod pocztowy, ale funkcja `get_user_location_points()` zwraca tylko 96.
- Powód: funkcja odsiewa wszystkich z `blocked_at IS NOT NULL` — a takich jest **144**, przy czym ogromna większość to blokady automatyczne `block_reason = 'inactivity_30_days'`, nie blokady administracyjne.
- Obaj użytkownicy z **Żabna (33-240, Polska)** mają dokładnie `block_reason = 'inactivity_30_days'` — dlatego nie ma tam punktu na mapie.

**Klastry**
- Ikona klastra już sumuje użytkowników, ale nie ma żadnego tooltipa po najechaniu (`showCoverageOnHover: false`, brak `bindTooltip`).

**Panel lidera — zatwierdzenia**
- `get_pending_leader_approvals()` zwraca tylko profile z `guardian_approved = true AND admin_approved = false AND is_active = true AND leader_approver_id = auth.uid()`.
- `leader_approver_id` jest ustawiany dopiero w momencie zatwierdzenia przez opiekuna (`find_nearest_leader_approver`), więc użytkownik przed akcją opiekuna nie trafia na listę lidera — to jest zgodne z łańcuchem Opiekun → Lider, ale lider nie widzi nikogo "w drodze".
- Funkcja **nie zwraca żadnej informacji o potwierdzeniu e-maila** (`auth.users.email_confirmed_at` / `profiles.email_activated`), a UI (`LeaderApprovalView.tsx`) tego nie pokazuje ani nie blokuje.
- Filtr `is_active = true` dodatkowo ukrywa świeże konta, które nie zostały jeszcze aktywowane.

## Plan

### 1. Mapa — pełna widoczność użytkowników z adresem
- Migracja: `get_user_location_points()` przestaje ukrywać konta zablokowane automatycznie. Wykluczani zostają wyłącznie usunięci (`deletion_status`) oraz zablokowani ręcznie przez administratora (blokady z powodem innym niż automatyczna nieaktywność). Funkcja dodatkowo zwraca flagę `is_inactive`.
- Warunkiem pozostaje uzupełnione miasto (kod pocztowy jako wsparcie dokładności, nie jako twardy warunek — 2 profile mają miasto bez kodu).
- Markery kont nieaktywnych renderowane w wygaszonym wariancie, a w popupie przy nazwisku pojawia się dopisek „nieaktywny”, żeby liczby na mapie pozostały czytelne.
- Bump wersji klucza cache geokodowania, żeby wymusić przeliczenie punktów (m.in. Żabno).

### 2. Klastry — licznik po najechaniu
- Do każdego klastra dopięty tooltip Leaflet z liczbą użytkowników („X użytkowników”) i liczbą miejscowości w klastrze, w stylistyce premium spójnej z resztą mapy.
- Analogiczny tooltip na pojedynczych markerach (miasto + liczba osób), bez konieczności klikania.

### 3. Panel lidera — status e-maila i kompletna lista oczekujących
- Migracja `get_pending_leader_approvals()`:
  - dodaje kolumny `email_confirmed_at` oraz `email_activated`,
  - usuwa filtr `is_active = true` (świeże, nieaktywne jeszcze konta mają być widoczne),
  - obok profili z przypisanym `leader_approver_id = auth.uid()` dołącza także te, dla których bieżący lider jest najbliższym liderem-zatwierdzającym w linii upline (spójne z `find_nearest_leader_approver`), aby nikt nie „ginął” między opiekunem a liderem.
- `LeaderApprovalView.tsx`: nowa kolumna „E-mail potwierdzony” z badge’em zielonym (data potwierdzenia) lub ostrzegawczym „Nie potwierdził e-maila”.
- Przycisk „Zatwierdź” nieaktywny dla osób bez potwierdzonego e-maila, z tooltipem wyjaśniającym, że zatwierdzenie jest możliwe dopiero po potwierdzeniu adresu; „Odrzuć” pozostaje dostępne.
- `useLeaderApprovals.ts`: rozszerzenie typu `PendingLeaderApproval` o nowe pola.

## Szczegóły techniczne
- Pliki: `src/components/admin/UserWorldMap.tsx`, `src/components/admin/user-world-map/{markers.ts,useUserGroups.ts,constants.ts}`, `src/components/admin/UserWorldMapWidget.tsx`, `src/index.css`, `src/components/leader/LeaderApprovalView.tsx`, `src/hooks/useLeaderApprovals.ts`.
- Dwie migracje SQL (`get_user_location_points`, `get_pending_leader_approvals`), obie `SECURITY DEFINER` z `SET search_path = public`.
