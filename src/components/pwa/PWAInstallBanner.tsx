import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useLocation } from 'react-router-dom';
import { Download, X, Share, PlusSquare, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DISMISS_KEY = 'pwa_install_banner_dismissed';
const DISMISS_DAYS = 14;

export function PWAInstallBanner() {
  const { user } = useAuth();
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(true); // Start hidden, show after check

  // Check localStorage dismiss state
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

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setDismissed(true);
    }
  };

  // Hide conditions
  if (!user) return null;
  if (isInstalled) return null;
  if (dismissed) return null;
  // Hide on public pages
  const publicPaths = ['/infolink/', '/events/register/'];
  if (publicPaths.some(p => location.pathname.startsWith(p))) return null;

  // Determine which variant to show
  const renderContent = () => {
    if (isIOS) {
      // iOS: manual instructions
      return (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs">
            Dodaj aplikację do ekranu głównego:
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Share className="h-3.5 w-3.5 text-primary" />
              Udostępnij
            </span>
            <span>→</span>
            <span className="flex items-center gap-1">
              <PlusSquare className="h-3.5 w-3.5 text-primary" />
              Do ekranu głównego
            </span>
          </div>
        </div>
      );
    }

    if (canInstall) {
      // Chrome/Edge: native install prompt
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Szybki dostęp z ekranu głównego, jak zwykła aplikacja.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleInstall} className="h-8 text-xs">
              <Download className="h-3.5 w-3.5 mr-1" />
              Zainstaluj
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs text-muted-foreground">
              Nie teraz
            </Button>
          </div>
        </div>
      );
    }

    // Fallback: Firefox, Safari desktop, etc. — link to /install
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs">
          Zainstaluj aplikację na swoim urządzeniu dla szybszego dostępu.
        </p>
        <div className="flex gap-2">
          <Button size="sm" asChild className="h-8 text-xs">
            <a href="/install">
              <Download className="h-3.5 w-3.5 mr-1" />
              Zobacz instrukcję
            </a>
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs text-muted-foreground">
            Nie teraz
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <Alert className="border-primary/30 bg-background shadow-lg relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Zamknij"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="flex-shrink-0 mt-0.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Download className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <AlertDescription className="text-sm">
              <p className="font-semibold text-foreground mb-1">
                Zainstaluj Pure Life Center
              </p>
              {renderContent()}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  );
}
