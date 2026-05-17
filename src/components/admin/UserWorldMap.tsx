import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { geoEquirectangular, geoNaturalEarth1, geoPath, type GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import worldTopo from 'world-atlas/countries-50m.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Globe2, Plus, Minus, RotateCcw, X, Map as MapIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCountry } from '@/lib/countryFlags';

export type CityPoint = { city: string; country: string; count: number };

type GeocodeResult = { city: string; country: string; lat: number | null; lng: number | null };

const VIEW_W = 800;
const VIEW_H = 420;
const MIN_ZOOM = 1;
const MAX_ZOOM = 200;

async function geocodeCities(
  items: { city: string; country: string }[],
  forceRetry = false,
): Promise<{ results: GeocodeResult[]; pending: number }> {
  if (items.length === 0) return { results: [], pending: 0 };
  try {
    const { data, error } = await supabase.functions.invoke('geocode-cities', {
      body: { items, forceRetry },
    });
    if (error) throw error;
    return {
      results: (data?.results ?? []) as GeocodeResult[],
      pending: (data?.pending ?? 0) as number,
    };
  } catch {
    return { results: [], pending: 0 };
  }
}

interface Props {
  cities: CityPoint[];
  initialMode?: 'classic' | 'satellite';
  markerColor?: string;
  showLogos?: boolean;
  showTitle?: boolean;
  customTitle?: string;
  heightPx?: number;
  hideHeaderMeta?: boolean;
  logoLeftUrl?: string;
  logoRightUrl?: string;
}

const UserWorldMap: React.FC<Props> = ({
  cities,
  initialMode,
  markerColor,
  showLogos = true,
  showTitle = true,
  customTitle,
  heightPx,
  hideHeaderMeta = false,
  logoLeftUrl,
  logoRightUrl,
}) => {
  const [mapStyle, setMapStyle] = useState<'classic' | 'satellite'>(() => {
    if (initialMode) return initialMode;
    try {
      const v = localStorage.getItem('userWorldMap.style');
      return v === 'classic' ? 'classic' : 'satellite';
    } catch {
      return 'satellite';
    }
  });
  const [textureFailed, setTextureFailed] = useState(false);
  const effectiveStyle: 'classic' | 'satellite' = mapStyle === 'satellite' && textureFailed ? 'classic' : mapStyle;
  const changeMapStyle = (v: 'classic' | 'satellite') => {
    setMapStyle(v);
    if (v === 'satellite') setTextureFailed(false);
    try { localStorage.setItem('userWorldMap.style', v); } catch {}
  };

  // Build projection (fitted) and path generator
  const { projection, pathGen, worldFeatures } = useMemo(() => {
    let features: any[] = [];
    try {
      const topoAny = worldTopo as any;
      const fc: any = feature(topoAny, topoAny.objects.countries);
      features = Array.isArray(fc?.features) ? fc.features : [];
    } catch {
      features = [];
    }
    const proj: GeoProjection = (mapStyle === 'satellite' ? geoEquirectangular() : geoNaturalEarth1());
    try {
      if (features.length > 0) {
        proj.fitSize([VIEW_W, VIEW_H], { type: 'FeatureCollection', features } as any);
      } else {
        proj.translate([VIEW_W / 2, VIEW_H / 2]).scale(140);
      }
    } catch {
      proj.translate([VIEW_W / 2, VIEW_H / 2]).scale(140);
    }
    return { projection: proj, pathGen: geoPath(proj), worldFeatures: features };
  }, [mapStyle]);

  // Default view: center on Poland-ish
  const defaultView = useMemo(() => {
    const pt = projection([19, 52]);
    return { cx: pt?.[0] ?? VIEW_W / 2, cy: pt?.[1] ?? VIEW_H / 2, zoom: 3.5 };
  }, [projection]);

  const [view, setView] = useState(defaultView);
  // Reset view when projection changes (style switch)
  useEffect(() => { setView(defaultView); }, [defaultView]);

  const [hover, setHover] = useState<{ x: number; y: number; title: string; lines: string[]; count: number } | null>(null);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // Clean cities
  const cleaned = useMemo(
    () =>
      (Array.isArray(cities) ? cities : []).filter(
        (c) => c && c.city && c.city.toLowerCase() !== 'nieznane' && c.city.toLowerCase() !== 'unknown',
      ),
    [cities],
  );

  const items = useMemo(() => cleaned.map((c) => ({ city: c.city, country: c.country })), [cleaned]);

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
    refetchInterval: (q) => {
      const d = q.state.data as { pending: number } | undefined;
      if (!d || d.pending === 0) return false;
      if (pollAttemptsRef.current >= 30) return false;
      return 5000;
    },
  });
  const geo = Array.isArray(data?.results) ? data!.results : [];
  const pending = data?.pending ?? 0;

  const points = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>();
    geo.forEach((g) => {
      if (g && typeof g.lat === 'number' && typeof g.lng === 'number' &&
          isFinite(g.lat) && isFinite(g.lng)) {
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

  const visiblePoints = useMemo(
    () => (selectedIso ? points.filter((p) => normalizeCountry(p.country).iso === selectedIso) : points),
    [points, selectedIso],
  );

  // Boundaries at high zoom
  const boundariesEnabled = view.zoom >= 6 && visiblePoints.length > 0;
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
      try {
        const { data, error } = await supabase.functions.invoke('geocode-city-boundary', { body: { items: boundaryItems } });
        if (error) throw error;
        return (data?.results ?? []) as Array<{ city: string; country: string; geojson: any | null }>;
      } catch {
        return [] as Array<{ city: string; country: string; geojson: any | null }>;
      }
    },
    enabled: boundariesEnabled,
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const boundaryPaths = useMemo(() => {
    if (!boundaryData) return [] as Array<{ key: string; d: string }>;
    const out: Array<{ key: string; d: string }> = [];
    boundaryData.forEach((b, i) => {
      if (!b?.geojson) return;
      try {
        const d = pathGen({ type: 'Feature', geometry: b.geojson, properties: {} } as any);
        if (d) out.push({ key: `cb-${i}-${b.city}`, d });
      } catch {}
    });
    return out;
  }, [boundaryData, pathGen]);
  const boundaryOpacity = Math.max(0, Math.min(1, (view.zoom - 5) / 3));

  // Country paths
  const countryPaths = useMemo(() => {
    return worldFeatures
      .map((f: any, i: number) => {
        try {
          const d = pathGen(f);
          if (!d) return null;
          const name = f?.properties?.name as string | undefined;
          const iso = name ? normalizeCountry(name).iso : null;
          return { key: `c-${i}`, d, name, iso, raw: f };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{ key: string; d: string; name?: string; iso: string | null; raw: any }>;
  }, [worldFeatures, pathGen]);

  // Clusters in lon/lat space
  const clusters = useMemo(() => {
    const baseCell = 6;
    const cellSize = baseCell / Math.pow(view.zoom, 1.15);
    const buckets = new Map<string, { lat: number; lng: number; count: number; items: typeof visiblePoints }>();
    visiblePoints.forEach((p) => {
      const key = `${Math.floor(p.lng / cellSize)}|${Math.floor(p.lat / cellSize)}`;
      const ex = buckets.get(key);
      if (!ex) buckets.set(key, { lat: p.lat * p.count, lng: p.lng * p.count, count: p.count, items: [p] });
      else { ex.lat += p.lat * p.count; ex.lng += p.lng * p.count; ex.count += p.count; ex.items.push(p); }
    });
    return [...buckets.values()].map((b) => ({ lat: b.lat / b.count, lng: b.lng / b.count, count: b.count, items: b.items }));
  }, [visiblePoints, view.zoom]);

  // Animation
  const animRef = useRef<number | null>(null);
  const cancelAnim = () => { if (animRef.current != null) { cancelAnimationFrame(animRef.current); animRef.current = null; } };
  const animateTo = (target: { cx: number; cy: number; zoom: number }, duration = 600) => {
    cancelAnim();
    const start = performance.now();
    const from = { ...view };
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = ease(t);
      const cx = from.cx + (target.cx - from.cx) * e;
      const cy = from.cy + (target.cy - from.cy) * e;
      const logZ = Math.log(from.zoom) + (Math.log(target.zoom) - Math.log(from.zoom)) * e;
      setView({ cx, cy, zoom: Math.exp(logZ) });
      if (t < 1) animRef.current = requestAnimationFrame(step);
      else animRef.current = null;
    };
    animRef.current = requestAnimationFrame(step);
  };

  const handleZoomIn = () => animateTo({ cx: view.cx, cy: view.cy, zoom: Math.min(view.zoom * 2.0, MAX_ZOOM) }, 280);
  const handleZoomOut = () => animateTo({ cx: view.cx, cy: view.cy, zoom: Math.max(view.zoom / 1.8, MIN_ZOOM) }, 280);
  const handleReset = () => {
    setSelectedIso(null);
    setSelectedLabel(null);
    animateTo(defaultView, 600);
  };

  const zoomToLngLat = (lng: number, lat: number, factor = 2.2, minZ = 0) => {
    const p = projection([lng, lat]);
    if (!p) return;
    const z = Math.min(MAX_ZOOM, Math.max(minZ, view.zoom * factor));
    animateTo({ cx: p[0], cy: p[1], zoom: z }, 600);
  };

  const handleCountryClick = (raw: any) => {
    const name = raw?.properties?.name as string | undefined;
    if (!name) return;
    const norm = normalizeCountry(name);
    if (!norm.iso) return;
    if (selectedIso === norm.iso) { setSelectedIso(null); setSelectedLabel(null); return; }
    setSelectedIso(norm.iso);
    setSelectedLabel(norm.label);
    try {
      const f = { type: 'Feature', geometry: raw.geometry, properties: {} } as any;
      const b = pathGen.bounds(f);
      const cx = (b[0][0] + b[1][0]) / 2;
      const cy = (b[0][1] + b[1][1]) / 2;
      const w = b[1][0] - b[0][0];
      const h = b[1][1] - b[0][1];
      const z = Math.max(1.5, Math.min(40, 0.9 / Math.max(w / VIEW_W, h / VIEW_H)));
      animateTo({ cx, cy, zoom: z }, 700);
    } catch {}
  };

  // Pan with pointer drag
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = rect.width / VIEW_W;
    const sy = rect.height / VIEW_H;
    const dx = (e.clientX - d.x) / (sx * view.zoom);
    const dy = (e.clientY - d.y) / (sy * view.zoom);
    setView({ cx: d.cx - dx, cy: d.cy - dy, zoom: view.zoom });
  };
  const onPointerUp = () => { dragRef.current = null; };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = Math.pow(1.0015, -e.deltaY);
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * factor));
    setView({ ...view, zoom: newZoom });
  };

  // Compute viewBox based on current view (center + zoom)
  const vbW = VIEW_W / view.zoom;
  const vbH = VIEW_H / view.zoom;
  const vbX = view.cx - vbW / 2;
  const vbY = view.cy - vbH / 2;

  const showTooltipAt = (e: React.MouseEvent, payload: { title: string; lines: string[]; count: number }) => {
    const container = (e.currentTarget as SVGElement).ownerSVGElement?.parentElement;
    const rect = container?.getBoundingClientRect();
    setHover({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0), ...payload });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="h-4 w-4 text-primary" />
            {showTitle ? (customTitle ?? 'Mapa świata użytkowników') : ''}
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {!hideHeaderMeta && (
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
                {pending === 0 && missing > 0 && <span className="text-amber-600">· {missing} bez lokalizacji</span>}
              </span>
            )}
            {selectedIso && (
              <button
                type="button"
                onClick={() => { setSelectedIso(null); setSelectedLabel(null); }}
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
            {!hideHeaderMeta && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { pollAttemptsRef.current = 0; geocodeCities(items, true).then(() => refetch()); }}
                disabled={isFetching || missing === 0}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
                Odśwież
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={heightPx ? { height: heightPx } : { aspectRatio: '2 / 1' }}>
          {isFetching && points.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {showLogos && (() => {
            const DEFAULT_LEFT = "https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png";
            const DEFAULT_RIGHT = "/lovable-uploads/eqology-ibp-logo.png";
            const leftSrc = logoLeftUrl ?? DEFAULT_LEFT;
            const rightSrc = logoRightUrl ?? (logoLeftUrl === undefined ? DEFAULT_RIGHT : "");
            if (!leftSrc && !rightSrc) return null;
            return (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-3 rounded-md bg-background/70 backdrop-blur px-3 py-1.5 border pointer-events-none">
                {leftSrc && (
                  <img src={leftSrc} alt="Logo" className="h-6 w-auto object-contain"
                       onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                )}
                {rightSrc && (
                  <>
                    <div className="h-5 w-px bg-border" />
                    <img src={rightSrc} alt="Logo" className="h-6 w-auto object-contain"
                         onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  </>
                )}
              </div>
            );
          })()}

          <svg
            ref={svgRef}
            viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
              width: '100%',
              height: '100%',
              background: mapStyle === 'satellite' ? '#0b1d2a' : 'transparent',
              cursor: dragRef.current ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
            shapeRendering="geometricPrecision"
          >
            {/* Satellite background texture */}
            {mapStyle === 'satellite' && (() => {
              const tl = projection([-180, 85]);
              const br = projection([180, -85]);
              if (!tl || !br) return null;
              return (
                <image
                  href="/textures/earth-bluemarble-2k.jpg"
                  x={tl[0]}
                  y={tl[1]}
                  width={br[0] - tl[0]}
                  height={br[1] - tl[1]}
                  preserveAspectRatio="none"
                  style={{ pointerEvents: 'none' }}
                />
              );
            })()}

            {/* Countries */}
            {countryPaths.map((c) => {
              const isSelected = !!selectedIso && c.iso === selectedIso;
              const dimmed = !!selectedIso && !isSelected;
              const baseFill = isSelected
                ? 'hsl(var(--primary) / 0.18)'
                : mapStyle === 'satellite'
                ? 'transparent'
                : dimmed
                ? 'hsl(var(--muted-foreground) / 0.2)'
                : 'hsl(var(--muted-foreground) / 0.35)';
              const stroke = isSelected
                ? 'hsl(var(--primary))'
                : mapStyle === 'satellite'
                ? 'hsl(0 0% 100% / 0.55)'
                : 'hsl(var(--muted-foreground) / 0.7)';
              const sw = (isSelected ? 0.7 : mapStyle === 'satellite' ? 0.35 : 0.6) / view.zoom;
              return (
                <path
                  key={c.key}
                  d={c.d}
                  fill={baseFill}
                  stroke={stroke}
                  strokeWidth={sw}
                  strokeLinejoin="round"
                  style={{ cursor: c.iso ? 'pointer' : 'default', outline: 'none' }}
                  onClick={() => handleCountryClick(c.raw)}
                />
              );
            })}

            {/* Boundaries */}
            {boundaryOpacity > 0.02 && boundaryPaths.map((b) => (
              <path
                key={b.key}
                d={b.d}
                fill={`hsl(var(--primary) / ${0.08 * boundaryOpacity})`}
                stroke={`hsl(var(--primary) / ${0.75 * boundaryOpacity})`}
                strokeWidth={0.5 / view.zoom}
                strokeLinejoin="round"
                pointerEvents="none"
              />
            ))}

            {/* Markers */}
            {clusters.map((c, idx) => {
              const pt = projection([c.lng, c.lat]);
              if (!pt || !isFinite(pt[0]) || !isFinite(pt[1])) return null;
              const isCluster = c.items.length > 1;
              const rawR = (1.0 + Math.log2(c.count + 1) * 0.6) / Math.pow(view.zoom, 0.95);
              const r = Math.max(0.15, Math.min(3.0, rawR));
              const strokeW = 0.35 / Math.pow(view.zoom, 0.9);
              const onEnter = (e: React.MouseEvent) => {
                const sorted = [...c.items].sort((a, b) => b.count - a.count);
                const shown = sorted.slice(0, 8).map((it) => `${it.city} (${it.count})`);
                const more = sorted.length - shown.length;
                showTooltipAt(e, {
                  title: isCluster ? `${c.items.length} miast` : `${sorted[0].city}${sorted[0].country ? ', ' + sorted[0].country : ''}`,
                  lines: isCluster ? [...shown, more > 0 ? `…i ${more} więcej` : ''].filter(Boolean) : [],
                  count: c.count,
                });
              };
              const onMove = (e: React.MouseEvent) => showTooltipAt(e, { title: hover?.title ?? '', lines: hover?.lines ?? [], count: hover?.count ?? c.count });
              return (
                <g
                  key={`cl-${idx}`}
                  transform={`translate(${pt[0]} ${pt[1]})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={onEnter}
                  onMouseMove={onMove}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => zoomToLngLat(c.lng, c.lat, 2.2, isCluster ? 0 : 40)}
                >
                  <circle
                    r={r}
                    fill={markerColor ?? (mapStyle === 'satellite' ? '#ef4444' : 'hsl(var(--primary))')}
                    fillOpacity={isCluster ? 0.9 : 1}
                    stroke={mapStyle === 'satellite' ? '#ffffff' : 'hsl(var(--background))'}
                    strokeWidth={strokeW}
                    pointerEvents="all"
                  />
                </g>
              );
            })}
          </svg>

          {hover && (
            <div
              className="pointer-events-none absolute z-20 rounded-md border bg-popover text-popover-foreground px-2 py-1 text-xs shadow-md max-w-[240px]"
              style={{ left: hover.x + 12, top: hover.y + 12 }}
            >
              <div className="font-medium">{hover.title}</div>
              {hover.lines.length > 0 && (
                <div className="text-muted-foreground mt-0.5 space-y-0.5">
                  {hover.lines.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}
              <div className="text-muted-foreground mt-0.5">
                {hover.count} {hover.count === 1 ? 'użytkownik' : 'użytkowników'}
              </div>
            </div>
          )}

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

          {cleaned.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none">
              Brak danych adresowych do wyświetlenia.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserWorldMap;
