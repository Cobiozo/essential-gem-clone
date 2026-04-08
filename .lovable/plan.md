

# Plan: Naprawienie widoczności uprawnienia "Auto-Webinar" w panelu admina

## Problem

Uprawnienie `can_manage_auto_webinar_access` zostało dodane do `IndividualMeetingsManagement.tsx` (zakładka Wydarzenia > Spotkania indywidualne), ale NIE zostało dodane do głównego panelu zarządzania liderami `LeaderPanelManagement.tsx` — czyli tam gdzie admin faktycznie zarządza uprawnieniami liderów (zakładka Zarządzanie liderami).

Admin na stronie `/admin?tab=leader-panel-management` nie widzi opcji "Auto-Webinar" bo ta nie jest zdefiniowana w `columns`, `LEADER_PERM_FIELDS` ani w interfejsie `PartnerLeaderData`.

Lider nie widzi zakładki "Auto-Webinary" w Panelu Lidera, bo `can_manage_auto_webinar_access` jest `false` dla wszystkich — admin nie miał jak tego włączyć z poziomu panelu zarządzania liderami.

## Zmiany

### `src/components/admin/LeaderPanelManagement.tsx`

1. Dodać `can_manage_auto_webinar_access: boolean` do interfejsu `PartnerLeaderData`
2. Dodać `'can_manage_auto_webinar_access'` do `LeaderPermField` union type i tablicy `LEADER_PERM_FIELDS`
3. Dodać nową kolumnę w `columns`:
   ```typescript
   { key: 'can_manage_auto_webinar_access', label: 'Auto-Webinar', 
     description: 'Zarządzanie dostępem do auto-webinaru dla użytkowników w strukturze lidera', 
     icon: Radio, type: 'leader', group: 'Wydarzenia' }
   ```
4. Import ikony `Radio` z lucide-react (jeśli brakuje)

### `src/hooks/useLeaderPermissions.ts`

Usunąć cast `(leaderPerm as any)` na linii 132 — typ `can_manage_auto_webinar_access` już istnieje w types.ts.

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/LeaderPanelManagement.tsx` | Dodanie pola, kolumny i typu dla `can_manage_auto_webinar_access` |
| `src/hooks/useLeaderPermissions.ts` | Usunięcie zbędnego cast `as any` |

## Efekt

- Admin widzi toggle "Auto-Webinar" w panelu zarządzania liderami i może go włączyć
- Po włączeniu lider widzi zakładkę "Auto-Webinary" w Panelu Lidera
- Żadne zmiany w bazie danych nie są potrzebne — kolumna już istnieje

