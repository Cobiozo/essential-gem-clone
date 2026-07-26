import L from 'leaflet';
import { normalizeCountry } from '@/lib/countryFlags';
import type { LocationGroup } from './constants';

export function escapeHtml(s: string): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

export const markerSizeFor = (count: number) => (count < 10 ? 28 : count < 50 ? 34 : 40);
export const clusterSizeFor = (count: number) => (count < 10 ? 32 : count < 50 ? 40 : 48);

export const createMarkerIcon = (count: number, color: string) => {
  const size = markerSizeFor(count);
  return L.divIcon({
    html: `<div class="pl-point-marker" style="--pl-marker-color:${color};width:${size}px;height:${size}px">
        <span class="pl-point-marker__pulse"></span>
        <span class="pl-point-marker__value">${count}</span>
      </div>`,
    className: 'pl-point-marker-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export const createClusterIcon = (count: number, color: string) => {
  const size = clusterSizeFor(count);
  return L.divIcon({
    html: `<div class="pl-cluster" style="--pl-marker-color:${color};width:${size}px;height:${size}px">${count}</div>`,
    className: 'pl-cluster-icon',
    iconSize: [size, size],
  });
};

const MAX_NAMES = 20;

/** Built lazily on first popup open — avoids generating HTML for every marker upfront. */
export const buildGroupPopupHtml = (g: LocationGroup): string => {
  const count = g.users.length;
  const norm = normalizeCountry(g.country);
  const flag = norm.flag ? `${norm.flag} ` : '';
  const names = g.users
    .slice(0, MAX_NAMES)
    .map((u) => escapeHtml(`${u.first_name}${u.last_initial ? ' ' + u.last_initial : ''}`.trim()))
    .map((n) => `<li style="padding:2px 0">• ${n}</li>`)
    .join('');
  const extra =
    count > MAX_NAMES
      ? `<div style="margin-top:4px;opacity:0.7">+ ${count - MAX_NAMES} więcej</div>`
      : '';
  const streetLine = g.street ? `<div style="opacity:0.85">ul. ${escapeHtml(g.street)}</div>` : '';
  const postalLine = g.postalCode
    ? `<div style="opacity:0.85">Kod pocztowy: ${escapeHtml(g.postalCode)}</div>`
    : '';

  return `<div style="font-size:12px;line-height:1.5;min-width:180px;max-height:260px;overflow:auto">
      <div style="font-weight:600">${escapeHtml(g.city)}</div>
      <div style="opacity:0.8">${flag}${escapeHtml(g.country || '')}</div>
      ${postalLine}
      ${streetLine}
      <div style="margin:6px 0 4px;font-weight:500">${count} ${count === 1 ? 'użytkownik' : 'użytkowników'}</div>
      <ul style="list-style:none;padding:0;margin:0">${names}</ul>
      ${extra}
    </div>`;
};

export const buildCountryPopupHtml = (name: string, count: number, pending: number): string =>
  `<div style="font-size:12px;line-height:1.4">
      <div style="font-weight:600">${escapeHtml(name)}</div>
      <div style="margin-top:2px">${count} ${count === 1 ? 'użytkownik' : 'użytkowników'}</div>
      ${pending > 0 ? `<div style="margin-top:2px;opacity:.7">(${pending} oczekuje na lokalizację)</div>` : ''}
    </div>`;
