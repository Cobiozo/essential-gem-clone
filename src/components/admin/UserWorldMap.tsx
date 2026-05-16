import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from 'react-simple-maps';
import worldTopo from 'world-atlas/countries-110m.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Globe2, Plus, Minus, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export type CityPoint = { city: string; country: string; count: number };

type GeocodeResult = { city: string; country: string; lat: number | null; lng: number | null };

async function geocodeCities(
  items: { city: string; country: string }[],
  forceRetry = false,
): Promise<GeocodeResult[]> {
  if (items.length === 0) return [];
  const { data, error } = await supabase.functions.invoke('geocode-cities', {
    body: { items, forceRetry },
  });
  if (error) throw error;
  return (data?.results ?? []) as GeocodeResult[];
}

interface Props {
  cities: CityPoint[];
}

const UserWorldMap: React.FC<Props> = ({ cities }) => {
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [10, 25],
    zoom: 1,
  });
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    city: string;
    country: string;
    count: number;
  } | null>(null);

  // Strip out unknown cities and aggregate
  const cleaned = useMemo(
    () =>
      cities.filter(
        (c) =>
          c.city &&
          c.city.toLowerCase() !== 'nieznane' &&
          c.city.toLowerCase() !== 'unknown',
      ),
    [cities],
  );

  const items = useMemo(
    () => cleaned.map((c) => ({ city: c.city, country: c.country })),
    [cleaned],
  );

  const queryKey = useMemo(
    () => ['geocode-cities', items.map((i) => `${i.city}|${i.country}`).sort().join(',')],
    [items],
  );

  const { data: geo = [], isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () => geocodeCities(items, false),
    enabled: items.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const points = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>();
    geo.forEach((g) => {
      if (g.lat != null && g.lng != null) {
        map.set(`${g.city.toLowerCase()}|${g.country.toLowerCase()}`, { lat: g.lat, lng: g.lng });
      }
    });
    return cleaned
      .map((c) => {
        const p = map.get(`${c.city.toLowerCase()}|${c.country.toLowerCase()}`);
        if (!p) return null;
        return { ...c, lat: p.lat, lng: p.lng };
      })
      .filter(Boolean) as Array<CityPoint & { lat: number; lng: number }>;
  }, [geo, cleaned]);

  const located = points.length;
  const missing = cleaned.length - located;
  const maxCount = points.reduce((m, p) => Math.max(m, p.count), 1);

  const handleZoomIn = () =>
    setPosition((p) => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }));
  const handleZoomOut = () =>
    setPosition((p) => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }));
  const handleReset = () => setPosition({ coordinates: [10, 25], zoom: 1 });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="h-4 w-4 text-primary" />
            Mapa świata użytkowników
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {cleaned.length} miast · <span className="text-emerald-600">{located} zlokalizowanych</span>
              {missing > 0 && (
                <>
                  {' '}
                  · <span className="text-amber-600">{missing} bez lokalizacji</span>
                </>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                geocodeCities(items, true).then(() => refetch())
              }
              disabled={isFetching || missing === 0}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              Odśwież
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {cleaned.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-12">
            Brak danych adresowych do wyświetlenia.
          </div>
        ) : (
          <div className="relative w-full" style={{ aspectRatio: '2 / 1' }}>
            {isFetching && points.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <ComposableMap
              projection="geoNaturalEarth1"
              projectionConfig={{ scale: 160 }}
              style={{ width: '100%', height: '100%' }}
            >
              <ZoomableGroup
                center={position.coordinates}
                zoom={position.zoom}
                onMoveEnd={(p) => setPosition(p)}
                maxZoom={8}
              >
                <Geographies geography={worldTopo as any}>
                  {({ geographies }) =>
                    geographies.map((g) => (
                      <Geography
                        key={g.rsmKey}
                        geography={g}
                        style={{
                          default: {
                            fill: 'hsl(var(--muted))',
                            stroke: 'hsl(var(--border))',
                            strokeWidth: 0.5,
                            outline: 'none',
                          },
                          hover: {
                            fill: 'hsl(var(--muted))',
                            outline: 'none',
                          },
                          pressed: { fill: 'hsl(var(--muted))', outline: 'none' },
                        }}
                      />
                    ))
                  }
                </Geographies>
                {points.map((p) => {
                  const r = 2 + Math.log2(p.count + 1) * 2.2;
                  return (
                    <Marker key={`${p.city}-${p.country}`} coordinates={[p.lng, p.lat]}>
                      <circle
                        r={r / position.zoom}
                        fill="hsl(var(--primary))"
                        fillOpacity={0.75}
                        stroke="white"
                        strokeWidth={1 / position.zoom}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={(e) => {
                          const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect();
                          setHover({
                            x: e.clientX - (rect?.left ?? 0),
                            y: e.clientY - (rect?.top ?? 0),
                            city: p.city,
                            country: p.country,
                            count: p.count,
                          });
                        }}
                        onMouseMove={(e) => {
                          const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect();
                          setHover((h) =>
                            h
                              ? { ...h, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) }
                              : h,
                          );
                        }}
                        onMouseLeave={() => setHover(null)}
                      />
                    </Marker>
                  );
                })}
              </ZoomableGroup>
            </ComposableMap>

            {/* Tooltip — wyłącznie miasto, kraj i liczba użytkowników */}
            {hover && (
              <div
                className="pointer-events-none absolute z-20 rounded-md border bg-popover text-popover-foreground px-2 py-1 text-xs shadow-md"
                style={{ left: hover.x + 12, top: hover.y + 12 }}
              >
                <div className="font-medium">
                  {hover.city}
                  {hover.country ? `, ${hover.country}` : ''}
                </div>
                <div className="text-muted-foreground">
                  {hover.count} {hover.count === 1 ? 'użytkownik' : 'użytkowników'}
                </div>
              </div>
            )}

            {/* Kontrolki zoom */}
            <div className="absolute bottom-3 right-3 flex flex-col gap-1">
              <Button size="icon" variant="secondary" className="h-7 w-7" onClick={handleZoomIn}>
                <Plus className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="secondary" className="h-7 w-7" onClick={handleZoomOut}>
                <Minus className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="secondary" className="h-7 w-7" onClick={handleReset}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>

            {/* Legenda */}
            <div className="absolute bottom-3 left-3 rounded-md border bg-popover/90 backdrop-blur px-2 py-1.5 text-[10px] text-muted-foreground">
              <div className="font-medium text-foreground mb-1">Liczba użytkowników</div>
              <div className="flex items-center gap-3">
                {[1, Math.max(2, Math.round(maxCount / 4)), maxCount].map((n, i) => {
                  const r = 2 + Math.log2(n + 1) * 2.2;
                  return (
                    <div key={i} className="flex items-center gap-1">
                      <svg width={r * 2 + 2} height={r * 2 + 2}>
                        <circle
                          cx={r + 1}
                          cy={r + 1}
                          r={r}
                          fill="hsl(var(--primary))"
                          fillOpacity={0.75}
                          stroke="white"
                          strokeWidth={1}
                        />
                      </svg>
                      <span>{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserWorldMap;
