import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'pwa_install_banner_dismissed';
const DISMISS_DAYS = 14;

export function PWAInstallBanner() {
  const { user } = useAuth();
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const location = useLocation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (stored) {
      const dismissedAt = parseInt(stored, 10);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      setDismissed(daysSince < DISMISS_DAYS);
    } else {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    const handleReset = () => {
      localStorage.removeItem(DISMISS_KEY);
      setDismissed(false);
    };
    window.addEventListener('resetPWAInstallBanner', handleReset);
    return () => window.removeEventListener('resetPWAInstallBanner', handleReset);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (accepted) setDismissed(true);
    } else {
      navigate('/install');
    }
  };

  // Hide conditions
  if (!user) return null;
  if (isInstalled) return null;
  if (dismissed) return null;
  const publicPaths = ['/infolink/', '/events/register/', '/install'];
  if (publicPaths.some(p => location.pathname.startsWith(p))) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div
        className="bg-background border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          {/* App icon */}
          <img
            src="/pwa-192.png"
            alt="Pure Life Center"
            className="h-10 w-10 rounded-xl flex-shrink-0"
          />

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              Zainstaluj Pure Life Center
            </p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              Szybszy dostęp i powiadomienia push
            </p>
          </div>

          {/* Install button */}
          <Button
            size="sm"
            onClick={handleInstall}
            className="h-9 px-4 text-xs font-medium flex-shrink-0"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Zainstaluj
          </Button>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
