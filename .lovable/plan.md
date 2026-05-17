## Cel
Na mapie „Nasi użytkownicy" przy dużym powiększeniu pokazywać etykiety miast obok kropek, a kliknięcie kropki/miasta ma otwierać przypiętą informację z liczbą użytkowników.

## Zmiany (`src/components/admin/UserWorldMap.tsx`)

**1) Etykiety miast przy dużym zoomie (pojedyncze kropki, nie klastry):**
- Próg widoczności: `view.zoom >= 6` (ten sam co granice miast). Opacity rośnie liniowo `(zoom-5)/3`, max 1.
- Dla każdego nie-klastra (`!isCluster`) renderować `<text>` obok `<circle>`:
  - pozycja: `x = r + 0.4/zoom`, `y = 0.3/zoom` (na prawo od kropki)
  - `fontSize = 2.2 / view.zoom`, `fill="hsl(var(--foreground))"`, `stroke="hsl(var(--background))"` z `strokeWidth = 0.6/zoom` `paintOrder="stroke"` dla czytelności na obu tłach (klasycznym i satelitarnym)
  - treść: `c.items[0].city`
  - `pointerEvents="none"`
- Klastry (>1 miasto) pozostają bez etykiety — tooltip nadal pokazuje listę.

**2) Klik = przypięty popover zamiast natychmiastowego zoom-in (dla pojedynczych miast):**
- Nowy stan `pinned: { x, y, title, lines, count } | null`.
- Klik w pojedynczą kropkę: jeśli już zazoomowane (`view.zoom >= 6`) — ustaw `pinned` w pozycji ekranowej kropki zamiast `zoomToLngLat`. Przy mniejszym zoomie zachowanie bez zmian (przybliżenie do miasta).
- Klik w klaster: bez zmian (przybliżenie).
- Pinned popover renderowany podobnie jak `hover`, ale z `pointer-events-auto`, przyciskiem zamknięcia `×` w rogu, klasą `z-30`. Treść: nazwa miasta + `{count} {użytkownik|użytkowników}`.
- Kliknięcie w pusty obszar mapy lub `Escape` → `setPinned(null)`. Pan/zoom również czyści `pinned`.

**3) Drobne:**
- Hover tooltip dalej działa jak teraz (nie koliduje z pinned — pinned ma wyższy z-index).
- Brak zmian w danych, RLS, geokodowaniu, klastrowaniu.

## Zakres
Tylko `src/components/admin/UserWorldMap.tsx`. Bez zmian backendu/typów/translacji.
