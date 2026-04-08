

# Plan: Delegowanie zarządzania dostępem do Auto-Webinaru na liderów

## Cel

Lider w Panelu Lidera będzie mógł włączać/wyłączać dostęp do auto-webinaru (kafelki BO i HC na pulpicie) użytkownikom ze swojej struktury downline. Admin widzi kto nadał dostęp i zawsze może go odebrać.

## Zmiany w bazie danych (migracja)

1. Dodać kolumnę `auto_webinar_granted_by` (UUID, nullable, FK do auth.users) w tabeli `leader_permissions` — przechowuje ID lidera, który nadał dostęp. Jeśli NULL = nadane przez admina.
2. Dodać kolumnę `can_manage_auto_webinar_access` (boolean, default false) w tabeli `leader_permissions` — nowe uprawnienie lidera do zarządzania dostępem auto-webinaru w swojej strukturze.
3. Zaktualizować RLS na `leader_permissions` — lider z `can_manage_auto_webinar_access` może UPDATE `can_access_auto_webinar` i `auto_webinar_granted_by` dla użytkowników ze swojej struktury downline (przez RPC `get_organization_tree`).

```sql
ALTER TABLE leader_permissions 
  ADD COLUMN auto_webinar_granted_by uuid REFERENCES auth.users(id),
  ADD COLUMN can_manage_auto_webinar_access boolean DEFAULT false;
```

## Zmiany w kodzie

### 1. `useLeaderPermissions.ts` — dodać `hasAutoWebinarAccess`
Odczytać `can_manage_auto_webinar_access` z `leader_permissions` i wyeksportować jako nową flagę.

### 2. `LeaderPanel.tsx` — dodać zakładkę "Auto-Webinary"
Nowa zakładka widoczna gdy `hasAutoWebinarAccess === true`, renderuje nowy komponent `LeaderAutoWebinarAccessView`.

### 3. Nowy komponent: `src/components/leader/LeaderAutoWebinarAccessView.tsx`
- Używa `useLeaderTeamMembers()` do pobrania listy downline
- Pobiera `leader_permissions.can_access_auto_webinar` dla tych użytkowników
- UI identyczny jak `AutoWebinarAccessManagement` (dwukolumnowy layout z wyszukiwarką i switchami)
- Przy toggle: ustawia `can_access_auto_webinar` + `auto_webinar_granted_by = currentUser.id`
- Lider widzi tylko swoją strukturę (nie wszystkich partnerów jak admin)

### 4. `AutoWebinarAccessManagement.tsx` (admin) — pokazać kto nadał dostęp
- Pobierać `auto_webinar_granted_by` z `leader_permissions`
- Jeśli ustawione — wyświetlić badge "Nadane przez: [Imię Nazwisko lidera]" obok switcha
- Admin nadal może wyłączyć dostęp niezależnie od tego kto go nadał (przy wyłączeniu czyści `auto_webinar_granted_by`)

### 5. `IndividualMeetingsManagement.tsx` (CMS zarządzanie uprawnieniami liderów)
- Dodać nowy switch "Zarządzanie dostępem Auto-Webinar" w liście uprawnień liderskich (obok istniejących jak "can_broadcast", "can_create_team_events" itp.)

## Pliki do edycji/utworzenia

| Plik | Zmiana |
|------|--------|
| Migracja SQL | 2 nowe kolumny + polityka RLS |
| `src/hooks/useLeaderPermissions.ts` | Nowa flaga `hasAutoWebinarAccess` |
| `src/pages/LeaderPanel.tsx` | Nowa zakładka + import |
| `src/components/leader/LeaderAutoWebinarAccessView.tsx` | **Nowy** — widok lidera |
| `src/components/admin/AutoWebinarAccessManagement.tsx` | Badge "Nadane przez lidera X" |
| `src/components/admin/IndividualMeetingsManagement.tsx` | Nowy switch uprawnienia |

## Logika bezpieczeństwa

- Lider może zmieniać `can_access_auto_webinar` TYLKO dla użytkowników w swoim downline (weryfikacja przez `get_organization_tree`)
- Admin może zmieniać dla każdego
- Przy wyłączeniu przez admina — `auto_webinar_granted_by` jest czyszczone
- Lider NIE może nadać sobie samemu tego uprawnienia

