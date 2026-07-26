import L from 'leaflet';
import { loadSanitizedCountries } from '@/lib/geoSanitize';
import {
  baseCountryStyle,
  hoverCountryStyle,
  selectedCountryStyle,
  countryIso,
  countryNamePl,
} from './constants';
import { buildCountryPopupHtml } from './markers';

export interface CountryLayerHandlers {
  /** Plotted user count for an ISO-2 code. */
  getCount: (iso: string) => number;
  /** Users of that country still awaiting geocoding. */
  getPending: (iso: string) => number;
  onSelect: (iso: string | null) => void;
  isSelected: (iso: string) => boolean;
}

/**
 * Builds the clickable country layer from sanitized (mainland-only) geometry.
 * Events are bound once on the GeoJSON layer and delegated per feature, instead
 * of attaching three listeners to each of ~240 countries.
 */
export const createCountriesLayer = async (
  map: L.Map,
  renderer: L.Renderer,
  handlers: CountryLayerHandlers,
): Promise<L.GeoJSON | null> => {
  const geojson = await loadSanitizedCountries();
  if (!geojson) return null;

  const layer = L.geoJSON(geojson as any, {
    pane: 'countries',
    renderer,
    interactive: true,
    bubblingMouseEvents: false,
    style: () => baseCountryStyle,
  } as any);

  const isoOf = (lyr: any) => countryIso(lyr?.feature?.properties || {});

  layer.on('mouseover', (e: any) => {
    const lyr = e.layer;
    if (!lyr || handlers.isSelected(isoOf(lyr))) return;
    lyr.setStyle(hoverCountryStyle);
  });

  layer.on('mouseout', (e: any) => {
    const lyr = e.layer;
    if (!lyr) return;
    if (handlers.isSelected(isoOf(lyr))) {
      lyr.setStyle(selectedCountryStyle);
      return;
    }
    try {
      layer.resetStyle(lyr);
    } catch {
      /* layer detached */
    }
  });

  layer.on('click', (e: any) => {
    const lyr = e.layer;
    if (!lyr) return;
    const props = lyr.feature?.properties || {};
    const iso = countryIso(props);

    handlers.onSelect(iso);
    lyr.setStyle(selectedCountryStyle);

    try {
      const b = lyr.getBounds();
      if (b?.isValid()) map.flyToBounds(b, { padding: [32, 32], maxZoom: 8, duration: 1.1 });
    } catch {
      /* degenerate geometry */
    }

    L.popup({ closeButton: true, className: 'pl-popup' })
      .setLatLng(e.latlng)
      .setContent(buildCountryPopupHtml(countryNamePl(props), handlers.getCount(iso), handlers.getPending(iso)))
      .openOn(map);
  });

  return layer;
};

/** Reset the styling of a previously selected country layer. */
export const resetCountryStyle = (group: L.GeoJSON | null, lyr: any) => {
  if (!group || !lyr) return;
  try {
    group.resetStyle(lyr);
  } catch {
    /* layer detached */
  }
};
