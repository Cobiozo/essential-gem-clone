## Diagnoza

Po sprawdzeniu danych:
- Elżbieta Dąbrowska (eq_id `191021665`) ma uprawnienie `can_manage_auto_webinar_access = true`.
- Wanda Koralewska (`upline_eq_id = 191021665`) JEST w downline Elżbiety na poziomie 1 (RPC `get_organization_tree('191021665')` ją zwraca).
- Wanda ma kilka aktywnych certyfikatów SZYBKI START.
- RPC `leader_update_auto_webinar_access` i `leader_get_team_auto_webinar_access` działają poprawnie i są SECURITY DEFINER (bypass RLS).

Ponieważ Elżbieta widziała zakładkę „Auto-Webinary", ale **Wandy nie było na liście**, problem leży w komponencie `src/components/leader/LeaderAutoWebinarAccessView.tsx` + hooku `useLeaderTeamMembers`. Trzy realne źródła błędu:

1. **`useLeaderTeamMembers`** używa React Query z `staleTime: 2 min` kluczowanym po `user.id`. Jeśli hook pobrał listę zanim `profile.eq_id` był dostępny (race condition przy logowaniu lub przy odświeżeniu profilu), zapytanie zwróciło `[]` i siedzi w cache — Wanda nigdy się nie pojawi do czasu pełnego przeładowania strony.
2. **`permissionsLoaded.current = true`** w `LeaderAutoWebinarAccessView` blokuje ponowne pobranie uprawnień nawet jeśli lista `teamMembers` później się powiększy — nowi członkowie zespołu nie dostaną wpisu w `accessMap`/`certMap`.
3. Brak ręcznego przycisku „Odśwież" — leader nie ma jak wymusić ponownego pobrania zespołu z bazy.

## Zakres zmian

### 1. `src/hooks/useLeaderTeamMembers.ts`
- `queryKey` zmienić na `['leader-team-members', user?.id, profile?.eq_id]`, żeby zmiana eq_id automatycznie unieważniała cache.
- Dodać `refetchOnWindowFocus: true` i obniżyć `staleTime` do 30 s.
- Wyeksportować `refetch` (już jest) — będzie używany w widoku.

### 2. `src/components/leader/LeaderAutoWebinarAccessView.tsx`
- Usunąć blokadę `permissionsLoaded.current` lub przeładowywać uprawnienia za każdym razem, gdy zmienia się lista `teamMembers.map(m => m.id).join(',')`.
- Zmienić dependency `useEffect` z `[teamLoading]` na `[teamLoading, teamMembers.length]`.
- Dodać przycisk „Odśwież listę" (ikona `RefreshCw`) obok pola wyszukiwania, który wywoła `refetch()` z hooka + ponowne `loadPermissions()`.
- Gdy `teamMembers.length === 0` po załadowaniu, pokazać czytelną informację: „Nie znaleziono użytkowników w Twojej strukturze. Twoje eq_id: {profile.eq_id ?? 'brak'}." — to ułatwi diagnozę w przyszłości (np. jeśli profil leadera nie ma jeszcze eq_id).
- W toast błędu z `toggleAccess` dołączyć `error.code`/`details`, żeby było widać konkretny powód odrzucenia RPC.

### 3. Brak zmian w bazie
RPC i uprawnienia są poprawne. Nie ruszamy `leader_get_team_auto_webinar_access`, `leader_update_auto_webinar_access`, `get_organization_tree`.

## Pliki

- `src/hooks/useLeaderTeamMembers.ts` (edytowane)
- `src/components/leader/LeaderAutoWebinarAccessView.tsx` (edytowane)

Po wdrożeniu poproszę Elżbietę o odświeżenie strony — Wanda powinna od razu być widoczna (obecnie w sekcji „Z dostępem", bo nadałeś już dostęp jako admin), a w przyszłości race condition znika dzięki kluczowi po eq_id + odświeżaniu po focusie.
