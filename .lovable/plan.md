

# Widoczność widżetu "Zaproś na Live Webinar" — zarządzanie przez admina

## Obecny stan
- `auto_webinar_config` ma kolumny `visible_to_partners`, `visible_to_clients`, `visible_to_specjalista` — ale **nigdy nie są używane** (ani w admin UI, ani w widżecie)
- Widżet jest hardcoded: ukryty tylko dla `client` (linia 288)
- Admin nie ma żadnego UI do zarządzania widocznością widżetu ani per-kategoria

## Plan

### 1. Dodać widżetowy master toggle do `feature_visibility`
Migration SQL: INSERT wiersz `feature_key = 'webinar-invite-widget'` w tabeli `feature_visibility` z domyślnymi wartościami `visible_to_admin = true`, `visible_to_partner = true`, `visible_to_specjalista = true`, `visible_to_client = false`.

### 2. Admin UI — role visibility toggles w `AutoWebinarManagement.tsx`
Pod sekcją "System włączony" dodać 3 przełączniki:
- "Widoczny dla Partnerów" → `visible_to_partners`
- "Widoczny dla Specjalistów" → `visible_to_specjalista`  
- "Widoczny dla Klientów" → `visible_to_clients`

Zapis do `auto_webinar_config` via `handleUpdateConfig`.

### 3. Widżet — sprawdzanie widoczności (`WebinarInviteWidget.tsx`)

**Master toggle**: Pobrać `feature_visibility` z `feature_key = 'webinar-invite-widget'` i sprawdzić `visible_to_*` dla aktualnej roli. Jeśli false → cały widżet ukryty.

**Per-kategoria**: `CategoryColumn` już pobiera `config` — dodać sprawdzenie `config.visible_to_partners` / `visible_to_specjalista` / `visible_to_clients` w zależności od roli użytkownika. Jeśli rola nie ma dostępu → `return null`.

**Logika**: Jeśli obie kategorie zwrócą `null` (bo rola nie ma dostępu do żadnej), widżet i tak się nie pokaże (pusta karta). Ale master toggle pozwala wyłączyć cały widżet niezależnie od per-category ustawień.

### 4. Admin CMS — master toggle
W zakładce "Wydarzenia i narzędzia" (gdzie jest `feature_visibility`) admin będzie mógł sterować globalnym włącznikiem widżetu. Per-category widoczność ról będzie w konfiguracji każdej kategorii auto-webinaru.

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| Migration SQL | INSERT `webinar-invite-widget` do `feature_visibility` |
| `src/components/admin/AutoWebinarManagement.tsx` | 3 switche widoczności ról pod toggle "System włączony" |
| `src/components/dashboard/widgets/WebinarInviteWidget.tsx` | Sprawdzanie `feature_visibility` + per-category `visible_to_*` |

