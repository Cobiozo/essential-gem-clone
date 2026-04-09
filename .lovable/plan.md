

# Formularz danych gościa na stronie Zdrowa Wiedza (OTP)

## Problem
Obecnie strona OTP Zdrowej Wiedzy wymaga tylko kodu dostępu. Brak zbierania danych kontaktowych gościa (imię, nazwisko, email, telefon) i klauzuli informacyjnej.

## Rozwiązanie

### 1. Migracja SQL — dodanie kolumn do `hk_otp_sessions`

Dodać kolumny przechowujące dane gościa przy walidacji OTP:
- `guest_first_name` (text)
- `guest_last_name` (text)
- `guest_email` (text)
- `guest_phone` (text)
- `email_consent` (boolean, default false)

### 2. Frontend — `HealthyKnowledgePublicPage.tsx`

Rozbudować formularz OTP o pola:
- Imię (wymagane, min 2 znaki)
- Nazwisko (wymagane, min 2 znaki)
- Email (wymagane, walidacja formatu)
- Numer telefonu (wymagane, z komponentem `PhoneInputWithPrefix` — jak w rejestracji na wydarzenie)
- Checkbox zgody na przetwarzanie danych (wymagany) — tekst analogiczny do `emailConsent` z `invitationTemplates.ts` (PL)
- Klauzula informacyjna pod przyciskiem (tekst analogiczny do `consent` z `invitationTemplates.ts`)

Dane gościa przekazywane do `validate-hk-otp` w body requestu.

### 3. Edge Function — `validate-hk-otp/index.ts`

Odebrać nowe pola z body (`guest_first_name`, `guest_last_name`, `guest_email`, `guest_phone`) i zapisać je w `hk_otp_sessions` przy tworzeniu sesji.

### 4. Panel admina — widoczność danych gościa

Upewnić się, że dane gościa z sesji OTP są widoczne w panelu zarządzania kodami OTP Zdrowej Wiedzy (jeśli istnieje taki widok).

## Pliki do zmiany/utworzenia

| Plik | Zmiana |
|------|--------|
| Migracja SQL | 4 kolumny + consent w `hk_otp_sessions` |
| `src/pages/HealthyKnowledgePublicPage.tsx` | Formularz z danymi gościa + klauzula |
| `supabase/functions/validate-hk-otp/index.ts` | Zapis danych gościa w sesji |

