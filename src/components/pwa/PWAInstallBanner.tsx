import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useLocation } from 'react-router-dom';
import { Download, X, Share, PlusSquare, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownRight, MoreVertical, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DISMISS_KEY = 'pwa_install_banner_dismissed';
const DISMISS_DAYS = 14;

export function PWAInstallBanner() {
  const { user } = useAuth();
  const { canInstall, isInstalled, isIOS, isAndroid, isSafari, isChrome, isEdge, isFirefox, isOpera, isSamsungBrowser, promptInstall } = usePWAInstall();
  const location = useLocation();
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
    const accepted = await promptInstall();
    if (accepted) {
      setDismissed(true);
    }
  };

  // Hide conditions
  if (!user) return null;
  if (isInstalled) return null;
  if (dismissed) return null;
  const publicPaths = ['/infolink/', '/events/register/', '/install'];
  if (publicPaths.some(p => location.pathname.startsWith(p))) return null;

  const renderContent = () => {
    if (isIOS) {
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

    if (isAndroid && isSamsungBrowser) {
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Otwórz menu <Menu className="inline h-3.5 w-3.5" /> na dolnym pasku i wybierz „Dodaj stronę do" → „Ekran startowy".
          </p>
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs text-muted-foreground">
            Nie teraz
          </Button>
        </div>
      );
    }

    if (isAndroid && isChrome && !canInstall) {
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Otwórz menu <MoreVertical className="inline h-3.5 w-3.5" /> i wybierz „Zainstaluj aplikację".
          </p>
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs text-muted-foreground">
            Nie teraz
          </Button>
        </div>
      );
    }

    if (canInstall) {
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

    if (isSafari && !isIOS) {
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Kliknij ikonę <Share className="inline h-3.5 w-3.5" /> Udostępnij, a następnie „Dodaj do Docka".
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs text-muted-foreground">
              Nie teraz
            </Button>
          </div>
        </div>
      );
    }

    // Fallback: Firefox, etc.
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

  /** Render the browser-specific floating arrow indicator */
  const renderArrowIndicator = () => {
    // iOS Safari: arrow pointing down-center toward Share icon
    if (isIOS) {
      return (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[51] flex flex-col items-center animate-bounce">
          <span className="text-xs font-semibold text-primary bg-background/90 px-2 py-0.5 rounded-full shadow-sm border border-primary/20 mb-1">
            Kliknij Udostępnij
          </span>
          <ArrowDown className="h-6 w-6 text-primary drop-shadow-md" />
        </div>
      );
    }

    // Samsung Internet: arrow pointing down-right toward bottom menu
    if (isAndroid && isSamsungBrowser) {
      return (
        <div className="fixed bottom-16 right-4 z-[51] flex items-center gap-1 animate-bounce">
          <span className="text-xs font-semibold text-primary bg-background/90 px-2 py-0.5 rounded-full shadow-sm border border-primary/20">
            Menu ☰
          </span>
          <ArrowDownRight className="h-6 w-6 text-primary drop-shadow-md" />
        </div>
      );
    }

    // Chrome Android (no native prompt): arrow to three-dot menu top-right
    if (isAndroid && isChrome && !canInstall) {
      return (
        <div className="fixed top-1 right-2 z-[51] flex items-center gap-1 animate-bounce">
          <span className="text-xs font-semibold text-primary bg-background/90 px-2 py-0.5 rounded-full shadow-sm border border-primary/20">
            Menu ⋮
          </span>
          <ArrowUpRight className="h-6 w-6 text-primary drop-shadow-md" />
        </div>
      );
    }

    // Chrome/Edge/Opera desktop with native install prompt: arrow to address bar icon (right side)
    if (canInstall && (isChrome || isEdge || isOpera)) {
      return (
        <div className="fixed top-1 right-8 z-[51] flex items-center gap-1 animate-bounce">
          <span className="text-xs font-semibold text-primary bg-background/90 px-2 py-0.5 rounded-full shadow-sm border border-primary/20">
            Ikona instalacji ↑
          </span>
          <ArrowUp className="h-6 w-6 text-primary drop-shadow-md" />
        </div>
      );
    }

    // Safari macOS: arrow toward top Share/File area
    if (isSafari && !isIOS) {
      return (
        <div className="fixed top-1 right-24 z-[51] flex items-center gap-1 animate-bounce">
          <span className="text-xs font-semibold text-primary bg-background/90 px-2 py-0.5 rounded-full shadow-sm border border-primary/20">
            Udostępnij ↑
          </span>
          <ArrowUp className="h-6 w-6 text-primary drop-shadow-md" />
        </div>
      );
    }

    // No arrow for Firefox/other
    return null;
  };

  return (
    <>
      {renderArrowIndicator()}

      <div className="fixed top-2 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-top-4 duration-300">
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
    </>
  );
}
