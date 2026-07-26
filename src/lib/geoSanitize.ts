/**
 * Universal GeoJSON sanitizer for country outlines.
 *
 * Many world datasets store a country as a MultiPolygon that includes overseas
 * departments, dependencies and remote islands (France + French Guiana, Norway +
 * Svalbard, Denmark + Greenland, Spain + Canary Islands, ...). Highlighting such a
 * feature paints unrelated parts of the globe and breaks `getBounds()`-based zooming.
 *
 * Strategy (no per-country exceptions):
 *  1. Rank every polygon of a MultiPolygon by approximate geodesic area.
 *  2. The largest polygon is the mainland "core".
 *  3. Keep a polygon only when it is close enough to the core AND large enough
 *     relative to it. Everything else (overseas territories, micro exclaves) is dropped.
 */

type Ring = number[][];
type PolygonCoords = Ring[];
type Geometry =
  | { type: 'Polygon'; coordinates: PolygonCoords }
  | { type: 'MultiPolygon'; coordinates: PolygonCoords[] }
  | { type: string; coordinates: unknown };

export interface GeoFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: Geometry | null;
}

export interface GeoFeatureCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

/** Max distance (km) between a secondary polygon and the mainland core. */
const MAX_DISTANCE_KM = 1000;
/** Minimum area of a secondary polygon relative to the mainland core. */
const MIN_RELATIVE_AREA = 0.01;

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Approximate planar area of a ring, corrected for latitude convergence. */
const ringArea = (ring: Ring): number => {
  if (!Array.isArray(ring) || ring.length < 3) return 0;
  let latSum = 0;
  for (const [, lat] of ring) latSum += lat;
  const cos = Math.max(0.05, Math.cos(toRad(latSum / ring.length)));

  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2) * cos;
};

const ringCentroid = (ring: Ring): [number, number] => {
  let lng = 0;
  let lat = 0;
  for (const [x, y] of ring) {
    lng += x;
    lat += y;
  }
  return [lng / ring.length, lat / ring.length];
};

const haversineKm = (a: [number, number], b: [number, number]): number => {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Keep only the mainland core (plus nearby, non-trivial polygons) of a feature. */
export const mainlandGeometry = (geometry: Geometry | null): Geometry | null => {
  if (!geometry) return null;
  if (geometry.type !== 'MultiPolygon') return geometry;

  const polygons = (geometry.coordinates as PolygonCoords[]).filter(
    (p) => Array.isArray(p) && Array.isArray(p[0]) && p[0].length >= 3,
  );
  if (polygons.length <= 1) return geometry;

  const stats = polygons.map((poly) => ({
    poly,
    area: ringArea(poly[0]),
    centroid: ringCentroid(poly[0]),
  }));

  const core = stats.reduce((best, cur) => (cur.area > best.area ? cur : best), stats[0]);

  const kept = stats
    .filter(
      (s) =>
        s === core ||
        (haversineKm(s.centroid, core.centroid) <= MAX_DISTANCE_KM &&
          s.area >= core.area * MIN_RELATIVE_AREA),
    )
    .map((s) => s.poly);

  if (kept.length === 1) return { type: 'Polygon', coordinates: kept[0] };
  return { type: 'MultiPolygon', coordinates: kept };
};

/** Sanitize a whole FeatureCollection. Pure — safe to memoize by source reference. */
export const sanitizeCountries = (fc: GeoFeatureCollection): GeoFeatureCollection => ({
  type: 'FeatureCollection',
  features: (fc?.features ?? [])
    .map((f) => ({ ...f, geometry: mainlandGeometry(f.geometry) }))
    .filter((f) => !!f.geometry),
});

let cache: Promise<GeoFeatureCollection | null> | null = null;

/**
 * Fetch + sanitize the country outlines exactly once per page session.
 * Repeated mounts of the map reuse the already-computed geometry.
 */
export const loadSanitizedCountries = (
  url = '/geo/countries-50m.geojson',
): Promise<GeoFeatureCollection | null> => {
  if (!cache) {
    cache = fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((gj) => (gj ? sanitizeCountries(gj as GeoFeatureCollection) : null))
      .catch(() => null);
  }
  return cache;
};
