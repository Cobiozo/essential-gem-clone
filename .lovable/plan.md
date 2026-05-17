## Cel
1. Usunąć wymóg minimum 5 pozycji w dolnym pasku nawigacji (mobile). Może być od 1 do N.
2. Umożliwić adminowi **wskazanie celu kliknięciem dowolnego miejsca w aplikacji** (nie tylko z gotowej listy ścieżek), z obsługą podstron które nie mają własnego URL (zakładki, sekcje, modale).

## 1. Zniesienie limitu 5 pozycji

Plik: `src/components/admin/MobileBottomNavSettings.tsx`
- Usunąć blokadę w `remove()` (`if (activeCount <= 5 ...)`)
- Usunąć blokadę w `onCheckedChange` przy `Switch is_active`
- Usunąć komunikat `aktywnych pozycji jest mniej niż 5`
- W nagłówku zostawić tylko informację: „Możesz dodać dowolną liczbę pozycji (zalecane 3–5 dla czytelności)."

Plik: `src/components/layout/MobileBottomNav.tsx`
- Bez zmian logiki — już renderuje wszystkie `visible`. Dodać tylko ograniczenie wizualne: jeśli >5 widocznych, scroll poziomy (`overflow-x-auto`, `snap-x`) zamiast ścisku ikon.

## 2. Pickowanie celu kliknięciem w aplikacji

### Model danych
`target_path` pozostaje stringiem, ale akceptuje trzy formaty:
- `"/dashboard"` — czysty route
- `"/dashboard#widget-tasks"` — route + hash (do anchor scroll / zakładki)
- `"/admin?tab=users"` — route + query (dla podstron typu Admin tabs)

Nie trzeba migracji.

### Komponent „Tryb wskazywania" (Pick Mode)

Nowy plik: `src/components/admin/MobileNavLivePicker.tsx`
- `Dialog` (fullscreen na mobile, 90vw/90vh na desktop) zawierający:
  - Pasek górny: pole adresu startowego (domyślnie `/dashboard`), przycisk „Idź", przycisk „Zapisz jako cel" (nieaktywny dopóki nic nie wybrano), przycisk „Anuluj".
  - Główna powierzchnia: `<iframe src="/dashboard?__navpick=1" />` na całą wysokość, ramka zaokrąglona.
  - Pasek dolny: bieżący wskazany cel — `path + hash/query + nazwa elementu`.

### Tryb „nav pick" wewnątrz aplikacji

Nowy plik: `src/components/system/NavPickOverlay.tsx`
- Mount w `App.tsx` (zaraz po `BrowserRouter`).
- Aktywny tylko gdy `new URLSearchParams(location.search).get('__navpick') === '1'`.
- Co robi:
  1. Dodaje globalny CSS overlay z napisem „Tryb wskazywania — kliknij element, który ma być celem".
  2. Globalny listener `click` w fazie `capture`, `preventDefault` + `stopPropagation` na każdym kliknięciu.
  3. Z elementu klikniętego wyciąga cel w kolejności:
     - `closest('[data-nav-target]')` → wartość atrybutu (najlepszy przypadek, dla zakładek/akcji bez URL).
     - `closest('a[href]')` → href (route lub zewnętrzny URL — odrzucamy zewnętrzne).
     - `closest('[role="tab"][value]')` → `location.pathname + '?tab=' + value` (dla `Tabs` z shadcn).
     - W ostateczności: `location.pathname + '#' + (element.id || generateAnchor)`. Jeśli element nie ma `id`, dodajemy mu tymczasowy `id="navpick-<hash>"` i sugerujemy adminowi — ale to słabe. Zamiast tego: oferujemy tylko `location.pathname` z toastem „Element nie ma stabilnego adresu — wskaż link, zakładkę lub dodaj `data-nav-target` w kodzie."
  4. Wysyła do parent okna: `window.parent.postMessage({type:'NAV_PICK', path, label}, '*')`.
  5. Pokazuje toast w iframe: „Wybrano: <label> → <path>. Wróć do panelu i kliknij Zapisz."

W `MobileNavLivePicker.tsx`:
- `useEffect` z `window.addEventListener('message', ...)` filtrującym `type === 'NAV_PICK'`, ustawia lokalny `selected = {path, label}`.
- „Zapisz jako cel" → `onPick(selected.path)` + `onPick` może też zaktualizować label jeśli pusty/„Nowa pozycja".

### Wzbogacenie istniejących ekranów o `data-nav-target`

Aby kliknięcia trafiały w sensowne cele bez URL (zakładki Admin, widgety Dashboard, sekcje), w **drugim kroku** dodać `data-nav-target="/admin?tab=users"` itp. w kluczowych miejscach:
- `AdminSidebar.tsx` — każdy `TabsTrigger` lub przycisk zakładki: `data-nav-target={`/admin?tab=${item.value}`}`
- `Dashboard.tsx` — kafle widgetów: `data-nav-target` z odpowiednim hashem (`#widget-<id>`) + dodać scroll-on-hash w Dashboard.

### Integracja w `MobileBottomNavSettings.tsx`
- Obok obecnego przycisku „Miejsce w aplikacji" (otwiera `MobileNavPathPicker`) dodać drugi przycisk **„Wskaż klikając w aplikacji"** otwierający `MobileNavLivePicker`.
- Oba sposoby zapisują do tego samego pola `target_path`.

### Obsługa `#hash` po nawigacji
W `MobileBottomNav.tsx` `onClick`:
```
const [pathname, hash] = it.target_path.split('#');
navigate(pathname);
if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({behavior:'smooth'}), 100);
```

### Bezpieczeństwo
- W `NavPickOverlay` weryfikujemy `event.origin === window.location.origin` przy odbiorze postMessage w parent (ten sam origin — iframe na tym samym hoście).
- Tryb `__navpick=1` aktywny tylko dla zalogowanego admina (`useAuth().userRole?.role === 'admin'`); inaczej overlay się nie montuje (defense-in-depth).

## Pliki

**Edytowane:**
- `src/components/admin/MobileBottomNavSettings.tsx` — usuń limit 5, dodaj drugi przycisk „Wskaż klikając"
- `src/components/layout/MobileBottomNav.tsx` — obsługa `#hash`, scroll przy >5 ikonach
- `src/App.tsx` — montuje `<NavPickOverlay/>`

**Nowe:**
- `src/components/admin/MobileNavLivePicker.tsx` — Dialog z iframe
- `src/components/system/NavPickOverlay.tsx` — przechwytywanie kliknięć w trybie pickowania

**Drugi etap (opcjonalnie, po akceptacji):**
- Dodanie `data-nav-target` w `AdminSidebar`, `Dashboard` i innych miejscach bez URL.

## Pytanie do Ciebie
Czy w pierwszym podejściu wystarczy tryb live-picker działający na elementach które **już mają URL/link** (`<a href>`, `Link`, zakładki `TabsTrigger`), a `data-nav-target` dorzucimy stopniowo tam gdzie potrzeba? Czy od razu chcesz mieć obrandowane wszystkie kluczowe sekcje (Dashboard widgets, Admin tabs, PureBox sekcje)?
