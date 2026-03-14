

# Zarządzanie Authenticatorem (TOTP) — reset i zmiana

## Stan obecny
Brak jakiejkolwiek funkcji do resetu/zmiany/usunięcia TOTP. Użytkownik, który skonfigurował authenticator, nie może go zmienić ani usunąć. Admin również nie ma takiej możliwości.

## Proponowane zmiany

### 1. Panel użytkownika — sekcja "Moje MFA" (profil/ustawienia)
- Wyświetlenie aktualnego statusu MFA (TOTP aktywny / nieaktywny)
- Przycisk **"Zmień Authenticator"** — wymaga podania aktualnego kodu TOTP, następnie unenrolluje stary factor (`supabase.auth.mfa.unenroll()`) i rozpoczyna nowy enrollment
- Przycisk **"Usuń Authenticator"** — tylko jeśli metoda MFA to `both` lub nie jest wymagany TOTP (aby nie zablokować dostępu)

### 2. Panel admina — reset MFA dla użytkownika
- W sekcji Security lub przy liście użytkowników: przycisk **"Resetuj MFA"** przy danym użytkowniku
- Wywołanie Edge Function `reset-user-mfa` która:
  - Pobiera factors użytkownika przez Supabase Admin API (`auth.admin.mfa.deleteFactor()`)
  - Usuwa wszystkie TOTP factors
  - Loguje akcję do audit log
- Przy następnym logowaniu użytkownik zostanie poproszony o ponowną konfigurację

### 3. Edge Function `reset-user-mfa`
- Przyjmuje `target_user_id`
- Weryfikuje że wywołujący jest adminem (sprawdzenie w `user_roles`)
- Wywołuje `supabase.auth.admin.mfa.deleteFactor(userId, factorId)` dla każdego TOTP factora
- Zwraca status operacji

### Pliki do utworzenia/zmiany
1. **`supabase/functions/reset-user-mfa/index.ts`** — nowa Edge Function
2. **Nowy komponent** w profilu użytkownika — sekcja zarządzania MFA
3. **Panel admina** — przycisk resetu MFA przy użytkowniku (w SecuritySettings lub UserManagement)

