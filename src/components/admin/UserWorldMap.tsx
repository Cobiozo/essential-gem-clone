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
import { useIsMobile } from '@/hooks/use-mobile';

export type CityPoint = { city: string; country: string; count: number };

type GeocodeResult = { city: string; country: string; lat: number | null; lng: number | null };

const VIEW_W = 800;
const VIEW_H = 420;
const MIN_ZOOM = 1;
const MAX_ZOOM = 200;

const GEOCODE_CACHE_KEY = 'userWorldMap.geocodeCache.v1';
type GeocodeCache = Record<string, { lat: number; lng: number; ts: number }>;

function readGeocodeCache(): GeocodeCache {
  try {
    const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as GeocodeCache : {};
  } catch { return {}; }
}
function writeGeocodeCache(cache: GeocodeCache) {
  try { localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache)); } catch {}
}
function mergeGeocodeCache(results: GeocodeResult[]) {
  if (!results || results.length === 0) return;
  const cache = readGeocodeCache();
  let changed = false;
  results.forEach((r) => {
    if (r && typeof r.lat === 'number' && typeof r.lng === 'number' && isFinite(r.lat) && isFinite(r.lng)) {
      const key = `${r.city.toLowerCase()}|${r.country.toLowerCase()}`;
      cache[key] = { lat: r.lat, lng: r.lng, ts: Date.now() };
      changed = true;
    }
  });
  if (changed) writeGeocodeCache(cache);
}
function fromCacheResults(items: { city: string; country: string }[]): GeocodeResult[] {
  const cache = readGeocodeCache();
  return items.map((i) => {
    const hit = cache[`${i.city.toLowerCase()}|${i.country.toLowerCase()}`];
    return { city: i.city, country: i.country, lat: hit?.lat ?? null, lng: hit?.lng ?? null };
  });
}

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
    const results = (data?.results ?? []) as GeocodeResult[];
    mergeGeocodeCache(results);
    return { results, pending: (data?.pending ?? 0) as number };
  } catch {
    // Fallback: serve from local cache so the map still shows previously-known points.
    return { results: fromCacheResults(items), pending: 0 };
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
  const isMobile = useIsMobile();
  // If admin passes initialMode, it always wins over localStorage — keeps the widget
  // deterministic across reloads and users.
  const [mapStyle, setMapStyle] = useState<'classic' | 'satellite'>(() => {
    if (initialMode) return initialMode;
    try {
      const v = localStorage.getItem('userWorldMap.style');
      return v === 'classic' ? 'classic' : 'satellite';
    } catch {
      return 'satellite';
    }
  });
  // Sync when admin changes the default mode in settings (realtime updates).
  useEffect(() => {
    if (initialMode) setMapStyle(initialMode);
  }, [initialMode]);
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
    let proj: GeoProjection;
    if (effectiveStyle === 'satellite') {
      // Fixed equirectangular: full [-180..180] x [-90..90] fits VIEW_W,
      // centered vertically. This keeps the satellite bitmap aligned with country paths.
      proj = geoEquirectangular()
        .scale(VIEW_W / (2 * Math.PI))
        .translate([VIEW_W / 2, VIEW_H / 2]);
    } else {
      proj = geoNaturalEarth1();
      try {
        if (features.length > 0) {
          proj.fitSize([VIEW_W, VIEW_H], { type: 'FeatureCollection', features } as any);
        } else {
          proj.translate([VIEW_W / 2, VIEW_H / 2]).scale(140);
        }
      } catch {
        proj.translate([VIEW_W / 2, VIEW_H / 2]).scale(140);
      }
    }
    return { projection: proj, pathGen: geoPath(proj), worldFeatures: features };
  }, [effectiveStyle]);

  // Default view: Europe centered. On mobile we zoom in much closer so the
  // initial view shows just Europe (no Africa/Atlantic visible).
  const DEFAULT_ZOOM_SATELLITE = isMobile ? 9 : 5.5;
  const DEFAULT_ZOOM_CLASSIC = isMobile ? 9 : 6.0;
  const defaultCenter: [number, number] = isMobile ? [15, 52] : [15, 50];
  const defaultView = useMemo(() => {
    const pt = projection(defaultCenter);
    const zoom = effectiveStyle === 'satellite' ? DEFAULT_ZOOM_SATELLITE : DEFAULT_ZOOM_CLASSIC;
    return { cx: pt?.[0] ?? VIEW_W / 2, cy: pt?.[1] ?? VIEW_H / 2, zoom };
  }, [projection, effectiveStyle, isMobile]);

  const [view, setView] = useState(defaultView);
  // Reset view when projection changes (style switch)
  useEffect(() => { setView(defaultView); }, [defaultView]);

  const [hover, setHover] = useState<{ x: number; y: number; title: string; lines: string[]; count: number } | null>(null);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  // Click vs drag detection
  const didDragRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const isClickSuppressed = () => Date.now() < suppressClickUntilRef.current;

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
  const safeSetView = (v: { cx: number; cy: number; zoom: number }) => {
    if (!isFinite(v.cx) || !isFinite(v.cy) || !isFinite(v.zoom)) return;
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom));
    const cx = Math.max(-VIEW_W * 2, Math.min(VIEW_W * 3, v.cx));
    const cy = Math.max(-VIEW_H * 2, Math.min(VIEW_H * 3, v.cy));
    setView({ cx, cy, zoom });
  };
  const animateTo = (target: { cx: number; cy: number; zoom: number }, duration = 600) => {
    if (!isFinite(target.cx) || !isFinite(target.cy) || !isFinite(target.zoom)) return;
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
      safeSetView({ cx, cy, zoom: Math.exp(logZ) });
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
    if (!p || !isFinite(p[0]) || !isFinite(p[1])) return;
    const z = Math.min(MAX_ZOOM, Math.max(minZ, view.zoom * factor));
    animateTo({ cx: p[0], cy: p[1], zoom: z }, 600);
  };

  const handleCountryClick = (raw: any) => {
    // Mobile: disable country selection/zoom-to-country entirely to avoid
    // iOS Safari rendering glitches on tap (NaN bounds, tap-highlight, etc.)
    if (isMobile) return;
    const name = raw?.properties?.name as string | undefined;
    if (!name) return;
    const norm = normalizeCountry(name);
    if (!norm.iso) return;
    if (selectedIso === norm.iso) { setSelectedIso(null); setSelectedLabel(null); animateTo(defaultView, 600); return; }
    try {
      const f = { type: 'Feature', geometry: raw.geometry, properties: {} } as any;
      const b = pathGen.bounds(f);
      const cx = (b[0][0] + b[1][0]) / 2;
      const cy = (b[0][1] + b[1][1]) / 2;
      const w = b[1][0] - b[0][0];
      const h = b[1][1] - b[0][1];
      if (![cx, cy, w, h].every((n) => isFinite(n)) || w <= 0 || h <= 0) return;
      const z = Math.max(1.5, Math.min(8, 0.9 / Math.max(w / VIEW_W, h / VIEW_H)));
      if (!isFinite(z)) return;
      setSelectedIso(norm.iso);
      setSelectedLabel(norm.label);
      animateTo({ cx, cy, zoom: z }, 700);
    } catch {}
  };

  // Multi-pointer pan + pinch zoom
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    mode: 'pan' | 'pinch';
    startView: { cx: number; cy: number; zoom: number };
    startCenter: { x: number; y: number };
    startDist: number;
  } | null>(null);

  const clientToViewBox = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: view.cx, y: view.cy };
    const sx = rect.width / VIEW_W;
    const sy = rect.height / VIEW_H;
    const px = (clientX - rect.left) / sx; // in 0..VIEW_W (untransformed) — but svg uses viewBox vbX/vbY/vbW/vbH
    const py = (clientY - rect.top) / sy;
    // Map preview pixel back to projection coordinates using current viewBox
    const x = vbX + (px / VIEW_W) * vbW;
    const y = vbY + (py / VIEW_H) * vbH;
    return { x, y };
  };

  const recomputeGesture = () => {
    const pts = [...pointersRef.current.values()];
    if (pts.length === 0) { gestureRef.current = null; return; }
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    let dist = 0;
    if (pts.length >= 2) {
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      dist = Math.hypot(dx, dy);
    }
    gestureRef.current = {
      mode: pts.length >= 2 ? 'pinch' : 'pan',
      startView: { ...view },
      startCenter: { x: cx, y: cy },
      startDist: dist || 1,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    cancelAnim();
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    didDragRef.current = false;
    recomputeGesture();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gestureRef.current;
    if (!g || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = rect.width / VIEW_W;
    const sy = rect.height / VIEW_H;
    const pts = [...pointersRef.current.values()];
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

    if (!didDragRef.current) {
      const ddx = cx - g.startCenter.x;
      const ddy = cy - g.startCenter.y;
      if (Math.hypot(ddx, ddy) > 4) didDragRef.current = true;
    }

    if (g.mode === 'pinch' && pts.length >= 2) {
      didDragRef.current = true;
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy) || 1;
      const ratio = dist / g.startDist;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, g.startView.zoom * ratio));
      const startVbW = VIEW_W / g.startView.zoom;
      const startVbH = VIEW_H / g.startView.zoom;
      const startVbX = g.startView.cx - startVbW / 2;
      const startVbY = g.startView.cy - startVbH / 2;
      const anchorX = startVbX + ((g.startCenter.x - rect.left) / sx / VIEW_W) * startVbW;
      const anchorY = startVbY + ((g.startCenter.y - rect.top) / sy / VIEW_H) * startVbH;
      const panDx = (cx - g.startCenter.x) / (sx * newZoom);
      const panDy = (cy - g.startCenter.y) / (sy * newZoom);
      const anchorOffsetX = ((g.startCenter.x - rect.left) / sx) - VIEW_W / 2;
      const anchorOffsetY = ((g.startCenter.y - rect.top) / sy) - VIEW_H / 2;
      const newCx = anchorX - (anchorOffsetX / newZoom) - panDx;
      const newCy = anchorY - (anchorOffsetY / newZoom) - panDy;
      setView({ cx: newCx, cy: newCy, zoom: newZoom });
    } else {
      const dx = (cx - g.startCenter.x) / (sx * g.startView.zoom);
      const dy = (cy - g.startCenter.y) / (sy * g.startView.zoom);
      setView({ cx: g.startView.cx - dx, cy: g.startView.cy - dy, zoom: g.startView.zoom });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (didDragRef.current) {
      suppressClickUntilRef.current = Date.now() + 250;
    }
    if (pointersRef.current.size === 0) {
      gestureRef.current = null;
      didDragRef.current = false;
    } else {
      recomputeGesture();
    }
  };

  // Native wheel listener with passive:false to reliably stop page scroll
  // when the cursor is over the map.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      cancelAnim();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
      const dy = e.deltaY * unit;
      const factor = Math.exp(-dy * 0.0015);
      setView((cur) => {
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cur.zoom * factor));
        if (newZoom === cur.zoom) return cur;
        const rect = el.getBoundingClientRect();
        const sx = rect.width / VIEW_W;
        const sy = rect.height / VIEW_H;
        const vbWcur = VIEW_W / cur.zoom;
        const vbHcur = VIEW_H / cur.zoom;
        const vbXcur = cur.cx - vbWcur / 2;
        const vbYcur = cur.cy - vbHcur / 2;
        const px = (e.clientX - rect.left) / sx;
        const py = (e.clientY - rect.top) / sy;
        const anchorX = vbXcur + (px / VIEW_W) * vbWcur;
        const anchorY = vbYcur + (py / VIEW_H) * vbHcur;
        const anchorOffsetX = px - VIEW_W / 2;
        const anchorOffsetY = py - VIEW_H / 2;
        return {
          cx: anchorX - anchorOffsetX / newZoom,
          cy: anchorY - anchorOffsetY / newZoom,
          zoom: newZoom,
        };
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler as any);
  }, []);

  // Compute viewBox based on current view (center + zoom)
  const _vbW = VIEW_W / view.zoom;
  const _vbH = VIEW_H / view.zoom;
  const _vbX = view.cx - _vbW / 2;
  const _vbY = view.cy - _vbH / 2;
  const vbValid = [_vbX, _vbY, _vbW, _vbH].every((n) => isFinite(n)) && _vbW > 0 && _vbH > 0;
  const vbW = vbValid ? _vbW : VIEW_W / defaultView.zoom;
  const vbH = vbValid ? _vbH : VIEW_H / defaultView.zoom;
  const vbX = vbValid ? _vbX : defaultView.cx - vbW / 2;
  const vbY = vbValid ? _vbY : defaultView.cy - vbH / 2;

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
                onClick={() => { setSelectedIso(null); setSelectedLabel(null); animateTo(defaultView, 600); }}
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
              background: effectiveStyle === 'satellite' ? '#0b1d2a' : 'transparent',
              cursor: gestureRef.current ? 'grabbing' : 'grab',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              WebkitTouchCallout: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            shapeRendering="geometricPrecision"
          >
            {/* Satellite background texture */}
            {effectiveStyle === 'satellite' && (() => {
              // Use full world bounds so the satellite bitmap aligns 1:1 with country geometry
              const tl = projection([-180, 90]);
              const br = projection([180, -90]);
              if (!tl || !br) return null;
              const w = br[0] - tl[0];
              const h = br[1] - tl[1];
              if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return null;
              return (
                <image
                  href="/textures/earth-bluemarble-2k.jpg"
                  x={tl[0]}
                  y={tl[1]}
                  width={w}
                  height={h}
                  preserveAspectRatio="none"
                  style={{ pointerEvents: 'none' }}
                  onError={() => setTextureFailed(true)}
                />
              );
            })()}

            {/* Countries */}
            {countryPaths.map((c) => {
              const isSelected = !!selectedIso && c.iso != null && c.iso === selectedIso;
              const dimmed = !!selectedIso && !isSelected;
              // No yellow flood: selected country is shown via stroke only.
              const baseFill = effectiveStyle === 'satellite'
                ? 'transparent'
                : dimmed
                ? 'hsl(var(--muted-foreground) / 0.2)'
                : 'hsl(var(--muted-foreground) / 0.35)';
              const stroke = isSelected
                ? 'hsl(var(--primary))'
                : effectiveStyle === 'satellite'
                ? 'hsl(0 0% 100% / 0.55)'
                : 'hsl(var(--muted-foreground) / 0.7)';
              const sw = (isSelected ? 1.2 : effectiveStyle === 'satellite' ? 0.35 : 0.6) / view.zoom;
              return (
                <path
                  key={c.key}
                  d={c.d}
                  fill={baseFill}
                  stroke={stroke}
                  strokeWidth={sw}
                  strokeLinejoin="round"
                  tabIndex={-1}
                  style={{
                    cursor: c.iso && !isMobile ? 'pointer' : 'default',
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                  }}
                  onClick={isMobile ? undefined : () => { if (isClickSuppressed()) return; handleCountryClick(c.raw); }}
                />
              );
            })}

            {/* Boundaries — stroke only, no fill (prevents yellow flood when polygons overlap or are oversized) */}
            {boundaryOpacity > 0.02 && boundaryPaths.map((b) => (
              <path
                key={b.key}
                d={b.d}
                fill="none"
                stroke={`hsl(var(--primary) / ${0.6 * boundaryOpacity})`}
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
              const sorted = [...c.items].sort((a, b) => b.count - a.count);
              const shown = sorted.slice(0, 8).map((it) => `${it.city} (${it.count})`);
              const more = sorted.length - shown.length;
              const tipTitle = isCluster
                ? `${c.items.length} miast`
                : `${sorted[0].city}${sorted[0].country ? ', ' + sorted[0].country : ''}`;
              const tipLines = isCluster
                ? [...shown, more > 0 ? `…i ${more} więcej` : ''].filter(Boolean)
                : [];
              const showTip = (e: React.MouseEvent) =>
                showTooltipAt(e, { title: tipTitle, lines: tipLines, count: c.count });
              return (
                <g
                  key={`cl-${idx}`}
                  transform={`translate(${pt[0]} ${pt[1]})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={showTip}
                  onMouseMove={showTip}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => { if (isClickSuppressed()) return; zoomToLngLat(c.lng, c.lat, 2.2, isCluster ? 0 : 40); }}
                >
                  <circle
                    r={r}
                    fill={markerColor ?? (effectiveStyle === 'satellite' ? '#ef4444' : 'hsl(var(--primary))')}
                    fillOpacity={isCluster ? 0.9 : 1}
                    stroke={effectiveStyle === 'satellite' ? '#ffffff' : 'hsl(var(--background))'}
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
