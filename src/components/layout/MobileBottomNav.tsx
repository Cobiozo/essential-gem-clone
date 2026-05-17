import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileBottomNav } from '@/hooks/useMobileBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Paths where the bottom nav should NOT appear (public/guest flows, fullscreen pages)
const HIDDEN_PREFIXES = [
  '/auth',
  '/reset-password',
  '/change-password',
  '/e/',
  '/event-form/',
  '/events/register',
  '/infolink/',
  '/zdrowa-wiedza/player',
  '/zdrowa-wiedza/',
  '/auto-webinar',
  '/meeting/',
  '/page/',
  '/html/',
  '/moja-strona',
];

const MobileBottomNav: React.FC = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, profile } = useAuth();
  const { items } = useMobileBottomNav();

  const role = (userRole?.role || (profile as any)?.role) as string | undefined;

  const visible = useMemo(() => items.filter((it) => {
    if (!it.is_active) return false;
    if (!role) return false;
    if (role === 'client') return it.visible_to_client;
    if (role === 'partner') return it.visible_to_partner;
    if (role === 'specjalista') return it.visible_to_specjalista;
    if (role === 'leader') return it.visible_to_leader;
    if (role === 'admin') return it.visible_to_admin;
    return false;
  }), [items, role]);

  if (!isMobile) return null;
  if (!user) return null;
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;
  if (visible.length === 0) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[150] bg-background/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Szybka nawigacja"
    >
      <ul className={cn(
        'flex items-stretch',
        visible.length > 5 ? 'overflow-x-auto snap-x' : 'justify-around'
      )}>
        {visible.map((it) => {
          const IconCmp = (Icons as any)[it.icon_name] || (Icons as any).Circle;
          // Normalize stored target into pathname / search / hash
          const raw = (it.target_path || '/').trim();
          const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
          const hashIdx = withSlash.indexOf('#');
          const beforeHash = hashIdx >= 0 ? withSlash.slice(0, hashIdx) : withSlash;
          const targetHash = hashIdx >= 0 ? withSlash.slice(hashIdx + 1) : '';
          const qIdx = beforeHash.indexOf('?');
          const targetPathname = qIdx >= 0 ? beforeHash.slice(0, qIdx) : beforeHash;
          const targetSearch = qIdx >= 0 ? beforeHash.slice(qIdx) : '';
          const fullTarget = `${targetPathname}${targetSearch}${targetHash ? `#${targetHash}` : ''}`;
          const active = location.pathname === targetPathname
            || (targetPathname !== '/' && location.pathname.startsWith(targetPathname));

          const handleClick = () => {
            // Same pathname -> just scroll to top / hash without re-mounting
            if (location.pathname === targetPathname) {
              if (targetHash) {
                document.getElementById(targetHash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
              return;
            }
            try {
              navigate(fullTarget);
            } catch {
              window.location.assign(fullTarget);
              return;
            }
            // Hard fallback if SPA navigation silently fails (e.g. blocked by guards)
            window.setTimeout(() => {
              if (window.location.pathname !== targetPathname) {
                window.location.assign(fullTarget);
              } else if (targetHash) {
                document.getElementById(targetHash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 250);
          };
          return (
            <li key={it.id} className={cn(visible.length > 5 ? 'shrink-0 basis-1/5 snap-start' : 'flex-1')}>
              <button
                type="button"
                onClick={handleClick}
                className={cn(
                  'w-full flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <IconCmp className="h-5 w-5" />
                <span className="text-[10px] leading-tight font-medium truncate max-w-full">
                  {it.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
