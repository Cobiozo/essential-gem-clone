import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * NavPickOverlay — aktywne tylko gdy URL zawiera ?__navpick=1.
 * - Przechwytuje kliknięcia (capture) i wysyła wybrany cel do okna parent.
 * - Wysyła też NAV_LOCATION przy każdej zmianie trasy, żeby parent znał bieżący adres.
 * - Podświetla element pod kursorem (outline).
 */
const NavPickOverlay: React.FC = () => {
  const location = useLocation();
  const active = new URLSearchParams(location.search).get('__navpick') === '1';
  const [hint, setHint] = useState<string>('Kliknij element lub użyj „Użyj bieżącej strony"');
  const lastHoverRef = useRef<HTMLElement | null>(null);

  // Wysyłaj bieżącą lokalizację do parenta
  useEffect(() => {
    if (!active) return;
    try {
      const path = location.pathname + (location.search ? location.search.replace(/[?&]__navpick=1/g, '').replace(/^&/, '?') : '');
      window.parent?.postMessage(
        {
          type: 'NAV_LOCATION',
          path: path || location.pathname,
          title: document.title?.replace(/\s*[\|·–-].*$/, '').trim() || location.pathname,
        },
        window.location.origin
      );
    } catch { /* ignore */ }
  }, [active, location.pathname, location.search]);

  useEffect(() => {
    if (!active) return;

    const cleanPath = () => {
      const search = location.search.replace(/[?&]__navpick=1/g, '').replace(/^&/, '?');
      return location.pathname + (search.length > 1 ? search : '');
    };

    const resolveTarget = (el: HTMLElement): { path: string; label: string } | null => {
      const navTargetEl = el.closest('[data-nav-target]') as HTMLElement | null;
      if (navTargetEl) {
        const path = navTargetEl.getAttribute('data-nav-target')!;
        const label = navTargetEl.getAttribute('data-nav-label')
          || navTargetEl.innerText?.trim().slice(0, 40)
          || path;
        return { path, label };
      }

      const a = el.closest('a[href]') as HTMLAnchorElement | null;
      if (a) {
        const href = a.getAttribute('href') || '';
        if (href.startsWith('/') && !href.startsWith('//')) {
          return { path: href, label: a.innerText?.trim().slice(0, 40) || href };
        }
      }

      const tab = el.closest('[role="tab"]') as HTMLElement | null;
      if (tab) {
        const value = tab.getAttribute('data-value') || tab.getAttribute('value') || tab.getAttribute('data-state-value');
        if (value) {
          const sep = location.pathname.includes('?') ? '&' : '?';
          return {
            path: `${location.pathname}${sep}tab=${encodeURIComponent(value)}`,
            label: tab.innerText?.trim().slice(0, 40) || value,
          };
        }
      }

      const withId = el.closest('[id]') as HTMLElement | null;
      if (withId && withId.id && !withId.id.startsWith('radix-')) {
        return {
          path: `${cleanPath()}#${withId.id}`,
          label: withId.innerText?.trim().slice(0, 40) || withId.id,
        };
      }

      // fallback — bieżąca strona
      return {
        path: cleanPath(),
        label: document.title?.replace(/\s*[\|·–-].*$/, '').trim() || cleanPath(),
      };
    };

    const findHighlightable = (el: HTMLElement): HTMLElement | null => {
      return (
        el.closest('[data-nav-target]') as HTMLElement | null
        || el.closest('a[href]') as HTMLElement | null
        || el.closest('[role="tab"]') as HTMLElement | null
        || el.closest('button') as HTMLElement | null
      );
    };

    const clearHover = () => {
      if (lastHoverRef.current) {
        lastHoverRef.current.style.outline = '';
        lastHoverRef.current.style.outlineOffset = '';
        lastHoverRef.current = null;
      }
    };

    const onMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-navpick-overlay]')) { clearHover(); return; }
      const candidate = findHighlightable(target) || target;
      if (candidate === lastHoverRef.current) return;
      clearHover();
      candidate.style.outline = '2px solid hsl(var(--primary))';
      candidate.style.outlineOffset = '2px';
      lastHoverRef.current = candidate;
    };

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-navpick-overlay]')) return;

      e.preventDefault();
      e.stopPropagation();

      const picked = resolveTarget(target);
      if (!picked) return;

      setHint(`Wybrano: ${picked.label} → ${picked.path}`);

      try {
        window.parent?.postMessage(
          { type: 'NAV_PICK', path: picked.path, label: picked.label },
          window.location.origin
        );
      } catch { /* ignore */ }
    };

    document.addEventListener('click', handler, true);
    document.addEventListener('mousemove', onMove, true);
    return () => {
      document.removeEventListener('click', handler, true);
      document.removeEventListener('mousemove', onMove, true);
      clearHover();
    };
  }, [active, location.pathname, location.search]);

  if (!active) return null;

  return (
    <div
      data-navpick-overlay
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
    >
      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg text-xs font-medium border border-primary-foreground/20 max-w-[90vw] truncate">
        🎯 {hint}
      </div>
    </div>
  );
};

export default NavPickOverlay;
