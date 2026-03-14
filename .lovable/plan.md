

# Rozbudowa Dashboardu Bezpieczeństwa + Naprawa geolokalizacji + Śledzenie aktywności

## Diagnoza problemów

### Miasto/kraj "unknown" (85 z 99 rekordów)
API `ipapi.co` (free tier) ma limit 1000 req/dzień i blokuje zapytania z IP Supabase Edge Functions (datacenter IPs). Rozwiązanie: zamienić na `ip-api.com/json/{ip}` (darmowe, 45 req/min, nie blokuje datacenter) z fallbackiem na `ipwho.is/{ip}`.

### Brak parsowania urządzeń
Pole `user_agent` zawiera pełne informacje (iPad, iPhone, Android, Windows, Linux), ale dashboard pokazuje tylko device_hash. Trzeba parsować UA na: typ urządzenia (telefon/tablet/komputer), system operacyjny, przeglądarkę.

### Brak śledzenia aktywności
Nie istnieje system rejestrowania akcji użytkowników (pobrania, udostępnienia, kliknięcia).

---

## Plan implementacji

### 1. Migracja bazy danych

**a) Rozszerzyć `login_audit_log`** — dodać kolumny:
- `device_type TEXT` (mobile, tablet, desktop, unknown)
- `os_name TEXT` (iOS, Android, Windows, macOS, Linux)
- `browser_name TEXT` (Chrome, Safari, Firefox, Edge, Samsung Browser)

**b) Utworzyć nową tabelę `user_activity_log`:**
```text
id           UUID PK
user_id      UUID FK → auth.users
action_type  TEXT (page_view, download, share, certificate_download, ...)
action_data  JSONB (szczegóły: URL, nazwa pliku, itp.)
page_path    TEXT
created_at   TIMESTAMPTZ DEFAULT now()
```
Z RLS: admini czytają wszystko, użytkownicy widzą swoje.

### 2. Edge function `track-login` — naprawa geolokalizacji + parsowanie UA

- Zamienić `ipapi.co` na `ip-api.com/json/{ip}?fields=city,country,regionName` z fallbackiem `ipwho.is`
- Dodać parsowanie User-Agent na serwerze (regex):
  - iPad/tablet → `tablet`
  - iPhone/Android Mobile → `mobile`
  - Windows/Mac/Linux bez Mobile → `desktop`
  - Wyciągnąć nazwę OS i przeglądarki
- Zapisywać `device_type`, `os_name`, `browser_name` do `login_audit_log`

### 3. Hook `useActivityTracking` (frontend)

Nowy hook wywoływany w kluczowych miejscach:
- Rejestruje akcje do `user_activity_log` bezpośrednio (insert do Supabase)
- Typy akcji: `page_view`, `download`, `share`, `certificate_download`, `resource_view`, `training_lesson_complete`
- Integracja z istniejącymi komponentami (Resources, Training, Certificates)

### 4. Rozbudowany `SecurityDashboard.tsx`

Nowe sekcje dashboardu (3 razy więcej danych):

**Rząd 1 — Karty podsumowania** (8 kart):
- Logowania 24h, 7d, 30d
- Unikalni użytkownicy 24h
- Podejrzane 24h
- Aktywne alerty
- Aktywności 24h (z nowej tabeli)
- Aktywne urządzenia (unikalne device_hash)

**Rząd 2 — Trend logowań z podziałem na godziny:**
- Wykres godzinowy (24h): w jakich godzinach logują się użytkownicy
- Wykres dzienny (7 dni) — obecny, ale ulepszony

**Rząd 3 — Urządzenia:**
- Pie chart: **Typ urządzenia** (Telefon / Tablet / Komputer) zamiast device_hash
- Pie chart: **System operacyjny** (iOS, Android, Windows, macOS)
- Pie chart: **Przeglądarka** (Chrome, Safari, Edge, Firefox, Samsung)

**Rząd 4 — Geolokalizacja:**
- Bar chart: Top 10 miast
- Bar chart: Top 5 krajów

**Rząd 5 — Aktywność użytkowników:**
- Tabela ostatnich aktywności (kto, co zrobił, kiedy)
- Wykres typów aktywności (downloads, shares, page_views)

**Rząd 6 — Ostatnie alerty + Kto jest online:**
- Lista alertów (obecna)
- Lista ostatnich logowań z danymi urządzenia

### 5. `SecurityLoginHistory.tsx` — rozszerzenie tabeli

Dodać kolumny: Urządzenie, System, Przeglądarka (obok IP, Miasto, Kraj).

---

## Pliki do zmiany/utworzenia

1. **Migracja SQL** — `login_audit_log` + nowa tabela `user_activity_log` + RLS
2. **`supabase/functions/track-login/index.ts`** — nowe API geo + parsowanie UA
3. **`src/hooks/useActivityTracking.ts`** — nowy hook do śledzenia aktywności
4. **`src/components/admin/security/SecurityDashboard.tsx`** — pełna przebudowa z nowymi sekcjami
5. **`src/components/admin/security/SecurityLoginHistory.tsx`** — dodanie kolumn urządzeń
6. **Integracja** — dodanie `useActivityTracking` w kluczowych komponentach (Training, Resources)

