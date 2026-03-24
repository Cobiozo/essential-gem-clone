

# Wymuszenie widoczności PureBox na podstawie `purebox_settings`

## Problem
Menu boczne i strona `/moje-testy` renderują się bezwarunkowo dla wszystkich zalogowanych użytkowników. Tabela `purebox_settings` w Supabase zawiera flagi `is_active`, `visible_to_partner`, `visible_to_client`, `visible_to_specjalista`, `visible_to_admin` ale nikt ich nie sprawdza.

## Plan

### 1. Nowy hook: `usePureBoxVisibility`
**Plik:** `src/hooks/usePureBoxVisibility.ts`

Hook pobiera z `purebox_settings` + `purebox_user_access` dane i zwraca mapę `Record<string, boolean>` (klucz = `element_key`, wartość = czy widoczny).

Logika widoczności dla danego `element_key`:
1. `is_active` musi być `true`
2. Flaga roli musi pasować (`visible_to_partner` dla partnera itd.) **LUB** użytkownik ma indywidualny dostęp w `purebox_user_access` z `is_enabled = true`
3. Admin widzi jeśli `visible_to_admin = true`

Zwraca: `{ isVisible: (elementKey: string) => boolean, loading: boolean }`

### 2. Filtrowanie submenu PureBox w sidebarze
**Plik:** `src/components/dashboard/DashboardSidebar.tsx`

- Wywołać `usePureBoxVisibility()`
- Powiązać `element_key` z submenu items: `skills-assessment` i `moje-testy` (lub ich odpowiedniki w bazie)
- Filtrować `submenuItems` — pokazywać tylko te gdzie `isVisible(elementKey)` = true
- Jeśli żaden submenu item nie jest widoczny, ukryć cały PureBox z menu

### 3. Guard na stronie `/moje-testy`
**Plik:** `src/pages/OmegaTests.tsx`

- Użyć `usePureBoxVisibility()` do sprawdzenia dostępu
- Jeśli `loading` — spinner
- Jeśli brak dostępu — przekierowanie na `/dashboard` lub komunikat "Brak dostępu"

### 4. Guard na stronie `/skills-assessment`
**Plik:** `src/pages/SkillsAssessment.tsx` (analogicznie jak OmegaTests)

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/hooks/usePureBoxVisibility.ts` | **Nowy** — hook sprawdzający purebox_settings + user_access |
| `src/components/dashboard/DashboardSidebar.tsx` | Filtrowanie submenu PureBox |
| `src/pages/OmegaTests.tsx` | Guard dostępu |
| `src/pages/SkillsAssessment.tsx` | Guard dostępu |

