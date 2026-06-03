# Plan: Audyt tłumaczeń i ostrzeżenie o tłumaczu przeglądarki

## Kontekst

Skan wykazał ~903 plików .tsx/.ts w `src/`, ale tylko 69 z nich używa funkcji `t()` z `useLanguage`. Oznacza to, że duża część UI ma **zaszyte teksty po polsku** (np. `MyAccount.tsx`, panele admin, formularze, dialogi, toasty, etykiety pól, komunikaty błędów). Te teksty nie reagują na zmianę języka w przełączniku w górnej części pulpitu.

Dodatkowo: gdy użytkownik włączy tłumacza w przeglądarce (Google Translate, Edge, Safari), nadpisuje on DOM, co powoduje błędy React („NotFoundError: removeChild on Node”) i niespójność z wewnętrznym i18n PLC.

## Część 1 — Audyt tłumaczeń (etapowo)

Przeprowadzę audyt automatyczny i etapową naprawę. Zakres obejmuje ~830 plików bez `t()` — zrobimy to **warstwami**, żeby nie wprowadzić regresji:

### Krok 1. Skrypt audytu
- Skrypt `scripts/i18n-audit.mjs`, który skanuje `src/` w poszukiwaniu:
  - tekstów polskich w JSX (`>Tekst<`, `placeholder=""`, `title=""`, `aria-label=""`, `toast(...)`, `alert(...)`)
  - plików bez importu `useLanguage`
- Generuje raport `i18n-audit-report.md` z listą plików posortowaną wg liczby brakujących tłumaczeń.

### Krok 2. Naprawa priorytetowych obszarów (warstwa 1)
Najczęściej odwiedzane przez użytkowników:
- `src/pages/MyAccount.tsx` (etykiety profilu, opiekun, komunikaty)
- `src/pages/Dashboard.tsx` i widżety dashboardu
- `src/components/profile/ProfileCompletionForm.tsx`
- `src/components/layout/*` (Topbar, Sidebar, mobile bottom nav)
- Toasty globalne (sonner)

Wszystkie nowe klucze idą do `i18n_translations` (tabela DB) i są automatycznie tłumaczone przez `scheduled-translate-sync` na EN/DE/NO/IT/ES/FR/PT. Klucze stosują schemat `obszar.podobszar.nazwa` (np. `myaccount.guardian.name_label`).

### Krok 3. Naprawa warstwy 2
- Panele administracyjne (`src/components/admin/*`, `src/pages/admin/*`)
- CRM, eventy, leader panel, training, knowledge center
- Dialogi potwierdzeń, AlertDialog, ConfirmDialog

### Krok 4. Naprawa warstwy 3
- Komponenty rzadziej używane (PureBox, OmegaTests, NewsHub, partner pages)
- Komunikaty błędów edge functions (zwracane do UI)

### Krok 5. Walidacja
- Re-run skryptu audytu — raport końcowy powinien pokazać 0 hardkodów w warstwach 1–3.
- Test ręczny: przełączenie języka EN/DE/NO i weryfikacja kluczowych ekranów.

> **Uwaga zakresu:** całość to bardzo duża praca. W tym podejściu zrealizujemy **Krok 1 (skrypt + raport) + Krok 2 (warstwa 1)** w pierwszej iteracji. Kolejne warstwy w następnych iteracjach, na bazie raportu. To pozwoli uniknąć ogromnego, ryzykownego PR-a.

## Część 2 — Detekcja tłumacza przeglądarki

### Mechanizm wykrywania
Nowy hook `src/hooks/useBrowserTranslationDetector.ts`:
- **Sygnał 1:** MutationObserver na `<html>` wykrywający atrybuty wstrzykiwane przez tłumacze:
  - Google Translate: `class="translated-ltr"`, element `<font>` w DOM, `<html class="translated-*">`
  - Microsoft Edge: atrybut `_msthash`, `_msttexthash`
  - Safari: atrybut `data-translate` na elementach
