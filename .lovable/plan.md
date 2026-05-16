# Mniejsze markery + kontury miast przy dużym zoomie

Plik: `src/components/admin/UserWorldMap.tsx`

## 1) Mniejsze, łagodniej skalowane markery
Przy dużym zoomie kropki są obecnie zbyt duże (clamp 4.5, wykładnik 0.55). Zmieniamy:
- `r = clamp(0.5, 3.2, (1.1 + log2(count + 1) * 0.7) / Math.pow(zoom, 0.7))`
- `strokeWidth = 0.4 / Math.pow(zoom, 0.7)`
- Hit area pozostaje `r * 2.5`.
- Analogicznie legenda: `r = clamp(0.6, 3.2, 1.1 + log2(n+1) * 0.7)`.

Efekt: przy małym zoomie kropki nadal czytelne (~1.5–2.5 px), przy dużym wyraźnie mniejsze (~0.6–1 px), nie zasłaniają miast.

## 2) Kontury miast przy dużym przybliżeniu
Aktywują się dopiero przy `zoom ≥ 8` (granice miast nie mają sensu przy widoku Europy).

Mechanizm:
- Nowy edge function `geocode-city-boundary` (lub rozszerzenie istniejącego `geocode-cities`) — przyjmuje `{city, country}` i zwraca `geojson` (Polygon/MultiPolygon) z Nominatim: parametry `polygon_geojson=1&limit=1`. Wynik cache'ujemy w nowej tabeli `city_boundaries (city, country, geojson jsonb, not_found bool, last_attempt_at)` (klucz unikalny `city+country`).
- W komponencie nowy `useQuery` aktywny tylko gdy `position.zoom >= 8`. Pobiera boundaries dla widocznych klastrów (`visiblePoints`) ograniczonych do tych w aktualnym viewport (max np. 20 miast/żądanie, batch). Wyniki łączymy w obiekt `cityShapes: Record<key, GeoJSON>`.
- Render: dodatkowy `<Geographies geography={{type:'FeatureCollection', features: cityShapes}}>` nad granicami państw, z cienkim obrysem:
  - `fill: 'hsl(var(--primary) / 0.08)'`
  - `stroke: 'hsl(var(--primary) / 0.7)'`
  - `strokeWidth: 0.5 / zoom`
- Fade in/out z opacity przejściem opartym o `zoom` (np. opacity = clamp(0, 1, (zoom - 7) / 3)).

## 3) Migracja DB
Nowa tabela `city_boundaries`:
```sql
create table public.city_boundaries (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  country text not null,
  geojson jsonb,
  not_found boolean default false,
  last_attempt_at timestamptz default now(),
  unique(city, country)
);
alter table public.city_boundaries enable row level security;
-- read: admin only (via has_role)
create policy "Admins read city_boundaries" on public.city_boundaries
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
```
Zapis tylko z edge function (service_role omija RLS).

## Pliki
- `src/components/admin/UserWorldMap.tsx` — markery, query boundaries, render warstwy.
- `supabase/functions/geocode-city-boundary/index.ts` — nowa funkcja (analogiczna do `geocode-cities`, ale `polygon_geojson=1`).
- Migracja DB — tabela `city_boundaries` + RLS.

## Bez zmian
- Klastrowanie, animacja kamery, filtr po kraju, tabele profili.
