

# Finalizacja: podpięcie zakładki „API / Integracje" do panelu admina

## Stan obecny
Cała infrastruktura backendowa i komponenty UI są gotowe (migracja DB, 5 edge functions, 4 komponenty React). Brakuje jedynie **podpięcia** nowej zakładki do `AdminSidebar` i `Admin.tsx`, żeby admin mógł do niej wejść z menu.

## Zmiany

### 1. `src/components/admin/AdminSidebar.tsx`
- Dodanie nowego elementu menu w sekcji `system` (lub na końcu sekcji `communication` — proponuję `system`, bo to narzędzie integratorskie/techniczne).
- Wpis: `{ value: 'api-integrations', labelKey: 'apiIntegrations', icon: Plug }` (lub `Webhook` z `lucide-react`).
- Import ikony.

### 2. `src/pages/Admin.tsx`
- Dodanie `<TabsContent value="api-integrations">` renderującego `<ApiIntegrationsPanel />`.
- Import komponentu `ApiIntegrationsPanel` z `@/components/admin/ApiIntegrationsPanel`.
- Dodanie obsługi w bloku autoryzacji/lazy-loadingu (`if (activeTab === 'api-integrations' && isAdmin) ...`) — analogicznie do innych admin-only zakładek (np. `users`, `pages`).

### 3. Tłumaczenia (`labelKey: 'apiIntegrations'`)
- Sprawdzę gdzie trzymane są klucze sidebara (najpewniej `src/i18n/...` lub plik tłumaczeń sekcji `admin.sidebar`) i dodam wpis `apiIntegrations` w 8 językach (PL, EN, DE, NO, IT, ES, FR, PT) zgodnie z `mem://infrastructure/i18n-global-governance`:
  - PL: „API / Integracje"
  - EN: „API / Integrations"
  - DE: „API / Integrationen"
  - NO: „API / Integrasjoner"
  - IT: „API / Integrazioni"
  - ES: „API / Integraciones"
  - FR: „API / Intégrations"
  - PT: „API / Integrações"

### 4. (opcjonalnie) Zapis w pamięci `mem://features/admin/api-integrations-governance`
Krótki wpis dokumentujący:
- Lokalizacja zakładki: `/admin?tab=api-integrations`
- Inbound: SHA-256 hash klucza, scope-y, klucz pokazany 1×
- Outbound: sekrety w Lovable Cloud (`OUTBOUND_<SLUG>_API_KEY`), proxy admin-only
- Logi w `api_key_usage_log` / `outbound_call_log`, retencja 90 dni (do dodania w `data_cleanup_config` gdy tabela powstanie)

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | +1 wpis menu w sekcji `system`, import ikony `Plug` |
| `src/pages/Admin.tsx` | Import `ApiIntegrationsPanel` + nowy `<TabsContent value="api-integrations">` + lazy-load gating |
| Plik z tłumaczeniami sidebara | Klucz `apiIntegrations` w 8 językach |
| `mem://features/admin/api-integrations-governance` | Nowy wpis (opcjonalnie) |

## Efekt
Admin wchodzi w `/admin`, w lewym menu (sekcja **System**) widzi nową pozycję **„API / Integracje"** z ikoną wtyczki. Klik otwiera panel z dwoma pod-zakładkami (Klucze API przychodzące / Integracje wychodzące / Dokumentacja) — wszystko już gotowe i podpięte do działającego backendu.

## Co zrobię po zatwierdzeniu
1. Dodam wpis do `AdminSidebar.tsx`.
2. Podepnę `<TabsContent>` w `Admin.tsx`.
3. Uzupełnię 8 tłumaczeń.
4. Zapiszę memory `api-integrations-governance`.
5. Zwrócę linki do dashboardu Supabase (Edge Functions, sekrety) na koniec wiadomości.

Daj znać czy ruszam.

