import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Globe2, Plus, Minus, RotateCcw, Undo2, Map as MapIcon } from 'lucide-react';
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

/** Popup sizing/panning that adapts to the real map container size (mobile/tablet/desktop). */
const responsivePopupOptions = (map: any): L.PopupOptions => {
  const size = map?.getSize?.() ?? { x: 640, y: 480 };
  const compact = size.x < 640;
  const maxWidth = Math.max(170, Math.min(260, size.x - (compact ? 40 : 64)));
  const maxHeight = Math.max(140, Math.round(size.y * (compact ? 0.5 : 0.6)));
  const pad = compact ? 12 : 24;
  return {
    maxWidth,
    maxHeight,
    autoPan: true,
    // Extra top-left room so the popup never hides under the logo overlay.
    autoPanPaddingTopLeft: L.point(pad, compact ? 56 : 72),
    autoPanPaddingBottomRight: L.point(pad, compact ? 56 : 64),
    keepInView: true,
  };
};

type PopupSide = 'top' | 'bottom' | 'left' | 'right';

/**
 * Picks the side of the icon where the popup fits best inside the current
 * viewport: above by default, below when the point sits high in the frame, and
 * sideways when there is not enough vertical room at all.
 */
const popupPlacementFor = (
  map: any,
  latlng: L.LatLng,
  iconHalf: number,
  popupEl?: HTMLElement | null,
): { side: PopupSide; offset: L.Point } => {
  const size = map?.getSize?.() ?? L.point(640, 480);
  const compact = size.x < 640;
  const pt = map.latLngToContainerPoint(latlng);

  const measured = popupEl?.getBoundingClientRect?.();
  const popupH = Math.max(90, Math.round(measured?.height || Math.min(size.y * 0.5, 220)));
  const popupW = Math.max(160, Math.round(measured?.width || Math.min(size.x - 40, 260)));

  const topGuard = compact ? 56 : 72; // logo overlay
  const bottomGuard = compact ? 56 : 64; // attribution + nav bar
  const sideGuard = compact ? 8 : 12;
  const gap = 6;

  const roomTop = pt.y - iconHalf - topGuard;
  const roomBottom = size.y - pt.y - iconHalf - bottomGuard;

  let side: PopupSide;
  let offset: L.Point;

  if (roomTop >= popupH + gap) {
    side = 'top';
    offset = L.point(0, -(iconHalf + gap));
  } else if (roomBottom >= popupH + gap) {
    side = 'bottom';
    offset = L.point(0, popupH + iconHalf + gap);
  } else {
    // Not enough vertical room — go sideways, towards the roomier half.
    const halfH = Math.round(popupH / 2);
    const roomRight = size.x - pt.x - iconHalf;
    const roomLeft = pt.x - iconHalf;
    side = roomRight >= roomLeft ? 'right' : 'left';
    offset =
      side === 'right'
        ? L.point(Math.round(popupW / 2) + iconHalf + gap, halfH)
        : L.point(-(Math.round(popupW / 2) + iconHalf + gap), halfH);
  }

  // --- Clamp the resulting popup rectangle inside the map container ---
  // Leaflet anchors the popup so that its bottom-center sits at point + offset.
  const halfW = Math.round(popupW / 2);
  let left = pt.x + offset.x - halfW;
  let right = pt.x + offset.x + halfW;
  let bottom = pt.y + offset.y;
  let top = bottom - popupH;

  let dx = 0;
  if (left < sideGuard) dx = sideGuard - left;
  else if (right > size.x - sideGuard) dx = size.x - sideGuard - right;

  let dy = 0;
  if (top < topGuard) dy = topGuard - top;
  else if (bottom > size.y - bottomGuard) dy = size.y - bottomGuard - bottom;

  // Never push the popup so far that it covers the guard zones on both sides.
  if (popupW + 2 * sideGuard >= size.x) dx = Math.round(size.x / 2 - pt.x - offset.x);
  if (popupH + topGuard + bottomGuard >= size.y) dy = topGuard + popupH - bottom;

  offset = L.point(offset.x + dx, offset.y + dy);

  return { side, offset };
};


