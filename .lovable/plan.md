## Cel

Dodać do mapy w `/admin?tab=user-stats` przełącznik **„Klasyczna / Satelitarna"**, który zmienia wygląd tła. Wariant satelitarny ma odpowiadać załączonemu screenowi (realistyczna Ziemia + wyraźne kontury państw).

## Zakres (jeden plik komponentu + jedna tekstura)

Plik: `src/components/admin/UserWorldMap.tsx`.

### 1. Nowy stan + persystencja
- `const [mapStyle, setMapStyle] = useState<'classic' | 'satellite'>(...)` — wartość początkowa czytana z `localStorage('userWorldMap.style')`, domyślnie `'satellite'` (zgodnie z obecnym wyglądem po ostatniej zmianie).
- Zmiana przełącznika → `setMapStyle(...)` + zapis do `localStorage`.

### 2. Przełącznik w nagłówku karty
- W `CardHeader`, obok przycisku „Odśwież", `ToggleGroup` z `@/components/ui/toggle-group` (shadcn, już używany w projekcie) z dwoma opcjami:
  - `Klasyczna` (ikona `Map`)
  - `Satelitarna` (ikona `Globe2`)
- Mały, kompaktowy (`size="sm"`, `variant="outline"`).

### 3. Renderowanie warunkowe wewnątrz `ComposableMap`

```tsx
{mapStyle === 'satellite' && (
  <image href="/textures/earth-satellite-2k.jpg" x={-180} y={-90} width={360} height={180}
         preserveAspectRatio="none" style={{ pointerEvents: 'none' }} />
)}
```

Style poligonów krajów (`<Geography>`) zależne od trybu:

| element              | classic                              | satellite                                    |
| -------------------- | ------------------------------------ | -------------------------------------------- |
| fill (default)       | `hsl(var(--muted) / 0.55)`           | `transparent`                                |
| fill (dimmed)        | `hsl(var(--muted) / 0.35)`           | `transparent`                                |
| stroke               | `hsl(var(--border) / 0.7)`           | `hsl(0 0% 100% / 0.55)` *(wyraźniejsze niż dziś — jak na screenie)* |
| stroke selected      | `hsl(var(--primary))`                | `hsl(var(--primary))`                        |
| hover fill           | `hsl(var(--muted-foreground)/0.25)`  | `hsl(0 0% 100% / 0.12)`                      |
| background `<svg>`   | brak (`transparent`)                 | `#0b1d2a` (na czas ładowania tekstury)       |

Projekcja:
- `classic` → `geoNaturalEarth1` (jak było pierwotnie).
- `satellite` → `geoEquirectangular` (żeby tekstura pasowała 1:1 do lng/lat).

Realizacja: zmienna `const projection = mapStyle === 'satellite' ? 'geoEquirectangular' : 'geoNaturalEarth1'` przekazana do `ComposableMap`.

### 4. Tekstura satelitarna „jak na screenie"
- Obecna `/textures/earth-bluemarble-2k.jpg` (z `solarsystemscope.com`, 2K) — ta sama, którą widać teraz; zgodna z załączonym screenem.
- **Wzmocnienie konturów państw** osiągamy programowo (jaśniejszy stroke `rgba(255,255,255,0.55)` zamiast obecnego `0.25`), bez nakładania drugiej tekstury — pełna kontrola, bez powiększenia paczki o kolejny plik.

### 5. Kontury miast, kropki, klastry, zoom (200), hover, panel boczny — bez zmian.

## Bezpieczeństwo / brak regresji

- Zmiany wyłącznie w jednym pliku komponentu (+ wykorzystanie istniejącej tekstury).
- Żadnych zmian w queries, edge functions, polling cap (30), kluczach query, RLS, schemacie, eksporcie CSV/XLSX, klastrowaniu, `handleGeographyClick`, `selectedIso`.
- Brak nowych zależności (`ToggleGroup` już jest w `src/components/ui`).
- `localStorage` w try/catch — brak crasha w prywatnym oknie.
- Przełączenie trybu nie resetuje pozycji/zoomu mapy ani zaznaczonego kraju.

## Weryfikacja

- Build (auto).
- Wizualnie: w `/admin?tab=user-stats` widoczny ToggleGroup; po przełączeniu mapa zmienia tło natychmiast; preferencja zachowana po przeładowaniu strony; kropki Warszawy/Krakowa lądują w odpowiednim miejscu w obu trybach.
