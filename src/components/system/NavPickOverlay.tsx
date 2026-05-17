import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * NavPickOverlay — aktywne tylko gdy URL zawiera ?__navpick=1
 * Przechwytuje kliknięcia (capture) i wysyła wybrany cel do okna parent (admin picker).
 */
const NavPickOverlay: React.FC = () => {
  const location = useLocation();
  const active = new URLSearchParams(location.search).get('__navpick') === '1';
  const [hint, setHint] = useState<string>('Kliknij element, który ma być celem ikony paska');

  useEffect(() => {
    if (!active) return;

    const resolveTarget = (el: HTMLElement): { path: string; label: string } | null => {
      // 1) Explicit override
      const navTargetEl = el.closest('[data-nav-target]') as HTMLElement | null;
      if (navTargetEl) {
        const path = navTargetEl.getAttribute('data-nav-target')!;
        const label = navTargetEl.getAttribute('data-nav-label')
          || navTargetEl.innerText?.trim().slice(0, 40)
          || path;
        return { path, label };
      }

      // 2) Anchor link
      const a = el.closest('a[href]') as HTMLAnchorElement | null;
      if (a) {
        const href = a.getAttribute('href') || '';
        if (href.startsWith('/') && !href.startsWith('//')) {
          return { path: href, label: a.innerText?.trim().slice(0, 40) || href };
        }
      }

      // 3) shadcn Tabs trigger
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

      // 4) Element with id → pathname#id
      const withId = el.closest('[id]') as HTMLElement | null;
      if (withId && withId.id && !withId.id.startsWith('radix-')) {
        return {
          path: `${location.pathname}#${withId.id}`,
          label: withId.innerText?.trim().slice(0, 40) || withId.id,
        };
      }

      return { path: location.pathname, label: location.pathname };
    };

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // pozwól na interakcję z naszym własnym overlay-em
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
      } catch {
        // ignore
      }
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [active, location.pathname, location.search]);

  if (!active) return null;

  return (
    <div
      data-navpick-overlay
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
    >
      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg text-xs font-medium border border-primary-foreground/20 max-w-[90vw] truncate">
        🎯 Tryb wskazywania — {hint}
      </div>
    </div>
  );
};

export default NavPickOverlay;
