## Co naprawić

W trybie „Wskaż klikając w aplikacji" obecnie da się wybrać tylko element, który ma własny link / zakładkę / atrybut `data-nav-target`. Sama strona (np. `/academy` otwarta w iframe) nie da się wybrać, bo trzeba w coś kliknąć.

## Rozwiązanie

### 1. Przycisk „Wybierz tę stronę" w MobileNavLivePicker

W stopce dialogu, obok „Zapisz jako cel", dodać przycisk:
**„📍 Użyj bieżącej strony"** — bierze aktualną ścieżkę z iframe i ustawia ją jako `selected`.

Implementacja:
- W `NavPickOverlay.tsx` przy montowaniu i przy każdej zmianie `location` wysyłać do parent `postMessage({type:'NAV_LOCATION', path: location.pathname + location.search})`.
- W `MobileNavLivePicker.tsx` nasłuchiwać `NAV_LOCATION` i trzymać w stanie `currentIframePath`. Pole z adresem startowym aktualizuje się też do tego adresu (żeby admin widział gdzie jest).
- Przycisk „Użyj bieżącej strony" ustawia `selected = { path: currentIframePath, label: nazwa_z_<title> }`.

Dodatkowo: w `NavPickOverlay` wysyłać też `document.title` razem z lokalizacją, żeby etykieta sama się podstawiała („Akademia" zamiast „/academy").

### 2. Wizualne podświetlenie elementu pod kursorem w iframe

Mały dodatek UX: w `NavPickOverlay` na `mousemove` dodawać outline (np. `outline: 2px solid hsl(var(--primary))`) do elementu który byłby wybrany. Dzięki temu admin od razu widzi co kliknie.

### 3. Lepsza obsługa kliknięć w tekst bez linka

Gdy admin kliknie w element, który nie jest linkiem ani nie ma `data-nav-target`, dziś w toaście pojawia się `pathname` jako fallback. Zachować ten fallback — to znaczy, że kliknięcie w „cokolwiek na stronie /academy" wybiera `/academy`. Już to mamy w kodzie, ale nie jest jasne dla użytkownika — toast powinien być wyraźniejszy: „Wybrano stronę: Akademia → /academy".

### 4. Drobny komunikat w stopce

W stopce zamiast „Kliknij element wewnątrz podglądu, aby go wybrać." pokazać dwie wskazówki:
- „Kliknij konkretny link/zakładkę, **albo** użyj przycisku »Użyj bieżącej strony«, żeby wskazać całą stronę z podglądu."

## Pliki

- `src/components/system/NavPickOverlay.tsx` — wysyłać `NAV_LOCATION` z `pathname+search+title`, dodać podświetlenie hover.
- `src/components/admin/MobileNavLivePicker.tsx` — odbierać `NAV_LOCATION`, synchronizować pole adresu, dodać przycisk „Użyj bieżącej strony".

Bez zmian schematu DB i bez nowych plików.
