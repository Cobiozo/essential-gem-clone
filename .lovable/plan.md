## Cel
Klik w kraj na mapie → podświetlenie zarysu wybranego państwa + pokazanie wyłącznie punktów miast użytkowników z tego kraju. Ponowny klik / przycisk „Wyczyść" zdejmuje filtr.

## Implementacja (`src/components/admin/UserWorldMap.tsx`)

1. **Stan zaznaczenia**
   - `const [selectedIso, setSelectedIso] = useState<string | null>(null)`
   - Pomocnik `geoNameToIso(name: string)` — używa istniejącego `NAME_TO_ISO` z `countryFlags.ts` (klucze są lowercase, też po angielsku, więc `world-atlas` `properties.name` zadziała dla obsługiwanych krajów).

2. **Klik w kraj**
   - `onClick` na `<Geography>`:
     ```
     const iso = geoNameToIso(g.properties.name);
     if (!iso) return;            // nieobsługiwany kraj — ignoruj
     setSelectedIso(prev => prev === iso ? null : iso);
     ```
   - Po wyborze: auto-zoom do bboxa punktów tego kraju (min/max lat/lng z `points`, centroid + dobranie `zoom` w zależności od rozpiętości).

3. **Style geografii**
   - `selectedIso === thisIso` → `fill: hsl(var(--primary) / 0.18)`, `stroke: hsl(var(--primary))`, `strokeWidth: 1`.
   - Inne kraje gdy filtr aktywny → `fill: hsl(var(--muted) / 0.4)` (przygaszone).
   - Brak filtra → obecne style.
   - `cursor: pointer` na hover dla krajów posiadających ISO.

4. **Filtrowanie punktów**
   - `const visiblePoints = selectedIso ? points.filter(p => normalizeCountry(p.country).iso === selectedIso) : points;`
   - Klastrowanie i render markerów liczone na `visiblePoints` (zamiast `points`).

5. **UI: chip z aktywnym filtrem**
   - W headerze obok statusu geokodowania mały pill: `🌍 Filtr: <kraj> ✕`, klik = `setSelectedIso(null)` + `handleReset()`.
   - Pod legendą drobna podpowiedź: „Kliknij kraj, aby filtrować".

## Bez zmian
- Algorytm klastrowania, tooltipy, zoom controls, geokodowanie, fallback krajów, pasek statusu.
- Brak zmian w bazie / edge functions.

## Pliki
- `src/components/admin/UserWorldMap.tsx` — jedyna modyfikacja.
