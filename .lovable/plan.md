## Problem

Pole „Imię i nazwisko opiekuna" pokazuje wartość z `profiles.guardian_name` (zdenormalizowany tekst zapisany podczas rejestracji). Jedynym wiarygodnym źródłem prawdy jest `profiles.upline_eq_id`. Jeśli opiekun po rejestracji zmieni nazwisko, jeśli admin zmieni EQ ID opiekunowi, albo jeśli admin zmieni opiekuna bez aktualizacji denormalizowanych pól w innych miejscach — wartość `guardian_name` (i `upline_first_name`/`upline_last_name`) staje się nieaktualna. Stąd „121118185" pokazuje „Sebastian Snopek" zamiast faktycznego właściciela tego EQID („Dawid Kowalczyk").

## Rozwiązanie — jedno źródło prawdy: `upline_eq_id`

### 1. Backfill + trigger synchronizujący (migracja)

- **Backfill jednorazowy:** zaktualizować w `profiles` wszystkie rekordy gdzie `upline_eq_id` jest ustawione — przepisać `upline_first_name`, `upline_last_name`, `guardian_name` ze świeżych danych opiekuna (JOIN po `eq_id`). Naprawi to istniejące rozbieżności.
- **Trigger AFTER UPDATE na `profiles`:** gdy zmieni się `first_name`, `last_name` lub `eq_id` użytkownika, zaktualizować wszystkie rekordy w `profiles` mające `upline_eq_id = OLD.eq_id` (lub nowy `eq_id`) — przepisać `upline_first_name`, `upline_last_name`, `guardian_name`. Gwarantuje to spójność w przyszłości bez dotykania kodu front-end.
- W `handle_new_user` zachować dotychczasowe pola, ale w `admin_change_user_guardian` już teraz są ustawiane poprawnie — bez zmian.

### 2. Front-end — czytanie po `upline_eq_id` (defense in depth)

W miejscach pokazujących imię/nazwisko opiekuna pobierać świeże dane z `profiles` po `upline_eq_id`, zamiast polegać na `guardian_name`:

- **`src/pages/MyAccount.tsx`** (linia 712-727) — dodać lekki fetch po `upline_eq_id` (lub użyć istniejącego `useUnifiedChat`-podobnego wzorca z `useOrganizationTree`), wyświetlić `${first_name} ${last_name}` ze świeżego rekordu opiekuna. Fallback: `guardian_name`.
- **`src/components/profile/ProfileCompletionForm.tsx`** (read-only input opiekuna) — to samo źródło.
- Stworzyć mały hook `useGuardianProfile(uplineEqId)` w `src/hooks/` zwracający `{ firstName, lastName, eqId }`, żeby nie duplikować logiki.

### 3. Co NIE zmieniamy

- Schemat tabeli `profiles` — kolumny `upline_first_name`, `upline_last_name`, `guardian_name` zostają (są używane w wielu listach, np. `useLeaderApprovals`, admin, `CompactUserCard`). Trigger zapewnia ich aktualność.
- RLS, autoryzacja, rejestracja.
- `admin_change_user_guardian` (już poprawnie aktualizuje wszystkie trzy pola).

## Pliki do zmiany

- `supabase/migrations/<nowa>.sql` — backfill + trigger `sync_downline_guardian_fields`.
- `src/hooks/useGuardianProfile.ts` — nowy hook.
- `src/pages/MyAccount.tsx` — użycie hooka w sekcji read-only.
- `src/components/profile/ProfileCompletionForm.tsx` — użycie hooka w polu read-only opiekuna.
- `mem://features/admin/user-account-governance-v2` — zapisać regułę: **`upline_eq_id` jest jedynym źródłem prawdy dla opiekuna; trigger automatycznie synchronizuje `upline_first_name`, `upline_last_name`, `guardian_name` w downline gdy opiekun zmienia imię/nazwisko/EQID**.

## Efekt

Wszędzie w aplikacji imię i nazwisko opiekuna będzie konsekwentnie odpowiadać aktualnym danym właściciela `upline_eq_id` — natychmiast po backfillu (istniejące rozbieżności) i automatycznie po każdej zmianie w przyszłości (trigger).
