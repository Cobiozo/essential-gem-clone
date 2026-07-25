import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Globe2, Plus, Minus, RotateCcw, Map as MapIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCountry } from '@/lib/countryFlags';

export type CityPoint = { city: string; country: string; count: number };
type GeocodeResult = { city: string; country: string; lat: number | null; lng: number | null };

const GEOCODE_CACHE_KEY = 'userWorldMap.geocodeCache.v1';
type GeocodeCache = Record<string, { lat: number; lng: number; ts: number }>;

function readGeocodeCache(): GeocodeCache {
  try {
    const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as GeocodeCache) : {};
  } catch {
    return {};
  }
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
      cache[`${r.city.toLowerCase()}|${r.country.toLowerCase()}`] = { lat: r.lat, lng: r.lng, ts: Date.now() };
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

const TILE_LAYERS = {
  classic: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 19,
  },
};

const DEFAULT_CENTER: L.LatLngTuple = [52, 15];
const DEFAULT_ZOOM = 4;

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
  useEffect(() => {
    if (initialMode) setMapStyle(initialMode);
  }, [initialMode]);
  const changeMapStyle = (v: 'classic' | 'satellite') => {
    setMapStyle(v);
    try { localStorage.setItem('userWorldMap.style', v); } catch {}
  };

  const color = markerColor || '#ef4444';

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
      if (g && typeof g.lat === 'number' && typeof g.lng === 'number' && isFinite(g.lat) && isFinite(g.lng)) {
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

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const boundariesOverlayRef = useRef<L.TileLayer | null>(null);
  const countriesLayerRef = useRef<L.GeoJSON | null>(null);
  const clusterRef = useRef<any>(null);

  // Country counts (aggregated from points) — used in country popups
  const countryCountsRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const acc: Record<string, number> = {};
    points.forEach((p) => {
      const k = (p.country || '').toLowerCase().trim();
      if (!k) return;
      acc[k] = (acc[k] || 0) + p.count;
    });
    countryCountsRef.current = acc;
  }, [points]);

  // Init map (once)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      worldCopyJump: true,
      preferCanvas: true,
    });
    mapRef.current = map;

    const cfg = TILE_LAYERS[mapStyle];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);

    // Country boundaries GeoJSON — invisible fill, clickable, hover outline
    fetch('/geo/countries-110m.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .then((gj) => {
        if (!gj || !mapRef.current) return;
        const layer = L.geoJSON(gj as any, {
          style: () => ({
            color: 'transparent',
            weight: 0,
            fillColor: '#000',
            fillOpacity: 0.001, // effectively invisible, but clickable
          }),
          onEachFeature: (feature: any, lyr: any) => {
            const name =
              feature?.properties?.NAME ||
              feature?.properties?.ADMIN ||
              feature?.properties?.name ||
              '';
            lyr.on('mouseover', () => {
              lyr.setStyle({ color: '#fbbf24', weight: 2, fillOpacity: 0.05 });
            });
            lyr.on('mouseout', () => {
              try { (countriesLayerRef.current as any)?.resetStyle(lyr); } catch {}
            });
            lyr.on('click', (e: any) => {
              try {
                const b = lyr.getBounds();
                if (b && b.isValid()) {
                  mapRef.current!.flyToBounds(b, { padding: [20, 20], duration: 0.6 });
                }
              } catch {}
              const key = (name || '').toLowerCase().trim();
              const cnt = countryCountsRef.current[key] || 0;
              L.popup({ closeButton: true })
                .setLatLng(e.latlng)
                .setContent(
                  `<div style="font-size:12px;line-height:1.4">
                    <div style="font-weight:600">${escapeHtml(name)}</div>
                    <div style="margin-top:2px">${cnt} ${cnt === 1 ? 'użytkownik' : 'użytkowników'}</div>
                  </div>`,
                )
                .openOn(mapRef.current!);
            });
          },
        });
        countriesLayerRef.current = layer;
        layer.addTo(mapRef.current);
      })
      .catch(() => {});

    const cluster = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50,
      iconCreateFunction: (c: any) => {
        const total = c.getAllChildMarkers().reduce((acc: number, m: any) => acc + (m.options.__count || 1), 0);
        const size = total < 10 ? 32 : total < 50 ? 40 : 48;
        return L.divIcon({
          html: `<div class="pl-cluster" style="width:${size}px;height:${size}px;background:${color};box-shadow:0 0 0 4px ${color}55;">${total}</div>`,
          className: 'pl-cluster-icon',
          iconSize: [size, size],
        });
      },
    });
    clusterRef.current = cluster;
    map.addLayer(cluster);

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      boundariesOverlayRef.current = null;
      countriesLayerRef.current = null;
      clusterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap tile layer when style changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const cfg = TILE_LAYERS[mapStyle];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);
  }, [mapStyle]);

  // Update markers when points change
  useEffect(() => {
    const cluster = clusterRef.current;
    const map = mapRef.current;
    if (!cluster || !map) return;
    cluster.clearLayers();
    if (points.length === 0) return;

    const markers = points.map((p) => {
      const radius = Math.max(6, Math.min(14, 5 + Math.log2(p.count + 1) * 2));
      const marker: any = L.circleMarker([p.lat, p.lng], {
        radius,
        color: '#ffffff',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.85,
      });
      marker.options.__count = p.count;
      const norm = normalizeCountry(p.country);
      const flag = norm.flag ? `${norm.flag} ` : '';
      marker.bindPopup(
        `<div style="font-size:12px;line-height:1.4">
          <div style="font-weight:600">${escapeHtml(p.city)}</div>
          <div style="opacity:0.8">${flag}${escapeHtml(p.country || '')}</div>
          <div style="margin-top:4px">${p.count} ${p.count === 1 ? 'użytkownik' : 'użytkowników'}</div>
        </div>`,
      );
      return marker;
    });
    cluster.addLayers(markers);

    // Fit bounds once, on first successful load
    if (!initialFitDoneRef.current) {
      try {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as L.LatLngTuple));
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.2), { maxZoom: 6 });
          initialFitDoneRef.current = true;
        }
      } catch {}
    }
  }, [points, color]);

  // Ensure size is right when height/container changes
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [heightPx]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleReset = () => {
    const map = mapRef.current;
    if (!map) return;
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as L.LatLngTuple));
      if (bounds.isValid()) {
        map.flyToBounds(bounds.pad(0.2), { maxZoom: 6, duration: 0.6 });
        return;
      }
    }
    map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.6 });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="h-4 w-4 text-primary" />
            {showTitle ? customTitle ?? 'Mapa świata użytkowników' : ''}
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
                onClick={() => {
                  pollAttemptsRef.current = 0;
                  geocodeCities(items, true).then(() => refetch());
                }}
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
        <div
          className="relative w-full overflow-hidden rounded-md"
          style={heightPx ? { height: heightPx } : { aspectRatio: '2 / 1' }}
        >
          {isFetching && points.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-[400]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {showLogos &&
            (() => {
              const DEFAULT_LEFT =
                'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png';
              const DEFAULT_RIGHT = '/lovable-uploads/eqology-ibp-logo.png';
              const leftSrc = logoLeftUrl ?? DEFAULT_LEFT;
              const rightSrc = logoRightUrl ?? (logoLeftUrl === undefined ? DEFAULT_RIGHT : '');
              if (!leftSrc && !rightSrc) return null;
              return (
                <div className="absolute top-3 left-3 z-[500] flex items-center gap-3 rounded-md bg-background/70 backdrop-blur px-3 py-1.5 border pointer-events-none">
                  {leftSrc && (
                    <img
                      src={leftSrc}
                      alt="Logo"
                      className="h-6 w-auto object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  {rightSrc && (
                    <>
                      <div className="h-5 w-px bg-border" />
                      <img
                        src={rightSrc}
                        alt="Logo"
                        className="h-6 w-auto object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })()}

          <div ref={mapContainerRef} className="absolute inset-0" />

          <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-[500]">
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
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none z-[400]">
              Brak danych adresowych do wyświetlenia.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

export default UserWorldMap;
