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

export type UserLocationPoint = {
  user_id: string;
  first_name: string;
  last_initial: string;
  city: string;
  country: string;
  street: string;
};

type GeocodeItem = { city: string; country: string; street: string };
type GeocodeResult = {
  city: string;
  country: string;
  street: string;
  lat: number | null;
  lng: number | null;
};

const GEOCODE_CACHE_KEY = 'userWorldMap.geocodeCache.v3';
type GeocodeCache = Record<string, { lat: number; lng: number; ts: number }>;

// Precision: CITY level (street intentionally ignored in the key)
const keyOf = (i: { street?: string; city: string; country: string }) =>
  `${(i.city || '').toLowerCase().trim()}|${(i.country || '').toLowerCase().trim()}`;


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
      cache[keyOf(r)] = { lat: r.lat, lng: r.lng, ts: Date.now() };
      changed = true;
    }
  });
  if (changed) writeGeocodeCache(cache);
}
function fromCacheResults(items: GeocodeItem[]): GeocodeResult[] {
  const cache = readGeocodeCache();
  return items.map((i) => {
    const hit = cache[keyOf(i)];
    return { ...i, lat: hit?.lat ?? null, lng: hit?.lng ?? null };
  });
}
async function geocodeCities(
  items: GeocodeItem[],
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
  users: UserLocationPoint[];
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
const COUNTRY_LAYER_MAX_ZOOM = 6; // above this zoom, disable country click layer so markers stay clickable

type LocationGroup = {
  key: string;
  city: string;
  country: string;
  street: string;
  lat: number;
  lng: number;
  users: UserLocationPoint[];
};

const UserWorldMap: React.FC<Props> = ({
  users,
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

  // Clean users (skip Nieznane/Unknown)
  const cleanedUsers = useMemo(
    () =>
      (Array.isArray(users) ? users : []).filter(
        (u) => u && u.city && u.city.toLowerCase() !== 'nieznane' && u.city.toLowerCase() !== 'unknown',
      ),
    [users],
  );

  // Unique geocode items (street|city|country)
  const items = useMemo<GeocodeItem[]>(() => {
    const seen = new Set<string>();
    const out: GeocodeItem[] = [];
    cleanedUsers.forEach((u) => {
      const it = { city: u.city, country: u.country, street: u.street || '' };
      const k = keyOf(it);
      if (seen.has(k)) return;
      seen.add(k);
      out.push(it);
    });
    return out;
  }, [cleanedUsers]);

  const queryKey = useMemo(
    () => ['geocode-cities-v2', items.map((i) => keyOf(i)).sort().join(',')],
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

  // Group users by geocoded coordinates
  const groups = useMemo<LocationGroup[]>(() => {
    const coordMap = new Map<string, { lat: number; lng: number }>();
    geo.forEach((g) => {
      if (g && typeof g.lat === 'number' && typeof g.lng === 'number' && isFinite(g.lat) && isFinite(g.lng)) {
        coordMap.set(keyOf(g), { lat: g.lat, lng: g.lng });
      }
    });

    const byCoord = new Map<string, LocationGroup>();
    cleanedUsers.forEach((u) => {
      const it = { city: u.city, country: u.country, street: u.street || '' };
      const coord = coordMap.get(keyOf(it));
      if (!coord) return;
      // Round to ~1m so effectively-identical addresses share a marker
      const ck = `${coord.lat.toFixed(5)}|${coord.lng.toFixed(5)}`;
      let grp = byCoord.get(ck);
      if (!grp) {
        grp = {
          key: ck,
          city: u.city,
          country: u.country,
          street: u.street || '',
          lat: coord.lat,
          lng: coord.lng,
          users: [],
        };
        byCoord.set(ck, grp);
      }
      grp.users.push(u);
    });
    return Array.from(byCoord.values());
  }, [geo, cleanedUsers]);

  const totalUsers = cleanedUsers.length;
  const locatedUsers = groups.reduce((n, g) => n + g.users.length, 0);
  const uniqueCities = new Set(cleanedUsers.map((u) => `${u.city.toLowerCase()}|${u.country.toLowerCase()}`)).size;

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const boundariesOverlayRef = useRef<L.TileLayer | null>(null);
  const countriesLayerRef = useRef<L.GeoJSON | null>(null);
  const clusterRef = useRef<any>(null);

  // Country counts — used in country popups
  const countryCountsRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const acc: Record<string, number> = {};
    cleanedUsers.forEach((u) => {
      const k = (u.country || '').toLowerCase().trim();
      if (!k) return;
      acc[k] = (acc[k] || 0) + 1;
    });
    countryCountsRef.current = acc;
  }, [cleanedUsers]);

  // Toggle country layer interactivity based on zoom
  const applyCountryLayerVisibility = () => {
    const map = mapRef.current;
    const layer = countriesLayerRef.current;
    if (!map || !layer) return;
    const zoom = map.getZoom();
    const enable = zoom <= COUNTRY_LAYER_MAX_ZOOM;
    layer.eachLayer((lyr: any) => {
      if (lyr.setStyle) {
        lyr.setStyle({
          color: 'transparent',
          weight: 0,
          fillColor: '#000',
          fillOpacity: enable ? 0.001 : 0,
          interactive: enable,
        });
      }
      // Leaflet does not re-evaluate `interactive` from setStyle for all layer types,
      // toggle DOM pointer-events instead.
      if (lyr.getElement) {
        const el = lyr.getElement();
        if (el) el.style.pointerEvents = enable ? '' : 'none';
      }
    });
  };

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

    // Country boundaries GeoJSON — invisible fill, clickable only at low zoom
    fetch('/geo/countries-110m.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .then((gj) => {
        if (!gj || !mapRef.current) return;
        const layer = L.geoJSON(gj as any, {
          style: () => ({
            color: 'transparent',
            weight: 0,
            fillColor: '#000',
            fillOpacity: 0.001,
          }),
          onEachFeature: (feature: any, lyr: any) => {
            const name =
              feature?.properties?.NAME ||
              feature?.properties?.ADMIN ||
              feature?.properties?.name ||
              '';
            lyr.on('mouseover', () => {
              if ((mapRef.current?.getZoom() ?? 0) > COUNTRY_LAYER_MAX_ZOOM) return;
              lyr.setStyle({ color: '#fbbf24', weight: 2, fillOpacity: 0.05 });
            });
            lyr.on('mouseout', () => {
              try { (countriesLayerRef.current as any)?.resetStyle(lyr); } catch {}
              applyCountryLayerVisibility();
            });
            lyr.on('click', (e: any) => {
              if ((mapRef.current?.getZoom() ?? 0) > COUNTRY_LAYER_MAX_ZOOM) return;
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
        applyCountryLayerVisibility();
      })
      .catch(() => {});

    const cluster = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 12,
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

    map.on('zoomend', applyCountryLayerVisibility);

    return () => {
      map.off('zoomend', applyCountryLayerVisibility);
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

    if (boundariesOverlayRef.current) {
      map.removeLayer(boundariesOverlayRef.current);
      boundariesOverlayRef.current = null;
    }
    if (mapStyle === 'satellite') {
      boundariesOverlayRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { attribution: '', maxZoom: 19, opacity: 0.9, pane: 'overlayPane' },
      ).addTo(map);
    }

    if (countriesLayerRef.current) {
      try { (countriesLayerRef.current as any).bringToFront(); } catch {}
      applyCountryLayerVisibility();
    }
  }, [mapStyle]);

  // Update markers when groups change
  useEffect(() => {
    const cluster = clusterRef.current;
    const map = mapRef.current;
    if (!cluster || !map) return;
    cluster.clearLayers();
    if (groups.length === 0) return;

    const markers = groups.map((g) => {
      const count = g.users.length;
      const radius = Math.max(6, Math.min(14, 5 + Math.log2(count + 1) * 2));
      const marker: any = L.circleMarker([g.lat, g.lng], {
        radius,
        color: '#ffffff',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.9,
      });
      marker.options.__count = count;
      const norm = normalizeCountry(g.country);
      const flag = norm.flag ? `${norm.flag} ` : '';
      const MAX_NAMES = 20;
      const names = g.users
        .slice(0, MAX_NAMES)
        .map((u) => escapeHtml(`${u.first_name}${u.last_initial ? ' ' + u.last_initial : ''}`.trim()))
        .map((n) => `<li style="padding:2px 0">• ${n}</li>`)
        .join('');
      const extra = g.users.length > MAX_NAMES
        ? `<div style="margin-top:4px;opacity:0.7">+ ${g.users.length - MAX_NAMES} więcej</div>`
        : '';
      const streetLine = g.street
        ? `<div style="opacity:0.85">ul. ${escapeHtml(g.street)}</div>`
        : '';
      marker.bindPopup(
        `<div style="font-size:12px;line-height:1.5;min-width:180px;max-height:260px;overflow:auto">
          <div style="font-weight:600">${escapeHtml(g.city)}</div>
          <div style="opacity:0.8">${flag}${escapeHtml(g.country || '')}</div>
          ${streetLine}
          <div style="margin:6px 0 4px;font-weight:500">${count} ${count === 1 ? 'użytkownik' : 'użytkowników'}</div>
          <ul style="list-style:none;padding:0;margin:0">${names}</ul>
          ${extra}
        </div>`,
        { maxWidth: 260 },
      );
      return marker;
    });
    cluster.addLayers(markers);
  }, [groups, color]);

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
                  Zlokalizowano <span className="text-emerald-600 font-medium">{locatedUsers}</span> / {totalUsers} użytkowników ({uniqueCities} miast)
                </span>
                {pending > 0 && (
                  <span className="flex items-center gap-1 text-sky-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Geokoduję w tle: {pending}…
                  </span>
                )}
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
                disabled={isFetching}
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
          {isFetching && groups.length === 0 && (
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

          {cleanedUsers.length === 0 && (
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