const applyPopupSideClass = (el: HTMLElement | null | undefined, side: PopupSide) => {
  if (!el) return;
  el.classList.remove('pl-popup--top', 'pl-popup--bottom', 'pl-popup--left', 'pl-popup--right');
  el.classList.add(`pl-popup--${side}`);
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

    // Make sure an opened popup is always fully inside the map viewport and
    // flips to the side (top/bottom/left/right) with the most free space.
    map.on('popupopen', (e: any) => {
      const opts = responsivePopupOptions(map);
      const popup = e.popup;
      const el = popup?.getElement?.() as HTMLElement | undefined;
      const size = map.getSize();
      const compact = size.x < 640;
      if (el) {
        el.style.maxWidth = `${opts.maxWidth}px`;
        // Body can never be taller than the free space inside the container.
        const free = size.y - (compact ? 56 : 72) - (compact ? 56 : 64) - 60;
        const body = el.querySelector('.pl-popup__body') as HTMLElement | null;
        if (body) body.style.setProperty('--pl-popup-max-h', `${Math.max(90, free)}px`);
      }

      const iconHalf = Number(popup?.options?.__iconHalf) || 14;

      const place = () => {
        const latlng = popup?.getLatLng?.();
        const node = popup?.getElement?.() as HTMLElement | undefined;
        if (!latlng || !node) return;
        const { side, offset } = popupPlacementFor(map, latlng, iconHalf, node);
        applyPopupSideClass(node, side);
        popup.options.offset = offset;
        try {
          popup.update();
        } catch {
          /* popup detached */
        }
      };

      // First pass on estimates, second one once the popup has its real size.
      place();
      requestAnimationFrame(place);

      window.setTimeout(() => {
        try {
          const latlng = popup.getLatLng();
          const node = popup.getElement() as HTMLElement | undefined;
          const rect = node?.getBoundingClientRect?.();
          const mapRect = map.getContainer().getBoundingClientRect();
          const fits =
            !!rect &&
            rect.left >= mapRect.left - 1 &&
            rect.right <= mapRect.right + 1 &&
            rect.top >= mapRect.top - 1 &&
            rect.bottom <= mapRect.bottom + 1;
          if (!fits) {
            map.panInside(latlng, {
              paddingTopLeft: opts.autoPanPaddingTopLeft,
              paddingBottomRight: opts.autoPanPaddingBottomRight,
            });
          }
        } catch {
          /* map removed */
        }
      }, 60);
    });


    // Double click on empty map area → smooth zoom into that exact spot.
    map.doubleClickZoom.disable();
    map.on('dblclick', (e: any) => {
      pushViewHistory();
      const target = Math.min(map.getMaxZoom?.() ?? 19, map.getZoom() + 2);
      if (prefersReducedMotion()) map.setView(e.latlng, target);
      else map.flyTo(e.latlng, target, { duration: 0.7 });
    });

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

      const popup = L.popup({
        ...responsivePopupOptions(map),
        className: 'pl-popup',
        offset: [0, -iconHalf],
      })
        .setLatLng(layer.getLatLng())
        .setContent(buildClusterPopupHtml(groupsInCluster));
      (popup.options as any).__iconHalf = iconHalf;

      popup.on('add', () => {
        const el = popup.getElement();
        el?.querySelector('[data-pl-zoom]')?.addEventListener('click', () => {
          map.closePopup(popup);
          pushViewHistory();
          try {
            layer.zoomToBounds({ padding: [40, 40] });
          } catch {
            /* degenerate bounds */
          }
        });
      });

      popup.openOn(map);
    });

    // Double click on a cluster → zoom straight into its bounds.
    cluster.on('clusterdblclick', (e: any) => {
      L.DomEvent.stop(e.originalEvent ?? e);
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
      // Lazy popup content — built only when the user opens it.
      marker.bindPopup(() => buildGroupPopupHtml(g), {
        ...responsivePopupOptions(map),
        className: 'pl-popup',
        offset: [0, -iconHalf],
        __iconHalf: iconHalf,
      } as any);
      marker.bindTooltip(() => buildMarkerTooltipHtml(g), {
        direction: 'top',
        offset: [0, -12],
        opacity: 1,
        className: 'pl-map-tooltip',
      });
      // Double click on a point → zoom straight into that place.
      marker.on('dblclick', (e: any) => {
        L.DomEvent.stop(e.originalEvent ?? e);
        marker.closePopup();
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
  }, [groups, groupsSignature, color]);

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
    map.closePopup();
    map.flyTo(prev.center, prev.zoom, { duration: dur(0.9) });
    applyCountryLayerVisibility();
  }, [applyCountryLayerVisibility, resetActiveCountry]);

  const handleReset = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    pushViewHistory();
    resetActiveCountry();
    map.closePopup();
    applyCountryLayerVisibility();
    map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: dur(0.9) });
  }, [applyCountryLayerVisibility, pushViewHistory, resetActiveCountry]);

  const handleRefresh = useCallback(() => {
    resetPollAttempts();
    geocodeCities(items, true).then(() => refetch());
  }, [items, refetch, resetPollAttempts]);

  const leftSrc = (logoLeftUrl ?? DEFAULT_LEFT_LOGO).trim();
  const rightSrc = (logoRightUrl ?? eqologyIbpLogo).trim();

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

          {/* Navigation bar, positioned before the Leaflet attribution */}
          <div className="absolute bottom-6 right-2 sm:bottom-1 sm:right-[200px] max-w-[calc(100%-1rem)] flex flex-row items-center gap-1 sm:gap-1.5 z-[500] bg-background/95 backdrop-blur rounded-md border shadow-md px-1 py-1 sm:px-1.5">
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
