

# Panel admina: dwukierunkowa integracja API (inbound + outbound)

## Diagnoza
Wybrałeś wariant **C** — czyli zarówno:
- **Inbound** — zewnętrzna aplikacja woła nasze API kluczem wygenerowanym u nas,
- **Outbound** — nasza aplikacja woła zewnętrzne API używając kluczy/URL wprowadzonych przez admina.

Oba mechanizmy będą zarządzane z jednego miejsca: nowa zakładka „API / Integracje" w panelu admina (`/admin`).

## Architektura

```text
┌─────────────────────────────────────────────────────────────┐
│                  /admin → API / Integracje                  │
├──────────────────────────┬──────────────────────────────────┤
│   INBOUND (nasze API)    │   OUTBOUND (integracje wych.)    │
│ • lista kluczy           │ • lista skonfigurowanych integr. │
│ • generowanie klucza     │ • dodaj/edytuj URL + nazwę       │
│ • scope-y, wygaśnięcie   │ • klucz API → trafia do Secrets  │
│ • logi wywołań           │ • test połączenia                │
│ • odwołanie              │ • logi wywołań wychodzących      │
└──────────────────────────┴──────────────────────────────────┘
            │                            │
            ▼                            ▼
   Edge: public-api              Edge: outbound-proxy
   (verify_jwt = false)          (verify_jwt = true)
   weryfikuje hash klucza        admin-only, czyta sekret,
   loguje wywołanie              woła zewnętrzne API, loguje
            │                            │
            ▼                            ▼
       baza Supabase            zewnętrzny serwis
```

## CZĘŚĆ 1 — INBOUND (zewn. apka woła NAS)

### 1.1 Tabele

**`api_keys`** (klucze, które wydajemy na zewnątrz)
- `id uuid PK`
- `name text` — np. „Integracja Zoho CRM"
- `key_prefix text` — 12 znaków pokazywanych w UI (`plk_live_a1b2c3d4`)
- `key_hash text` — SHA-256 całego klucza
- `scopes text[]` — np. `['contacts:read','events:read']`
- `created_by uuid` (admin)
- `created_at timestamptz default now()`
- `last_used_at timestamptz`
- `revoked_at timestamptz`
- `expires_at timestamptz` — opcjonalne (NULL = bez wygaśnięcia)
- RLS: tylko admin (`has_role(auth.uid(),'admin')`).

**`api_key_usage_log`**
- `id`, `api_key_id`, `endpoint`, `method`, `status_code`, `ip`, `user_agent`, `request_size_bytes`, `created_at`
- RLS: tylko admin SELECT.
- Auto-cleanup >90 dni (analogicznie do `database-auto-cleanup-system`).

### 1.2 Edge Function: `public-api` (verify_jwt = false)
Pojedyncza funkcja routująca po `?resource=...`:
- `GET ?resource=contacts&leader_id=...` → `team_contacts`
- `GET ?resource=events` → `events`
- `GET ?resource=event-registrations&event_id=...` → `event_registrations`
- `GET ?resource=auto-webinar-stats&event_id=...` → agregaty z `webinar_*`

Logika:
1. Czyta `Authorization: Bearer plk_live_...`.
2. SHA-256 klucza, lookup w `api_keys`.
3. Odrzuca jeśli `revoked_at IS NOT NULL` lub `expires_at < now()`.
4. Sprawdza `scopes` względem żądanego resource.
5. Loguje do `api_key_usage_log`, aktualizuje `last_used_at`.
6. Odpowiada `{ data: [...], pagination: { page, total } }`, max 100 wierszy/req.
7. Rate-limit 60 req/min per klucz (in-memory w funkcji + ostrzeżenie w docs że pełny limit wymaga Redis/DB).
8. CORS otwarty (zewnętrzne aplikacje).

