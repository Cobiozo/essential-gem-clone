

# Plan: Bypass cooldownu 14 dni dla adminów i wybranych użytkowników

## Zakres

Admini mogą zmieniać szablony bez ograniczenia 14-dniowego. Dodatkowo, admin może nadać tę możliwość indywidualnym użytkownikom przez panel zarządzania dostępem.

## Zmiany

### 1. Migracja SQL

Dodanie kolumny `bypass_template_cooldown BOOLEAN DEFAULT false` do tabeli `partner_page_user_access`.

### 2. `src/hooks/usePartnerPage.ts`

- Pobrać rolę użytkownika z `useAuth()` (sprawdzenie czy admin)
- Pobrać flagę `bypass_template_cooldown` z `partner_page_user_access` dla bieżącego użytkownika
- W logice `canChangeTemplate`: jeśli rola = admin LUB bypass = true → zawsze `canChangeTemplate = true`
- W `selectTemplate`: analogicznie pominąć sprawdzenie cooldownu

### 3. `src/components/admin/PartnerPageAccessManager.tsx`

Dodać switch "Bez limitu zmiany szablonu" przy każdym użytkowniku na liście dostępu indywidualnego, zapisujący pole `bypass_template_cooldown`.

### 4. UI edytora (`PartnerPageEditor.tsx`)

Bez zmian — logika już oparta na `canChangeTemplate`, więc bypass zadziała automatycznie.

### Pliki do zmiany

| Plik | Zmiana |
|------|------|
| Nowa migracja SQL | `ALTER TABLE partner_page_user_access ADD COLUMN bypass_template_cooldown` |
| `src/hooks/usePartnerPage.ts` | Pobranie roli + flagi bypass, override cooldownu |
| `src/components/admin/PartnerPageAccessManager.tsx` | Switch bypass per user |

