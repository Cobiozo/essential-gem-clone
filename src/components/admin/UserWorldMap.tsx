import React, { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from 'react-simple-maps';
import worldTopo from 'world-atlas/countries-50m.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Globe2, Plus, Minus, RotateCcw, X, Map as MapIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCountry } from '@/lib/countryFlags';

export type CityPoint = { city: string; country: string; count: number };

type GeocodeResult = { city: string; country: string; lat: number | null; lng: number | null };

async function geocodeCities(
  items: { city: string; country: string }[],
  forceRetry = false,
): Promise<{ results: GeocodeResult[]; pending: number }> {
  if (items.length === 0) return { results: [], pending: 0 };
  const { data, error } = await supabase.functions.invoke('geocode-cities', {
    body: { items, forceRetry },
  });
  if (error) throw error;
  return {
    results: (data?.results ?? []) as GeocodeResult[],
    pending: (data?.pending ?? 0) as number,
  };
}

interface Props {
  cities: CityPoint[];
}

const UserWorldMap: React.FC<Props> = ({ cities }) => {
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [19, 52],
    zoom: 4.5,
  });
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    title: string;
    lines: string[];
    count: number;
  } | null>(null);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<'classic' | 'satellite'>(() => {
    try {
      const v = localStorage.getItem('userWorldMap.style');
      return v === 'classic' ? 'classic' : 'satellite';
    } catch {
      return 'satellite';
    }
  });
  const changeMapStyle = (v: 'classic' | 'satellite') => {
    setMapStyle(v);
    try { localStorage.setItem('userWorldMap.style', v); } catch {}
  };

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

  const pollAttemptsRef = useRef(0);
  const { data, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const r = await geocodeCities(items, false);
      pollAttemptsRef.current = r.pending > 0 ? pollAttemptsRef.current + 1 : 0;
      return r;
    },
    enabled: items.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Hard cap: stop polling after 30 attempts (~2.5 min) to prevent runaway loops
    refetchInterval: (q) => {
      const d = q.state.data as { pending: number } | undefined;
      if (!d || d.pending === 0) return false;
      if (pollAttemptsRef.current >= 30) return false;
      return 5000;
    },
  });
  const geo = data?.results ?? [];
  const pending = data?.pending ?? 0;

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

  // Filter visible points by selected country
  const visiblePoints = useMemo(
    () =>
      selectedIso
        ? points.filter((p) => normalizeCountry(p.country).iso === selectedIso)
        : points,
    [points, selectedIso],
  );

  // Fetch city administrative boundaries when zoomed in close enough
  const boundariesEnabled = position.zoom >= 6 && visiblePoints.length > 0;
  const boundaryItems = useMemo(
    () => visiblePoints.slice(0, 40).map((p) => ({ city: p.city, country: p.country })),
    [visiblePoints],
  );
  const boundaryKey = useMemo(
    () => ['city-boundaries', boundaryItems.map((i) => `${i.city}|${i.country}`).sort().join(',')],
    [boundaryItems],
  );
  const { data: boundaryData } = useQuery({
    queryKey: boundaryKey,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('geocode-city-boundary', {
        body: { items: boundaryItems },
      });
      if (error) throw error;
      return (data?.results ?? []) as Array<{ city: string; country: string; geojson: any | null }>;
    },
    enabled: boundariesEnabled,
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const boundaryFeatures = useMemo(() => {
    if (!boundaryData) return null;
    const features = boundaryData
      .filter((b) => b.geojson)
      .map((b, i) => ({
        type: 'Feature' as const,
        properties: { name: b.city, country: b.country },
        geometry: b.geojson,
        rsmKey: `cb-${i}-${b.city}`,
      }));
    if (features.length === 0) return null;
    return { type: 'FeatureCollection' as const, features };
  }, [boundaryData]);
  const boundaryOpacity = Math.max(0, Math.min(1, (position.zoom - 5) / 3));

  // Clustering: group nearby points by zoom-dependent grid
  const clusters = useMemo(() => {
    const baseCell = 6;
    const cellSize = baseCell / Math.pow(position.zoom, 1.15);
    const buckets = new Map<
      string,
      { lat: number; lng: number; count: number; items: typeof visiblePoints }
    >();
    visiblePoints.forEach((p) => {
      const key = `${Math.floor(p.lng / cellSize)}|${Math.floor(p.lat / cellSize)}`;
      const ex = buckets.get(key);
      if (!ex) {
        buckets.set(key, { lat: p.lat * p.count, lng: p.lng * p.count, count: p.count, items: [p] });
      } else {
        ex.lat += p.lat * p.count;
        ex.lng += p.lng * p.count;
        ex.count += p.count;
        ex.items.push(p);
      }
    });
    return [...buckets.values()].map((b) => ({
      lat: b.lat / b.count,
      lng: b.lng / b.count,
      count: b.count,
      items: b.items,
    }));
  }, [visiblePoints, position.zoom]);

  // Smooth animated camera transitions
  const animRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const cancelAnim = () => {
    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    isAnimatingRef.current = false;
  };
  const animateTo = (
    target: { coordinates: [number, number]; zoom: number },
    duration = 700,
  ) => {
    cancelAnim();
    isAnimatingRef.current = true;
    const start = performance.now();
    let from: { coordinates: [number, number]; zoom: number } | null = null;
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now: number) => {
      if (!from) from = { coordinates: position.coordinates, zoom: position.zoom };
      const t = Math.min(1, (now - start) / duration);
      const e = ease(t);
      const lng = from.coordinates[0] + (target.coordinates[0] - from.coordinates[0]) * e;
      const lat = from.coordinates[1] + (target.coordinates[1] - from.coordinates[1]) * e;
      const logZ = Math.log(from.zoom) + (Math.log(target.zoom) - Math.log(from.zoom)) * e;
      setPosition({ coordinates: [lng, lat], zoom: Math.exp(logZ) });
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        animRef.current = null;
        isAnimatingRef.current = false;
      }
    };
    animRef.current = requestAnimationFrame(step);
  };

  const handleZoomIn = () =>
    animateTo({ coordinates: position.coordinates, zoom: Math.min(position.zoom * 2.0, 200) }, 280);
  const handleZoomOut = () =>
    animateTo({ coordinates: position.coordinates, zoom: Math.max(position.zoom / 1.8, 1) }, 280);
  const handleReset = () => {
    setSelectedIso(null);
    setSelectedLabel(null);
    animateTo({ coordinates: [19, 52], zoom: 4.5 }, 600);
  };

  const zoomToCluster = (lng: number, lat: number) =>
    animateTo({ coordinates: [lng, lat], zoom: Math.min(position.zoom * 2.2, 200) }, 600);
  const zoomToCity = (lng: number, lat: number) =>
    animateTo({ coordinates: [lng, lat], zoom: Math.max(position.zoom * 2.2, 40) }, 600);

  const handleGeographyClick = (g: any) => {
    const name = g.properties?.name as string | undefined;
    if (!name) return;
    const norm = normalizeCountry(name);
    if (!norm.iso) return; // unsupported country
    if (selectedIso === norm.iso) {
      setSelectedIso(null);
      setSelectedLabel(null);
      return;
    }
    setSelectedIso(norm.iso);
    setSelectedLabel(norm.label);
    const pts = points.filter((p) => normalizeCountry(p.country).iso === norm.iso);
    if (pts.length > 0) {
      const minLat = Math.min(...pts.map((p) => p.lat));
      const maxLat = Math.max(...pts.map((p) => p.lat));
      const minLng = Math.min(...pts.map((p) => p.lng));
      const maxLng = Math.max(...pts.map((p) => p.lng));
      const spread = Math.max(maxLat - minLat, (maxLng - minLng) / 2, 0.5);
      const zoom = Math.max(2.5, Math.min(24, 70 / spread));
      animateTo({ coordinates: [(minLng + maxLng) / 2, (minLat + maxLat) / 2], zoom }, 800);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="h-4 w-4 text-primary" />
            Mapa świata użytkowników
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span>
                Zlokalizowano <span className="text-emerald-600 font-medium">{located}</span> / {cleaned.length} miast
              </span>
              {pending > 0 && (
                <span className="flex items-center gap-1 text-sky-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Geokoduję w tle: {pending}…
                </span>
              )}
              {pending === 0 && missing > 0 && (
                <span className="text-amber-600">· {missing} bez lokalizacji</span>
              )}
            </span>
            {selectedIso && (
              <button
                type="button"
                onClick={() => {
                  setSelectedIso(null);
                  setSelectedLabel(null);
                }}
                className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/15"
              >
                <Globe2 className="h-3 w-3" />
                {selectedLabel ?? selectedIso}
                <X className="h-3 w-3" />
              </button>
            )}
            <ToggleGroup
              type="single"
              size="sm"
              value={mapStyle}
              onValueChange={(v) => v && changeMapStyle(v as 'classic' | 'satellite')}
              className="border rounded-md"
            >
              <ToggleGroupItem value="classic" aria-label="Klasyczna" className="h-7 px-2 text-[11px]">
                <MapIcon className="h-3 w-3 mr-1" />
                Klasyczna
              </ToggleGroupItem>
              <ToggleGroupItem value="satellite" aria-label="Satelitarna" className="h-7 px-2 text-[11px]">
                <Globe2 className="h-3 w-3 mr-1" />
                Satelitarna
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                pollAttemptsRef.current = 0;
                geocodeCities(items, true).then(() => refetch());
              }}
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
              key={mapStyle}
              projection={mapStyle === 'satellite' ? 'geoEquirectangular' : 'geoNaturalEarth1'}
              projectionConfig={{ scale: 160 }}
              style={{
                width: '100%',
                height: '100%',
                shapeRendering: 'geometricPrecision',
                background: mapStyle === 'satellite' ? '#0b1d2a' : 'transparent',
              }}
            >
              <ZoomableGroup
                center={position.coordinates}
                zoom={position.zoom}
                onMoveEnd={(p) => {
                  if (isAnimatingRef.current) return;
                  setPosition(p);
                }}
                maxZoom={200}
              >
                {mapStyle === 'satellite' && (
                  <image
                    href="/textures/earth-bluemarble-2k.jpg"
                    x={-180}
                    y={-90}
                    width={360}
                    height={180}
                    preserveAspectRatio="none"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                <Geographies geography={worldTopo as any}>
                  {({ geographies }) =>
                    geographies.map((g) => {
                      const iso = normalizeCountry(g.properties?.name).iso;
                      const isSelected = !!selectedIso && iso === selectedIso;
                      const dimmed = !!selectedIso && !isSelected;
                      const baseFill = isSelected
                        ? 'hsl(var(--primary) / 0.18)'
                        : mapStyle === 'satellite'
                        ? 'transparent'
                        : dimmed
                        ? 'hsl(var(--muted) / 0.35)'
                        : 'hsl(var(--muted) / 0.55)';
                      const stroke = isSelected
                        ? 'hsl(var(--primary))'
                        : mapStyle === 'satellite'
                        ? 'hsl(0 0% 100% / 0.55)'
                        : 'hsl(var(--border) / 0.7)';
                      const strokeWidth = (isSelected ? 0.7 : mapStyle === 'satellite' ? 0.35 : 0.4) / position.zoom;
                      return (
                        <Geography
                          key={g.rsmKey}
                          geography={g}
                          onClick={() => handleGeographyClick(g)}
                          style={{
                            default: {
                              fill: baseFill,
                              stroke,
                              strokeWidth,
                              strokeLinejoin: 'round',
                              outline: 'none',
                              cursor: iso ? 'pointer' : 'default',
                            },
                            hover: {
                              fill: iso && !isSelected ? 'hsl(0 0% 100% / 0.12)' : baseFill,
                              stroke,
                              strokeWidth,
                              strokeLinejoin: 'round',
                              outline: 'none',
                              cursor: iso ? 'pointer' : 'default',
                            },
                            pressed: { fill: baseFill, stroke, strokeWidth, outline: 'none' },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
                {boundaryFeatures && boundaryOpacity > 0.02 && (
                  <Geographies geography={boundaryFeatures as any}>
                    {({ geographies }) =>
                      geographies.map((g) => (
                        <Geography
                          key={g.rsmKey}
                          geography={g}
                          style={{
                            default: {
                              fill: `hsl(var(--primary) / ${0.08 * boundaryOpacity})`,
                              stroke: `hsl(var(--primary) / ${0.75 * boundaryOpacity})`,
                              strokeWidth: 0.5 / position.zoom,
                              strokeLinejoin: 'round',
                              outline: 'none',
                              pointerEvents: 'none',
                            },
                            hover: { fill: 'transparent', stroke: 'transparent', outline: 'none' },
                            pressed: { fill: 'transparent', stroke: 'transparent', outline: 'none' },
                          }}
                        />
                      ))
                    }
                  </Geographies>
                )}
                {clusters.map((c, idx) => {
                  const isCluster = c.items.length > 1;
                  const rawR = (1.0 + Math.log2(c.count + 1) * 0.6) / Math.pow(position.zoom, 0.95);
                  const r = Math.max(0.15, Math.min(3.0, rawR));
                  const strokeW = 0.35 / Math.pow(position.zoom, 0.9);
                  const onEnter = (e: React.MouseEvent) => {
                    const rect = (e.currentTarget as SVGElement).ownerSVGElement?.parentElement?.getBoundingClientRect();
                    const sorted = [...c.items].sort((a, b) => b.count - a.count);
                    const shown = sorted.slice(0, 8).map((it) => `${it.city} (${it.count})`);
                    const more = sorted.length - shown.length;
                    setHover({
                      x: e.clientX - (rect?.left ?? 0),
                      y: e.clientY - (rect?.top ?? 0),
                      title: isCluster
                        ? `${c.items.length} miast`
                        : `${sorted[0].city}${sorted[0].country ? ', ' + sorted[0].country : ''}`,
                      lines: isCluster ? [...shown, more > 0 ? `…i ${more} więcej` : ''].filter(Boolean) : [],
                      count: c.count,
                    });
                  };
                  const onMove = (e: React.MouseEvent) => {
                    const rect = (e.currentTarget as SVGElement).ownerSVGElement?.parentElement?.getBoundingClientRect();
                    setHover((h) =>
                      h ? { ...h, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) } : h,
                    );
                  };
                  return (
                    <Marker key={`cl-${idx}`} coordinates={[c.lng, c.lat]}>
                      <g
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={onEnter}
                        onMouseMove={onMove}
                        onMouseLeave={() => setHover(null)}
                        onClick={() =>
                          isCluster ? zoomToCluster(c.lng, c.lat) : zoomToCity(c.lng, c.lat)
                        }
                      >
                        <circle
                          r={r}
                          fill="hsl(var(--primary))"
                          fillOpacity={isCluster ? 0.85 : 1}
                          stroke="hsl(var(--background))"
                          strokeWidth={strokeW}
                          pointerEvents="all"
                        />
                      </g>
                    </Marker>
                  );
                })}
              </ZoomableGroup>
            </ComposableMap>

            {/* Tooltip */}
            {hover && (
              <div
                className="pointer-events-none absolute z-20 rounded-md border bg-popover text-popover-foreground px-2 py-1 text-xs shadow-md max-w-[240px]"
                style={{ left: hover.x + 12, top: hover.y + 12 }}
              >
                <div className="font-medium">{hover.title}</div>
                {hover.lines.length > 0 && (
                  <div className="text-muted-foreground mt-0.5 space-y-0.5">
                    {hover.lines.map((l, i) => (
                      <div key={i}>{l}</div>
                    ))}
                  </div>
                )}
                <div className="text-muted-foreground mt-0.5">
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
                  const r = Math.max(1.2, Math.min(3.2, 1.1 + Math.log2(n + 1) * 0.7));
                  return (
                    <div key={i} className="flex items-center gap-1">
                      <svg width={r * 2 + 2} height={r * 2 + 2}>
                        <circle
                          cx={r + 1}
                          cy={r + 1}
                          r={r}
                          fill="hsl(var(--primary))"
                          fillOpacity={0.9}
                          stroke="hsl(var(--background))"
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
