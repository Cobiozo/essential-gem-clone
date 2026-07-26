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

export const createMarkerIcon = (count: number, color: string, muted = false) => {
  const size = markerSizeFor(count);
  return L.divIcon({
    html: `<div class="pl-point-marker${muted ? ' pl-point-marker--muted' : ''}" style="--pl-marker-color:${color};width:${size}px;height:${size}px">
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

const usersWord = (count: number) => (count === 1 ? 'użytkownik' : 'użytkowników');

/** Built lazily on first popup open — avoids generating HTML for every marker upfront. */
export const buildGroupPopupHtml = (g: LocationGroup): string => {
  const count = g.users.length;
  const norm = normalizeCountry(g.country);
  const flag = norm.flag ? `${norm.flag} ` : '';
  const names = g.users
    .slice(0, MAX_NAMES)
    .map((u) => {
      const label = escapeHtml(`${u.first_name}${u.last_initial ? ' ' + u.last_initial : ''}`.trim());
      const suffix = u.is_inactive
        ? ' <span style="opacity:.6;font-size:11px">(nieaktywny)</span>'
        : '';
      return `<li style="padding:2px 0">• ${label}${suffix}</li>`;
    })
    .join('');
  const extra =
    count > MAX_NAMES
      ? `<div style="margin-top:4px;opacity:0.7">+ ${count - MAX_NAMES} więcej</div>`
      : '';
  const streetLine = g.street ? `<div style="opacity:0.85">ul. ${escapeHtml(g.street)}</div>` : '';
  const postalLine = g.postalCode
    ? `<div style="opacity:0.85">Kod pocztowy: ${escapeHtml(g.postalCode)}</div>`
    : '';

  return `<div class="pl-popup__body">
      <div style="font-weight:600">${escapeHtml(g.city)}</div>
      <div style="opacity:0.8">${flag}${escapeHtml(g.country || '')}</div>
      ${postalLine}
      ${streetLine}
      <div style="margin:6px 0 4px;font-weight:500">${count} ${usersWord(count)}</div>
      <ul style="list-style:none;padding:0;margin:0">${names}</ul>
      ${extra}
    </div>`;
};

/** Hover tooltip for a single point — city + number of users. */
export const buildMarkerTooltipHtml = (g: LocationGroup): string =>
  `<div class="pl-map-tip">
      <span class="pl-map-tip__title">${escapeHtml(g.city)}</span>
      <span class="pl-map-tip__count">${g.users.length} ${usersWord(g.users.length)}</span>
    </div>`;

const MAX_PLACES = 8;

/** Popup shown right next to a cluster when it is clicked. */
export const buildClusterPopupHtml = (groups: LocationGroup[]): string => {
  const users = groups.reduce((acc, g) => acc + g.users.length, 0);
  const rows = groups
    .slice(0, MAX_PLACES)
    .map(
      (g) =>
        `<li style="display:flex;justify-content:space-between;gap:12px;padding:2px 0">
          <span>${escapeHtml(g.city)}</span>
          <span style="opacity:.7">${g.users.length}</span>
        </li>`,
    )
    .join('');
  const extra =
    groups.length > MAX_PLACES
      ? `<div style="margin-top:4px;opacity:.7">+ ${groups.length - MAX_PLACES} więcej</div>`
      : '';

  return `<div class="pl-popup__body">
      <div style="font-weight:600">${users} ${usersWord(users)}</div>
      <div style="opacity:.8">${groups.length} ${groups.length === 1 ? 'miejscowość' : 'miejscowości'}</div>
      <ul style="list-style:none;padding:0;margin:6px 0 0">${rows}</ul>
      ${extra}
      <button type="button" data-pl-zoom="1" class="pl-popup__zoom">Przybliż</button>
    </div>`;
};

/** Hover tooltip for a cluster — total users + number of locations. */
export const buildClusterTooltipHtml = (users: number, places: number): string =>
  `<div class="pl-map-tip">
      <span class="pl-map-tip__title">${users} ${usersWord(users)}</span>
      <span class="pl-map-tip__count">${places} ${places === 1 ? 'miejscowość' : 'miejscowości'}</span>
    </div>`;


export const buildCountryPopupHtml = (name: string, count: number, pending: number): string =>
  `<div style="font-size:12px;line-height:1.4">
      <div style="font-weight:600">${escapeHtml(name)}</div>
      <div style="margin-top:2px">${count} ${count === 1 ? 'użytkownik' : 'użytkowników'}</div>
      ${pending > 0 ? `<div style="margin-top:2px;opacity:.7">(${pending} oczekuje na lokalizację)</div>` : ''}
    </div>`;
