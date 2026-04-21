
# Diagnoza: dlaczego logo EQology IBP nie wyświetla się na podanym URL-u

## Co przeanalizowałem

URL: `https://purelife.info.pl/e/bussines-opportunity-hci9?ref=1234567890&slot=2026-04-21_16:00`

Ścieżka `/e/:slug` trafia do `EventRegistrationBySlug.tsx` (resolver), który po sprawdzeniu slug-a i ref-a **przekierowuje** na `/events/register/:eventId?...` — czyli na `EventGuestRegistration.tsx`, gdzie logo zostało dodane.

## Najbardziej prawdopodobne przyczyny braku logo

1. **Plik logo jest pusty / uszkodzony.** Z ostatniego diff-u widać, że `src/assets/eqology-ibp-logo.png` został „utworzony", ale poprzednia wersja była pustym plikiem, a nowa to `<binary>` bez potwierdzonego rozmiaru. Jeśli plik jest 0-bajtowy lub uszkodzony, Vite buduje URL, ale `<img>` nie pokaże nic (lub pokaże pustą ikonę „broken image"), co użytkownik interpretuje jako „brak logo".
2. **Cache produkcyjny / PWA.** `purelife.info.pl` to środowisko produkcyjne. Service Worker i cache assetów (1 rok) mogą serwować starą wersję strony, w której logo jeszcze nie istnieje.
3. **Warunek renderu nie jest spełniony.** `autoWebinarCategory` jest pobierane z `auto_webinar_config.category` dla danego eventu. Jeśli ten event w bazie nie ma kategorii ustawionej dokładnie na `'business_opportunity'` (np. ma `null`, inny string, lub w ogóle brak rekordu w `auto_webinar_config`), warunek `isAutoWebinar && autoWebinarCategory === 'business_opportunity'` zwraca `false` i logo się nie pokazuje.

## Plan naprawy (3 kroki, atomowe)

### Krok 1 — Weryfikacja pliku assetu
Sprawdzić rozmiar `src/assets/eqology-ibp-logo.png`:
- jeśli `0 B` lub niepoprawny PNG → ponownie skopiować upload `Zrzut_ekranu_2025-12-11_173311.png` do `src/assets/eqology-ibp-logo.png` (binarnie, jako prawdziwy PNG).
- potwierdzić `file src/assets/eqology-ibp-logo.png` zwraca `PNG image data, ... x ..., 8-bit/color RGBA`.

### Krok 2 — Weryfikacja danych w bazie
Zapytaniem SQL sprawdzić dla slug-a `bussines-opportunity-hci9`:
```sql
SELECT e.id, e.slug, e.event_type, awc.category, awc.is_enabled
FROM events e
LEFT JOIN auto_webinar_config awc ON awc.event_id = e.id
WHERE e.slug = 'bussines-opportunity-hci9';
```
Oczekiwane: `event_type = 'auto_webinar'`, `category = 'business_opportunity'`, `is_enabled = true`.
- Jeśli `category` jest `null` lub inna → poprawić rekord w `auto_webinar_config` (`UPDATE ... SET category = 'business_opportunity'`).
- Jeśli brak rekordu w `auto_webinar_config` → uzupełnić go (wówczas też logo nigdy by się nie pokazało, niezależnie od kodu).

### Krok 3 — Wymuszenie odświeżenia produkcji
Po naprawie pliku assetu i danych:
- przebudować front (cache-bust SPA dzięki istniejącej polityce deployment governance — `index.html` nie cache-uje się, assety mają hash w nazwie),
- na produkcji `purelife.info.pl` zrobić twarde odświeżenie (Ctrl+Shift+R) lub poczekać aż SW pobierze nową wersję (`SWUpdateBanner`).

## Zmiany w kodzie

Brak — kod w `EventGuestRegistration.tsx` jest poprawny. Problem leży w **assecie** i/lub **danych w bazie**, nie w logice.

## Pliki/zasoby do zmiany (warunkowo)

| Element | Akcja | Warunek |
|---------|-------|---------|
| `src/assets/eqology-ibp-logo.png` | Ponowne skopiowanie z uploadu jako prawdziwy PNG | gdy aktualny plik jest pusty/uszkodzony |
| `auto_webinar_config` (SQL UPDATE) | Ustawić `category = 'business_opportunity'` dla eventu o slugu `bussines-opportunity-hci9` | gdy zapytanie z Kroku 2 pokaże złą/brakującą kategorię |

## Efekt
Po naprawie pliku logo i potwierdzeniu, że event w bazie ma `category = 'business_opportunity'`, logo „EQOLOGY Independent Business Partner" pojawi się po prawej stronie tytułu na `/e/bussines-opportunity-hci9?...` (po przekierowaniu na `/events/register/:id`). Analogicznie zadziała dla wszystkich auto-webinarów BO i HC.