- **Sygnał 2:** sprawdzenie `document.documentElement.lang` różnego od wewnętrznego `language` z `LanguageContext` przy zmianie atrybutu.
- **Sygnał 3:** porównanie tekstu kontrolnego (ukryty span z ASCII-checksum) — jeśli treść zmieniona, tłumacz aktywny.

### UI ostrzeżenia
- Komponent `src/components/i18n/BrowserTranslationWarning.tsx`:
  - Sticky banner pod Topbarem (z-index niższy niż modale chat PiP, czyli `z-[150]`).
  - Treść (przetłumaczona przez `t()`): „Wykryto tłumaczenie przeglądarki. Pure Life Center ma własny przełącznik języka (👆 w górnym pasku). Wyłącz tłumacza, aby uniknąć błędów wyświetlania.”
  - Przycisk „Jak wyłączyć?” → modal z instrukcją per-browser (Chrome/Edge/Safari/Firefox).
  - Przycisk „Rozumiem” → zapamiętane w `localStorage` (`plc-browser-translation-dismissed`) na 24h, ale banner wraca, jeśli tłumacz nadal aktywny po reload.
- Mount w `App.tsx` (po `Topbar`, tylko dla zalogowanych użytkowników, ukryty na public/auth routes).

### Zabezpieczenie React przed crashami tłumacza
- Dodanie atrybutu `translate="no"` na głównych kontenerach dynamicznych (chat, formularze, dialogi) — sygnał dla przeglądarki, by nie tłumaczyć tych elementów.
- W `index.html` na `<html>` dodać `<meta name="google" content="notranslate">` jako twarda blokada Google Translate (powszechna praktyka aplikacji SPA, np. Notion, Linear).

## Część 3 — Dokumentacja

Aktualizacja `mem://infrastructure/i18n-global-governance`:
- Reguła: każdy nowy komponent UI używa `useLanguage().t()` zamiast hardkodu PL.
- Reguła: `translate="no"` na kontenerach React zarządzających DOM dynamicznie (chat, listy z mutacjami).
- Reguła: banner ostrzegawczy o tłumaczu przeglądarki + `<meta name="google" content="notranslate">` w `index.html`.

## Pliki do utworzenia / zmodyfikowania (iteracja 1)

**Nowe:**
- `scripts/i18n-audit.mjs`
- `src/hooks/useBrowserTranslationDetector.ts`
- `src/components/i18n/BrowserTranslationWarning.tsx`
- `src/components/i18n/HowToDisableTranslatorDialog.tsx`

**Edycje:**
- `index.html` — meta notranslate
- `src/App.tsx` — mount bannera
- `src/pages/MyAccount.tsx` — pełna migracja na `t()`
- `src/pages/Dashboard.tsx` — pełna migracja na `t()`
- `src/components/profile/ProfileCompletionForm.tsx`
- `src/components/layout/Topbar.tsx`, Sidebar, MobileBottomNav
- `mem://infrastructure/i18n-global-governance`

**Migracja DB:**
- INSERT nowych kluczy do `i18n_translations` (PL jako źródło) — pozostałe języki uzupełni `scheduled-translate-sync`.

## Ryzyka

- Pełen audyt 800+ plików w jednej iteracji to ryzyko regresji i duża paczka. Dlatego dzielę na warstwy.
- `translate="no"` w kontenerach chat/realtime jest **konieczne** — bez tego tłumacz Google nadal crashuje React mimo banner.
- Detekcja tłumacza nie jest 100% — różne przeglądarki wstrzykują różne klasy. Hook używa wielu sygnałów, ale fałszywie negatywne są możliwe (np. Brave, Vivaldi). Banner pojawi się tylko, gdy któryś sygnał zadziała.

Czy zatwierdzasz plan i zaczynamy od iteracji 1 (skrypt audytu + warstwa 1 + detektor tłumacza)?
