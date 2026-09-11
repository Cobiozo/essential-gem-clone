/**
 * Stage 8 — synchroniczne rozwiązywanie nazw ikon pochodzących z bazy/CMS.
 *
 * `resolveIcon(name)` zwraca komponent ikony o dokładnie takim samym API jak
 * dotychczasowe `(LucideIcons as any)[name]`, więc miejsca użycia się nie zmieniają:
 *
 *   const Icon = resolveIcon(item.icon, Star);
 *   <Icon className="h-4 w-4" />
 *
 * Ikony z rejestru są dostępne synchronicznie (brak migotania na pierwszym renderze).
 * Nazwa spoza rejestru (np. wybrana w edytorze z pełnej listy) renderuje ikonę
 * zastępczą i podmienia się po doładowaniu pełnej biblioteki — pełna zgodność
 * funkcjonalna, bez wciągania 1311 ikon do bundla pierwszej trasy.
 */
import React, { useEffect, useState } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { iconRegistry } from './registry';

type IconComponent = React.ComponentType<LucideProps>;

const lazyResolved = new Map<string, IconComponent>();
let fullLibrary: Record<string, unknown> | null = null;
let fullLibraryPromise: Promise<Record<string, unknown>> | null = null;
const lazySubscribers = new Set<() => void>();

function loadFullLibrary(): Promise<Record<string, unknown>> {
  if (!fullLibraryPromise) {
    fullLibraryPromise = import('lucide-react').then((mod) => {
      fullLibrary = mod as unknown as Record<string, unknown>;
      lazySubscribers.forEach((fn) => fn());
      return fullLibrary;
    });
  }
  return fullLibraryPromise;
}

function pickFromLibrary(name: string): IconComponent | null {
  if (!fullLibrary) return null;
  const candidate = fullLibrary[name];
  if (typeof candidate === 'function' || (typeof candidate === 'object' && candidate !== null)) {
    return candidate as IconComponent;
  }
  return null;
}

function createLazyIcon(name: string, fallback: IconComponent): IconComponent {
  const cached = lazyResolved.get(name);
  if (cached) return cached;

  const LazyIcon: IconComponent = (props) => {
    const [Resolved, setResolved] = useState<IconComponent | null>(() => pickFromLibrary(name));

    useEffect(() => {
      if (Resolved) return;
      let active = true;
      loadFullLibrary().then(() => {
        if (!active) return;
        const found = pickFromLibrary(name);
        if (found) setResolved(() => found);
      });
      return () => {
        active = false;
      };
    }, [Resolved]);

    const Component = Resolved ?? fallback;
    return <Component {...props} />;
  };

  LazyIcon.displayName = `LazyLucideIcon(${name})`;
  lazyResolved.set(name, LazyIcon);
  return LazyIcon;
}

/**
 * Zwraca komponent ikony dla nazwy z bazy/CMS.
 * `fallback` jest używany gdy nazwa jest pusta lub nieznana.
 */
export function resolveIcon(
  name: string | null | undefined,
  fallback?: IconComponent | null
): IconComponent | null {
  if (!name || typeof name !== 'string') return fallback ?? null;

  const direct = iconRegistry[name];
  if (direct) return direct;

  // Tolerancja dla zapisów typu "info" / "arrow-right" / "LucideTicketsPlane".
  const normalized = name
    .replace(/^Lucide/, '')
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const normalizedHit = iconRegistry[normalized];
  if (normalizedHit) return normalizedHit;

  if (!fallback) return createLazyIcon(name, iconRegistry.Circle as IconComponent);
  return createLazyIcon(name, fallback);
}

export type { LucideIcon };
export { iconRegistry };
