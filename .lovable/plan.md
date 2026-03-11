

# Analiza systemu tłumaczeń i plan automatyzacji

## Stan obecny — co działa

System tłumaczeń AI jest poprawnie skonfigurowany technicznie:

1. **Edge functions**: `background-translate` + `auto-translate-content` — działają, tłumaczą za pomocą Lovable AI Gateway
2. **Obsługiwane typy treści** (mają tabele `_translations`):
   - `i18n_translations` — klucze interfejsu
   - `cms_item_translations` + `cms_section_translations` — treści CMS (dynamiczne, wpisywane przez admina)
   - `training_module_translations` + `training_lesson_translations` — szkolenia
   - `knowledge_resource_translations` — zasoby wiedzy
   - `healthy_knowledge_translations` — zdrowa wiedza

3. **Auto-translate po dodaniu treści**: Działa — `triggerAutoTranslate()` jest wywoływane po:
   - Dodaniu nowego modułu/lekcji szkoleniowej
   - Dodaniu zasobu wiedzy
   - Dodaniu materiału zdrowej wiedzy
   - Dodaniu nowego języka

## Problemy — co NIE działa / brakuje

### Problem 1: Brak automatycznego harmonogramu
Tłumaczenie uruchamiane jest **wyłącznie ręcznie** przez admina (przycisk w panelu) lub automatycznie po dodaniu NOWEJ treści. **Edycja** istniejącej treści NIE wyzwala tłumaczenia — zmieniony tekst po polsku nie zostanie przetłumaczony na inne języki, dopóki admin ręcznie nie uruchomi joba w trybie "all".

### Problem 2: Brak tłumaczenia niektórych treści dynamicznych
Te typy treści **nie mają** tabel tłumaczeń i nie są tłumaczone:
- **`system_texts`** (nagłówek strony, autor) — wpisywane przez admina, bez tłumaczeń
- **`daily_signals`** (sygnały dnia) — generowane po polsku, bez tłumaczeń
- **`events`** (tytuł, opis wydarzenia) — brak tabeli tłumaczeń

### Problem 3: Brak mechanizmu wykrywania zmienionych treści
Nawet przy harmonogramie, system sprawdza jedynie brak tłumaczenia (mode `missing`). Nie wykrywa, że oryginał (PL) został zmieniony po ostatnim tłumaczeniu.

## Plan rozwiązania

### Krok 1: Nowa edge function `scheduled-translate-sync`
Cron job uruchamiany raz na dobę (via `pg_cron`), który:
- Sprawdza `cron_settings` (job_name: `scheduled-translate-sync`) — czy jest włączony
- Dla każdego aktywnego języka (poza PL) uruchamia joby tłumaczeniowe:
  - `i18n` mode `missing` — nowe klucze
  - `cms` mode `missing` — nowe elementy CMS
  - `training` mode `missing` — nowe moduły/lekcje
  - `knowledge` mode `missing` — nowe zasoby
  - `healthy_knowledge` mode `missing` — nowe materiały
- Dodatkowo: wykrywa zmienione treści (porównanie `updated_at` oryginału vs tłumaczenia) i tworzy joby dla nich

### Krok 2: Wpis w `cron_settings`
Dodać rekord `scheduled-translate-sync` z `interval_minutes: 1440` (24h), `is_enabled: true`.

### Krok 3: Konfiguracja `pg_cron`
SQL do uruchomienia edge function raz dziennie o 3:00 w nocy.

### Krok 4: Panel admina — widoczność
W `CronJobsManagement.tsx` lub `TranslationsManagement.tsx` dodać informację o zaplanowanym jobie i przycisk "Wymuś teraz".

### Krok 5: Wykrywanie zmian (updated_at comparison)
W `background-translate` dodać nowy mode `outdated`:
- Porównuje `updated_at` oryginalnej treści z `updated_at` tłumaczenia
- Jeśli oryginał jest nowszy — przetłumacz ponownie

## Pliki do utworzenia/edycji
- **Nowy**: `supabase/functions/scheduled-translate-sync/index.ts`
- **Edycja**: `supabase/config.toml` — dodać entry
- **Edycja**: `src/components/admin/TranslationsManagement.tsx` — info o harmonogramie + przycisk "Wymuś sync"
- **SQL**: Insert do `cron_settings` + `pg_cron` schedule
- **Edycja**: `supabase/functions/background-translate/index.ts` — obsługa mode `outdated` (porównanie dat)

## Odpowiedzi na pytania

**Czy teksty dynamiczne wpisywane przez admina są tłumaczone?**
Tak, ale tylko CMS (cms_items, cms_sections), szkolenia, zasoby wiedzy i zdrowa wiedza. `system_texts` (nagłówek, autor), `daily_signals` i `events` — NIE mają tłumaczeń.

**Czy tłumaczenie może odbywać się raz na dobę automatycznie?**
Tak — po wdrożeniu planu powyżej. Nowa edge function `scheduled-translate-sync` wywoływana przez `pg_cron` codziennie o 3:00 w nocy przetłumaczy wszystkie brakujące i zmienione treści. Admin nadal będzie mógł wymusić tłumaczenie ręcznie.

