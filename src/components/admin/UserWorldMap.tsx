import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Globe2, Plus, Minus, RotateCcw, Undo2, Map as MapIcon, X } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import eqologyIbpLogo from '@/assets/eqology-ibp-logo.png';

import {
  COUNTRY_LAYER_MAX_ZOOM,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAX_VIEW_HISTORY,
  SAT_BOUNDARIES_URL,
  TILE_LAYERS,
  dur,
  prefersReducedMotion,
  selectedCountryStyle,
  type MapStyle,
  type UserLocationPoint,
  type LocationGroup,
} from './user-world-map/constants';
import { geocodeCities } from './user-world-map/geocodeCache';
import { useUserGroups } from './user-world-map/useUserGroups';
import {
  buildClusterPopupHtml,
  buildClusterTooltipHtml,
  buildGroupPopupHtml,
  buildMarkerTooltipHtml,
  clusterSizeFor,
  createClusterIcon,
  createMarkerIcon,
  markerSizeFor,
} from './user-world-map/markers';
import { createCountriesLayer, resetCountryStyle } from './user-world-map/countriesLayer';

export type { UserLocationPoint };

interface Props {
  users: UserLocationPoint[];
  initialMode?: MapStyle;
  markerColor?: string;
  showLogos?: boolean;
  showTitle?: boolean;
  customTitle?: string;
  heightPx?: number;
  hideHeaderMeta?: boolean;
  logoLeftUrl?: string;
  logoRightUrl?: string;
}

type PopupSide = 'top' | 'bottom' | 'left' | 'right';
type PopupPreference = 'auto' | 'horizontal';

interface ActiveMapPopup {
  id: string;
  kind: 'marker' | 'cluster';
  latlng: L.LatLng;
  iconHalf: number;
  html: string;
  preference: PopupPreference;
  onZoom?: () => void;
}

interface PopupLayout {
  side: PopupSide;
  left: number;
  top: number;
  maxWidth: number;
  maxHeight: number;
  arrowX: number;
  arrowY: number;
}

const clampNumber = (value: number, min: number, max: number) => {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};

const calculatePopupLayout = (
  map: L.Map,
  latlng: L.LatLng,
  iconHalf: number,
  popupEl: HTMLElement | null,
  preference: PopupPreference,
): PopupLayout => {
  const size = map?.getSize?.() ?? L.point(640, 480);
  const compact = size.x < 640;
  const pt = map.latLngToContainerPoint(latlng);

  const measured = popupEl?.getBoundingClientRect?.();
  const guard = {
    top: compact ? 54 : 64,
    bottom: compact ? 92 : 76,
    left: compact ? 8 : 12,
    right: compact ? 8 : 12,
  };
  const gap = compact ? 8 : 10;
  const maxWidth = Math.max(150, Math.min(compact ? 250 : 300, size.x - guard.left - guard.right));
  const maxHeight = Math.max(92, size.y - guard.top - guard.bottom);
  const popupW = Math.max(150, Math.min(maxWidth, Math.round(measured?.width || (compact ? 220 : 260))));
  const popupH = Math.max(72, Math.min(maxHeight, Math.round(measured?.height || 150)));

  const room = {
    right: size.x - guard.right - (pt.x + iconHalf + gap),
    left: pt.x - iconHalf - gap - guard.left,
    top: pt.y - iconHalf - gap - guard.top,
    bottom: size.y - guard.bottom - (pt.y + iconHalf + gap),
  };

  const sideCandidates: PopupSide[] =
    preference === 'horizontal'
      ? room.right >= room.left
        ? (['right', 'left', 'top', 'bottom'] as PopupSide[])
        : (['left', 'right', 'top', 'bottom'] as PopupSide[])
      : (['top', 'right', 'left', 'bottom'] as PopupSide[]).sort((a, b) => {
          const score = (s: PopupSide) => (s === 'left' || s === 'right' ? room[s] - popupW : room[s] - popupH);
          return score(b) - score(a);
        });

  const fits = (s: PopupSide) => (s === 'left' || s === 'right' ? room[s] >= popupW : room[s] >= popupH);
  const side = sideCandidates.find(fits) ?? sideCandidates[0] ?? 'top';

  let left = pt.x - popupW / 2;
  let top = pt.y - popupH - iconHalf - gap;
  if (side === 'bottom') top = pt.y + iconHalf + gap;
  if (side === 'right') {
    left = pt.x + iconHalf + gap;
    top = pt.y - popupH / 2;
  }
  if (side === 'left') {
    left = pt.x - iconHalf - gap - popupW;
    top = pt.y - popupH / 2;
  }

  left = Math.round(clampNumber(left, guard.left, size.x - guard.right - popupW));
  top = Math.round(clampNumber(top, guard.top, size.y - guard.bottom - popupH));

  return {
    side,
    left,
    top,
    maxWidth,
    maxHeight,
    arrowX: Math.round(clampNumber(pt.x - left, 16, popupW - 16)),
    arrowY: Math.round(clampNumber(pt.y - top, 16, popupH - 16)),
  };
};


