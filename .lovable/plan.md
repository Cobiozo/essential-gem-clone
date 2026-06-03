## Cel
Pole „Imię i nazwisko opiekuna" (wraz z numerem EQ ID) w „Moje konto" ma być tylko do odczytu dla użytkownika — identycznie jak adres e-mail. Edycji może dokonać wyłącznie administrator (przez panel admina → edycja użytkownika, gdzie już istnieje `GuardianSearchInput`).

Użytkownik może samodzielnie edytować tylko: imię, nazwisko, numer telefonu (oraz pola adresowe/specjalisty/zgody — bez zmian).

## Zakres zmian

### 1. `src/components/profile/ProfileCompletionForm.tsx` (główna zmiana)
- Pole „Imię i nazwisko opiekuna" — zamienić edytowalny `Input` na widok read-only (`disabled` Input z klasą `bg-muted`), analogicznie do pola e-mail.
- Dodać obok numer EQ ID opiekuna (z `profile.upline_eq_id`) — również read-only.
- Usunąć znacznik `Wymagane` przy tym polu (użytkownik nie ma jak go uzupełnić).
- Dodać komunikat pod polem: „Może zmienić wyłącznie administrator".
- W `validateForm()` — usunąć walidację `guardianName` (nie powinna blokować zapisu, skoro pole jest niedostępne dla użytkownika).
- W `handleSave()` w `updateData` — usunąć `guardian_name` (użytkownik nie nadpisuje tej wartości).

### 2. `src/pages/MyAccount.tsx` (drobna zmiana w widoku read-only)
- W sekcji „Imię i nazwisko opiekuna" (ok. linia 712-719) — obok nazwiska opiekuna pokazać też EQ ID opiekuna (`profile.upline_eq_id`), zachowując ten sam styl.

### 3. `src/hooks/useProfileCompletion.ts`
- Usunąć `guardian_name` z listy `missingFields` (nie blokujemy ukończenia profilu z powodu pola, którego użytkownik nie może edytować). Pole jest gwarantowane przez proces rejestracji + admin może je poprawić.

### 4. Pamięć projektu
- Zaktualizować `mem://features/admin/user-account-governance-v2` — rozszerzyć regułę: oprócz Email/EQ ID, również **opiekun (imię, nazwisko + EQ ID opiekuna)** może być zmieniany wyłącznie przez administratora.

## Czego NIE zmieniamy
- Bazy danych, RLS, trigerów rejestracji — opiekun jest już ustawiany przy rejestracji.
- `UserEditDialog.tsx` (admin) — już teraz pozwala adminowi zmieniać opiekuna przez `GuardianSearchInput` i RPC `admin_change_user_guardian`.
- Innych pól w profilu użytkownika.
