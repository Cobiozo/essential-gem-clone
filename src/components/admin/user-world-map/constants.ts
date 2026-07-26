import type L from 'leaflet';

export type UserLocationPoint = {
  user_id: string;
  first_name: string;
  last_initial: string;
  city: string;
  country: string;
  street: string;
  postal_code?: string;
  /** Konto zablokowane automatycznie (nieaktywność) lub nieaktywne. */
  is_inactive?: boolean;
};

export type LocationGroup = {
  key: string;
  city: string;
  country: string;
  street: string;
  postalCode: string;
  lat: number;
  lng: number;
  users: UserLocationPoint[];
};

export type MapStyle = 'classic' | 'satellite';

export const TILE_LAYERS: Record<MapStyle, { url: string; attribution: string; maxZoom: number }> = {
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

export const SAT_BOUNDARIES_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

export const DEFAULT_CENTER: [number, number] = [52, 15];
export const DEFAULT_ZOOM = 4;
/** Above this zoom the country layer is detached so markers stay clickable. */
export const COUNTRY_LAYER_MAX_ZOOM = 6;
export const MAX_VIEW_HISTORY = 10;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

/** Animation duration in seconds, collapsed to ~0 when reduced motion is requested. */
export const dur = (seconds: number) => (prefersReducedMotion() ? 0 : seconds);

export const baseCountryStyle: L.PathOptions = {
  color: '#94a3b8',
  weight: 0.8,
  opacity: 0.55,
  fillColor: '#000000',
  fillOpacity: 0.01,
  className: 'pl-country',
};

export const hoverCountryStyle: L.PathOptions = {
  color: '#fbbf24',
  weight: 2,
  opacity: 1,
  fillColor: '#fbbf24',
  fillOpacity: 0.1,
  className: 'pl-country pl-country--hover',
};

export const selectedCountryStyle: L.PathOptions = {
  color: '#facc15',
  weight: 3,
  opacity: 1,
  fillColor: '#facc15',
  fillOpacity: 0.12,
  className: 'pl-country pl-country--active',
};

export const countryNamePl = (properties: Record<string, any>) => {
  const iso = String(properties.ISO_A2_EH || properties.ISO_A2 || properties.WB_A2 || '').toUpperCase();
  return String(
    properties.NAME_PL ||
      properties.NAME_LONG_PL ||
      properties.ADMIN_PL ||
      (iso === 'PL' ? 'Polska' : '') ||
      properties.NAME ||
      properties.ADMIN ||
      'Wybrany kraj',
  );
};

export const countryIso = (properties: Record<string, any>) =>
  String(properties.ISO_A2_EH || properties.ISO_A2 || properties.WB_A2 || '').toUpperCase();