const DEFAULT_LEFT_LOGO =
  'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png';

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
  const [mapStyle, setMapStyle] = useState<MapStyle>(() => {
    if (initialMode) return initialMode;
    try {
      return localStorage.getItem('userWorldMap.style') === 'classic' ? 'classic' : 'satellite';
    } catch {
      return 'satellite';
    }
  });
  const [canGoBack, setCanGoBack] = useState(false);
  const [activePopup, setActivePopup] = useState<ActiveMapPopup | null>(null);
  const [popupLayout, setPopupLayout] = useState<PopupLayout | null>(null);

  useEffect(() => {
    if (initialMode) setMapStyle(initialMode);
  }, [initialMode]);

  const changeMapStyle = useCallback((v: MapStyle) => {
    setMapStyle(v);
    try {
      localStorage.setItem('userWorldMap.style', v);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const color = markerColor || '#ef4444';

  const {
    cleanedUsers,
    items,
    groups,
    countryCounts,
    stats,
    pending,
    isFetching,
    refetch,
    resetPollAttempts,
  } = useUserGroups(users);

  // ---- Leaflet refs -------------------------------------------------------
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const boundariesOverlayRef = useRef<L.TileLayer | null>(null);
  const countriesLayerRef = useRef<L.GeoJSON | null>(null);
  const clusterRef = useRef<any>(null);
  const activeCountryLayerRef = useRef<any>(null);
  const activeCountryIsoRef = useRef<string | null>(null);
  const countryCountsRef = useRef(countryCounts);
  const viewHistoryRef = useRef<Array<{ center: L.LatLng; zoom: number }>>([]);
  const didAutoFitRef = useRef(false);
  const renderedKeysRef = useRef('');
  const popupRef = useRef<HTMLDivElement | null>(null);
  const activePopupRef = useRef<ActiveMapPopup | null>(null);

  countryCountsRef.current = countryCounts;

  const pushViewHistory = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    viewHistoryRef.current.push({ center: map.getCenter(), zoom: map.getZoom() });
    if (viewHistoryRef.current.length > MAX_VIEW_HISTORY) viewHistoryRef.current.shift();
    setCanGoBack(true);
  }, []);

  const resetActiveCountry = useCallback(() => {
    resetCountryStyle(countriesLayerRef.current, activeCountryLayerRef.current);
    activeCountryLayerRef.current = null;
    activeCountryIsoRef.current = null;
  }, []);

  /** Country polygons are only interactive at low zoom so markers stay clickable. */
  const applyCountryLayerVisibility = useCallback(() => {
    const map = mapRef.current;
    const layer = countriesLayerRef.current;
    if (!map || !layer) return;
    const enable = map.getZoom() <= COUNTRY_LAYER_MAX_ZOOM || !!activeCountryLayerRef.current;
    const present = map.hasLayer(layer as any);
    if (enable && !present) map.addLayer(layer as any);
    if (!enable && present) map.removeLayer(layer as any);
  }, []);

  /** Zoom-aware marker scale, applied via a CSS class (no React re-render). */
  const applyZoomScaleClass = useCallback(() => {
    const map = mapRef.current;
    const el = mapContainerRef.current;
    if (!map || !el) return;
    const z = map.getZoom();
    const bucket = z <= 3 ? 'sm' : z <= 6 ? 'md' : 'lg';
    if (el.dataset.zoomBucket !== bucket) el.dataset.zoomBucket = bucket;
  }, []);

  const updateActivePopupLayout = useCallback(() => {
    const map = mapRef.current;
    const popup = activePopupRef.current;
    if (!map || !popup) {
      setPopupLayout(null);
      return;
    }
    setPopupLayout(calculatePopupLayout(map, popup.latlng, popup.iconHalf, popupRef.current, popup.preference));
  }, []);

  useLayoutEffect(() => {
    activePopupRef.current = activePopup;
    if (!activePopup) {
      setPopupLayout(null);
      return;
    }

    updateActivePopupLayout();
    const raf = requestAnimationFrame(updateActivePopupLayout);
    const timeout = window.setTimeout(updateActivePopupLayout, 80);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [activePopup, updateActivePopupLayout]);

  const closeActivePopup = useCallback(() => {
    activePopupRef.current = null;
    setActivePopup(null);
  }, []);

  // ---- Init map (once) ----------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: prefersReducedMotion() ? DEFAULT_ZOOM : DEFAULT_ZOOM - 1,
      zoomControl: false,
      worldCopyJump: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      inertia: true,
      inertiaDeceleration: 2200,
    });
    mapRef.current = map;

    if (!map.getPane('countries')) {
      const pane = map.createPane('countries');
      pane.style.zIndex = '350';
    }
    const countriesRenderer = L.svg({ pane: 'countries' });

    const cfg = TILE_LAYERS[mapStyle];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
      className: 'pl-tile-layer',
    }).addTo(map);

    createCountriesLayer(map, countriesRenderer, {
      getCount: (iso) => countryCountsRef.current.located[iso] || 0,
      getPending: (iso) => countryCountsRef.current.pending[iso] || 0,
      isSelected: (iso) => activeCountryIsoRef.current === iso,
      onSelect: (iso) => {
        pushViewHistory();
        resetActiveCountry();
        activeCountryIsoRef.current = iso;
        // The clicked layer keeps its selected style; store it for later reset.
        const group = countriesLayerRef.current;
        group?.eachLayer((lyr: any) => {
          const p = lyr.feature?.properties || {};
          const layerIso = String(p.ISO_A2_EH || p.ISO_A2 || p.WB_A2 || '').toUpperCase();
          if (layerIso === iso) {
            activeCountryLayerRef.current = lyr;
            lyr.setStyle(selectedCountryStyle);
          }
        });
      },
    }).then((layer) => {
      if (!layer || !mapRef.current) return;
      countriesLayerRef.current = layer;
      layer.addTo(mapRef.current);
      applyCountryLayerVisibility();
    });

    const cluster = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: false,
      disableClusteringAtZoom: 12,
      maxClusterRadius: 50,
      animate: !prefersReducedMotion(),
      animateAddingMarkers: !prefersReducedMotion(),
      spiderfyDistanceMultiplier: 1.4,
      chunkedLoading: true,
      iconCreateFunction: (c: any) => {
        const total = c
          .getAllChildMarkers()
          .reduce((acc: number, m: any) => acc + (m.options.__count || 1), 0);
        return createClusterIcon(total, color);
      },
    });
    clusterRef.current = cluster;
    map.addLayer(cluster);

    // Double click on empty map area → smooth zoom into that exact spot.
    map.doubleClickZoom.disable();
    map.on('dblclick', (e: any) => {
      closeActivePopup();
      pushViewHistory();
      const target = Math.min(map.getMaxZoom?.() ?? 19, map.getZoom() + 2);
      if (prefersReducedMotion()) map.setView(e.latlng, target);
      else map.flyTo(e.latlng, target, { duration: 0.7 });
    });

    const syncPopupLayout = () => updateActivePopupLayout();
    map.on('move zoom resize moveend zoomend', syncPopupLayout);

    // Click on a cluster → info popup anchored right next to the cluster icon.
    cluster.on('clusterclick', (e: any) => {
      const layer = e.layer;
      const children = layer.getAllChildMarkers();
      const groupsInCluster = children
        .map((m: any) => m.options.__group)
        .filter(Boolean) as LocationGroup[];
      const users = groupsInCluster.reduce((acc, g) => acc + g.users.length, 0);
      const size = clusterSizeFor(users);
      const iconHalf = Math.round(size / 2) + 4;

      layer.closeTooltip?.();

      setActivePopup({
        id: `cluster-${layer._leaflet_id ?? Date.now()}`,
        kind: 'cluster',
        latlng: layer.getLatLng(),
        iconHalf,
        html: buildClusterPopupHtml(groupsInCluster),
        preference: 'horizontal',
        onZoom: () => {
          closeActivePopup();
          pushViewHistory();
          try {
            layer.zoomToBounds({ padding: [40, 40] });
          } catch {
            /* degenerate bounds */
          }
        },
      });
    });

    // Double click on a cluster → zoom straight into its bounds.
    cluster.on('clusterdblclick', (e: any) => {
      L.DomEvent.stop(e.originalEvent ?? e);
      closeActivePopup();
      map.closePopup();
      pushViewHistory();
      try {
        e.layer.zoomToBounds({ padding: [40, 40] });
      } catch {
        /* degenerate bounds */
      }
    });


    // Hover on a cluster → show how many users (and locations) it contains.
    cluster.on('clustermouseover', (e: any) => {
      const children = e.layer.getAllChildMarkers();
      const users = children.reduce((acc: number, m: any) => acc + (m.options.__count || 1), 0);
      e.layer
        .bindTooltip(buildClusterTooltipHtml(users, children.length), {
          direction: 'top',
          offset: [0, -14],
          opacity: 1,
          className: 'pl-map-tooltip',
        })
        .openTooltip();
    });
    cluster.on('clustermouseout', (e: any) => {
      e.layer.closeTooltip();
      e.layer.unbindTooltip();
    });


    const onZoomEnd = () => {
      applyCountryLayerVisibility();
      applyZoomScaleClass();
    };
    map.on('zoomend', onZoomEnd);
    applyZoomScaleClass();

    // Intro animation: settle into the default view.
    if (!prefersReducedMotion()) {
      window.setTimeout(() => {
        mapRef.current?.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.2, easeLinearity: 0.2 });
      }, 120);
    }

    return () => {
      map.off('zoomend', onZoomEnd);
      map.off('move zoom resize moveend zoomend', syncPopupLayout);
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      boundariesOverlayRef.current = null;
      countriesLayerRef.current = null;
      clusterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Tile layer swap with cross-fade (no flicker) -----------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const cfg = TILE_LAYERS[mapStyle];
    const previous = tileLayerRef.current;
    const next = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
      className: 'pl-tile-layer pl-tile-layer--entering',
      opacity: prefersReducedMotion() ? 1 : 0,
    }).addTo(map);
    tileLayerRef.current = next;

    const reveal = () => {
      next.setOpacity(1);
      const el = (next as any).getContainer?.() as HTMLElement | undefined;
      el?.classList.remove('pl-tile-layer--entering');
      if (previous) {
        window.setTimeout(() => {
          try {
            map.removeLayer(previous);
          } catch {
            /* already detached */
          }
        }, prefersReducedMotion() ? 0 : 420);
      }
    };
    next.once('load', reveal);
    const fallback = window.setTimeout(reveal, 1500);

    if (boundariesOverlayRef.current) {
      map.removeLayer(boundariesOverlayRef.current);
      boundariesOverlayRef.current = null;
    }
    if (mapStyle === 'satellite') {
      if (!map.getPane('satBoundaries')) {
        const p = map.createPane('satBoundaries');
        p.style.zIndex = '300';
        p.style.pointerEvents = 'none';
      }
      boundariesOverlayRef.current = L.tileLayer(SAT_BOUNDARIES_URL, {
        attribution: '',
        maxZoom: 19,
        opacity: 0.9,
        pane: 'satBoundaries',
        className: 'pl-tile-layer',
      }).addTo(map);
    }

    if (countriesLayerRef.current) {
      try {
        countriesLayerRef.current.bringToFront();
      } catch {
        /* not attached yet */
      }
      applyCountryLayerVisibility();
    }

    return () => window.clearTimeout(fallback);
  }, [mapStyle, applyCountryLayerVisibility]);

  // ---- Markers ------------------------------------------------------------
  const groupsSignature = useMemo(
    () => groups.map((g) => `${g.key}:${g.users.length}`).join(','),
    [groups],
  );

  useEffect(() => {
    const cluster = clusterRef.current;
    const map = mapRef.current;
    if (!cluster || !map) return;

    const signature = `${groupsSignature}|${color}`;
    if (renderedKeysRef.current === signature) return;
    renderedKeysRef.current = signature;

    cluster.clearLayers();
    if (groups.length === 0) return;

    const markers = groups.map((g) => {
      const count = g.users.length;
      const allInactive = g.users.every((u) => u.is_inactive);
      const iconHalf = Math.round(markerSizeFor(count) / 2);
      const marker: any = L.marker([g.lat, g.lng], {
        icon: createMarkerIcon(count, color, allInactive),
      });
      marker.options.__count = count;
      marker.options.__group = g;
      marker.on('click', () => {
        marker.closeTooltip?.();
        setActivePopup({
          id: `marker-${g.key}`,
          kind: 'marker',
          latlng: L.latLng(g.lat, g.lng),
          iconHalf,
          html: buildGroupPopupHtml(g),
          preference: 'auto',
        });
      });
      marker.bindTooltip(() => buildMarkerTooltipHtml(g), {
        direction: 'top',
        offset: [0, -12],
        opacity: 1,
        className: 'pl-map-tooltip',
      });
      // Double click on a point → zoom straight into that place.
      marker.on('dblclick', (e: any) => {
        L.DomEvent.stop(e.originalEvent ?? e);
        closeActivePopup();
        pushViewHistory();
        const target = Math.max(map.getZoom() + 2, 13);
        if (prefersReducedMotion()) map.setView([g.lat, g.lng], target);
        else map.flyTo([g.lat, g.lng], target, { duration: 0.8 });
      });
      return marker;
    });

    cluster.addLayers(markers);

    // Fit to all users once, on the first successful render of points.
    if (!didAutoFitRef.current) {
      didAutoFitRef.current = true;
      try {
        const bounds = L.latLngBounds(groups.map((g) => [g.lat, g.lng] as L.LatLngTuple));
        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 6, duration: dur(1.1) });
        }
      } catch {
        /* invalid bounds */
      }
    }
  }, [groups, groupsSignature, color, closeActivePopup, pushViewHistory]);

  // ---- Container resize ---------------------------------------------------
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    let raf = 0;
    const invalidate = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => mapRef.current?.invalidateSize());
    };
    invalidate();
    const ro = new ResizeObserver(invalidate);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [heightPx]);

  // ---- Controls -----------------------------------------------------------
  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(1, { animate: true }), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(1, { animate: true }), []);

  const handleBack = useCallback(() => {
    const map = mapRef.current;
    const prev = viewHistoryRef.current.pop();
    setCanGoBack(viewHistoryRef.current.length > 0);
    if (!map || !prev) return;
    resetActiveCountry();
    closeActivePopup();
    map.closePopup();
    map.flyTo(prev.center, prev.zoom, { duration: dur(0.9) });
    applyCountryLayerVisibility();
  }, [applyCountryLayerVisibility, closeActivePopup, resetActiveCountry]);

  const handleReset = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    pushViewHistory();
    resetActiveCountry();
    closeActivePopup();
    map.closePopup();
    applyCountryLayerVisibility();
    map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: dur(0.9) });
  }, [applyCountryLayerVisibility, closeActivePopup, pushViewHistory, resetActiveCountry]);

  const handleRefresh = useCallback(() => {
    resetPollAttempts();
    geocodeCities(items, true).then(() => refetch());
  }, [items, refetch, resetPollAttempts]);

  const leftSrc = (logoLeftUrl ?? DEFAULT_LEFT_LOGO).trim();
  const rightSrc = (logoRightUrl ?? eqologyIbpLogo).trim();

  const handlePopupClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-pl-zoom]')) activePopupRef.current?.onZoom?.();
    },
    [],
  );

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
                  Zlokalizowano{' '}
                  <span className="text-emerald-600 font-medium">{stats.locatedUsers}</span> /{' '}
                  {stats.totalUsers} użytkowników ({stats.uniqueCities} miast)
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
              onValueChange={(v) => v && changeMapStyle(v as MapStyle)}
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
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isFetching}>
                <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
                Odśwież
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="pl-map-shell relative w-full overflow-hidden rounded-md"
          style={heightPx ? { height: heightPx } : { aspectRatio: '2 / 1' }}
        >
          {isFetching && groups.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-[400]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {showLogos && (leftSrc || rightSrc) && (
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
                  {leftSrc && <div className="h-5 w-px bg-border" />}
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
          )}

          <div ref={mapContainerRef} className="pl-map-canvas absolute inset-0" />

          {activePopup && popupLayout && (
            <div
              ref={popupRef}
              className={`pl-react-popup pl-popup pl-react-popup--${popupLayout.side}`}
              style={
                {
                  left: popupLayout.left,
                  top: popupLayout.top,
                  maxWidth: popupLayout.maxWidth,
                  maxHeight: popupLayout.maxHeight,
                  '--pl-popup-arrow-x': `${popupLayout.arrowX}px`,
                  '--pl-popup-arrow-y': `${popupLayout.arrowY}px`,
                  '--pl-popup-max-h': `${Math.max(72, popupLayout.maxHeight - 28)}px`,
                } as React.CSSProperties
              }
              onClick={handlePopupClick}
              role="dialog"
              aria-label={activePopup.kind === 'cluster' ? 'Szczegóły klastra użytkowników' : 'Szczegóły miasta'}
            >
              <Button type="button" variant="ghost" size="icon" className="pl-react-popup__close" onClick={closeActivePopup} aria-label="Zamknij dymek">
                <X className="h-3.5 w-3.5" />
              </Button>
              <div className="pl-react-popup__arrow" aria-hidden="true" />
              <div dangerouslySetInnerHTML={{ __html: activePopup.html }} />
            </div>
          )}

          {/* Navigation bar, positioned before the Leaflet attribution */}
          <div className="absolute bottom-8 right-3 max-w-[calc(100%-1.5rem)] flex flex-row items-center gap-1 sm:gap-1.5 z-[500] bg-background/95 backdrop-blur rounded-md border shadow-md px-1 py-1 sm:px-1.5">
            <Button size="icon" variant="secondary" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handleZoomIn} aria-label="Przybliż">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button size="icon" variant="secondary" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handleZoomOut} aria-label="Oddal">
              <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 sm:h-10 sm:w-10"
              onClick={handleBack}
              disabled={!canGoBack}
              aria-label="Poprzedni widok"
            >
              <Undo2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button size="icon" variant="secondary" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handleReset} aria-label="Resetuj mapę">
              <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
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

export default UserWorldMap;