### 1.3 Edge Functions: zarządzanie kluczami (verify_jwt = true)
- `admin-create-api-key` — generuje klucz, hashuje, zapisuje, zwraca **pełny klucz tylko raz** (UI pokazuje go w modalu „Skopiuj teraz, nie zobaczysz ponownie"). Loguje `api_key_created` w `admin_activity_log`.
- `admin-revoke-api-key` — ustawia `revoked_at = now()`. Loguje `api_key_revoked`.

Obie funkcje stosują wzorzec z `mem://security/edge-functions-admin-authorization` (jawne sprawdzenie roli admin w JWT).

## CZĘŚĆ 2 — OUTBOUND (MY wołamy zewn. apkę)

### 2.1 Tabela `outbound_integrations` (konfiguracja, BEZ sekretów)
- `id uuid PK`
- `name text` — np. „MailerLite", „Custom CRM"
- `slug text unique` — używane do nazwy sekretu, np. `mailerlite` → sekret `OUTBOUND_MAILERLITE_API_KEY`
- `base_url text` — np. `https://api.mailerlite.com/api/v2`
- `auth_type text` — `bearer` | `api_key_header` | `basic` | `none`
- `auth_header_name text` — domyślnie `Authorization` (dla `api_key_header` może być np. `X-API-Key`)
- `default_headers jsonb` — opcjonalne dodatkowe nagłówki (np. `Content-Type`)
- `description text`
- `enabled boolean default true`
- `created_by uuid`, `created_at timestamptz`
- `last_test_at timestamptz`, `last_test_status text` (`ok` / `error`)
- RLS: tylko admin.

**Sekret klucza API trzyma się w Supabase Secrets** (nie w bazie!), nazwa wyliczana z `slug`. Zgodnie z zasadą `mem://` „Never Store Secrets in the Database".

### 2.2 Tabela `outbound_call_log`
- `id`, `integration_id`, `method`, `path`, `status_code`, `duration_ms`, `error_message`, `caller_user_id`, `created_at`
- RLS: tylko admin.
- Auto-cleanup >90 dni.

### 2.3 Edge Function: `outbound-proxy` (verify_jwt = true, admin-only)
Bezpieczny proxy — frontend NIGDY nie widzi sekretu zewn. integracji.
- Body: `{ integration_id, method, path, query?, body?, headers? }`.
- Sprawdza rolę admin (lub w przyszłości: dedykowane uprawnienie `can_use_integrations`).
- Wczytuje `outbound_integrations` po `integration_id`.
- Czyta sekret z `Deno.env.get('OUTBOUND_<SLUG_UPPER>_API_KEY')`.
- Buduje request do `base_url + path` z odpowiednim auth headerem.
- Loguje wywołanie do `outbound_call_log`.
- Zwraca odpowiedź zewn. API jako JSON (status code, body, headers).
- Timeout 30 s, max body 1 MB.

### 2.4 Edge Function: `admin-test-outbound-integration` (verify_jwt = true)
Wykonuje prosty `GET` na `base_url` (lub konfigurowalnym `health_path`), zapisuje wynik do `last_test_at` / `last_test_status`. UI pokazuje zielony/czerwony badge.

## CZĘŚĆ 3 — UI w panelu admina

### Nowa zakładka `/admin` → „API / Integracje"
Dwie pod-zakładki: **Klucze API (inbound)** i **Integracje wychodzące (outbound)**.

**Inbound:**
- Lista kluczy (nazwa, prefix `plk_live_a1b2c3d4...`, scope-y jako chipy, data utworzenia, ostatnie użycie, status, licznik wywołań z 30 dni).
- Przycisk „Wygeneruj nowy klucz" → modal z polami: nazwa, scope-y (multi-checkbox), opcjonalna data wygaśnięcia.
- Po wygenerowaniu: modal z **pełnym kluczem** + przycisk „Kopiuj" + ostrzeżenie „klucz będzie widoczny tylko teraz".
- Akcja „Odwołaj" (z confirm).
- Rozwijany panel logów: ostatnie 50 wywołań (endpoint, status, IP, czas).

**Outbound:**
- Lista integracji (nazwa, base_url, status połączenia, ostatni test, enabled toggle).
- Przycisk „Dodaj integrację" → modal: nazwa, slug, base_url, auth_type, header name, opcjonalne default headers, opis. Po zapisie wyświetlamy instrukcję: „Dodaj sekret `OUTBOUND_<SLUG>_API_KEY` w Lovable Cloud" + odpowiedni link.
- Przyciski „Testuj połączenie" / „Edytuj" / „Usuń".
- Rozwijany panel logów wywołań wychodzących per integracja.

**Sekcja „Dokumentacja dla integratora" (inbound):**
Statyczny blok z przykładami `curl`:
```
curl -H "Authorization: Bearer plk_live_..." \
  "https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/public-api?resource=contacts"
```
+ tabela: resource → wymagany scope.

## Bezpieczeństwo
- Klucze inbound: tylko SHA-256 hash w bazie, pełny klucz pokazany jeden raz.
- Klucze outbound: tylko w Supabase Secrets, nigdy w bazie ani w odpowiedzi do frontendu.
- Każde wywołanie (in/out) logowane.
- `admin_activity_log`: wpisy `api_key_created`, `api_key_revoked`, `outbound_integration_added`, `outbound_integration_removed`, `outbound_test`.
- Admin-only w obu kierunkach (z opcją w przyszłości na rozszerzenie do dedykowanego uprawnienia).
- CORS: `public-api` otwarty, `outbound-proxy` ograniczony do naszej domeny.
- Audit logi czyszczone po 90 dniach.

## Pliki do utworzenia / zmiany

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/<new>.sql` | 4 tabele: `api_keys`, `api_key_usage_log`, `outbound_integrations`, `outbound_call_log` + RLS + auto-cleanup config |
| `supabase/functions/public-api/index.ts` | Inbound: routing po `resource`, weryfikacja klucza, scope-y, logi |
| `supabase/functions/admin-create-api-key/index.ts` | Generowanie klucza inbound |
| `supabase/functions/admin-revoke-api-key/index.ts` | Odwoływanie klucza inbound |
| `supabase/functions/outbound-proxy/index.ts` | Outbound: bezpieczny proxy admin-only |
| `supabase/functions/admin-test-outbound-integration/index.ts` | Test połączenia outbound |
| `supabase/config.toml` | 5 wpisów funkcji (`public-api` → verify_jwt=false, reszta true) |
| `src/components/admin/ApiIntegrationsPanel.tsx` | Główny panel z dwoma pod-zakładkami |
| `src/components/admin/InboundApiKeys.tsx` | Lista, modal generowania, logi inbound |
| `src/components/admin/OutboundIntegrations.tsx` | Lista, modal dodawania, test, logi outbound |
| `src/components/admin/IntegrationDocsBlock.tsx` | Dokumentacja `curl` dla integratora |
| `src/pages/Admin.tsx` (lub `AdminTabs`) | Dopisanie nowej zakładki „API / Integracje" |
| `mem://features/admin/api-integrations-governance` | Nowy wpis w pamięci (zasady kluczy, sekretów, logów) |

## Co NIE wchodzi w zakres (świadome wyłączenia)
- Per-user OAuth dla zewn. usług (Google/Slack itd.) — to robimy przez connectors, nie tym mechanizmem.
- Webhooki przychodzące (zewn. apka pushuje zdarzenia do nas) — można dorobić w kolejnym kroku jako trzecią pod-zakładkę „Webhooks".
- Write access przez `public-api` — startujemy od read-only; write dorzucimy gdy będziesz miał konkretny use case (musimy świadomie zaprojektować scope-y typu `contacts:write`).

## Efekt
Admin w `/admin` → „API / Integracje" ma jedno miejsce do:
1. **Wydawania kluczy** dla zewn. aplikacji, które mają czytać nasze dane (kontakty, eventy, rejestracje, statystyki webinarów) — z kontrolą scope-ów, wygaśnięcia, odwołania i pełnym audytem wywołań.
2. **Konfigurowania integracji wychodzących** — definiowania zewn. serwisów (URL + typ auth), bezpiecznego trzymania kluczy w Supabase Secrets, testowania połączenia i logowania każdego wywołania.

Wszystko z dwustronnym audit log-iem, retencją 90 dni i ścisłą kontrolą dostępu admin-only.

## Pytania zamykające
1. **Sekrety outbound** — domyślnie wymagam dodania ich ręcznie w Lovable Cloud po utworzeniu integracji (UI pokaże dokładną nazwę sekretu i link). OK, czy wolisz pole „wklej klucz" w modalu i my sami zapiszemy go jako secret? (Drugie podejście jest wygodniejsze, pierwsze bardziej „ortodoksyjne").
2. **Scope-y inbound do startu** — proponuję 4: `contacts:read`, `events:read`, `registrations:read`, `autowebinar-stats:read`. Dorzucić coś jeszcze (np. `users:read`, `teams:read`)?

Po Twoich odpowiedziach przechodzę do implementacji.

