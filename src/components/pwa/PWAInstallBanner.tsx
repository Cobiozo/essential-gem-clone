import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useLocation } from 'react-router-dom';
import { Download, X, Share, PlusSquare, ArrowUp, ArrowDown, ArrowDownRight, MoreVertical, Menu, LayoutGrid } from 'lucide-react';
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
    // 1. iOS Safari
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
          <a href="/install" className="text-xs text-primary underline">Instrukcje dla innych przeglądarek</a>
        </div>
      );
    }

    // 2. Android Samsung Internet
    if (isAndroid && isSamsungBrowser) {
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Otwórz menu <Menu className="inline h-3.5 w-3.5" /> na dolnym pasku i wybierz „Dodaj stronę do" → „Ekran startowy".
          </p>
          <a href="/install" className="text-xs text-primary underline">Instrukcje dla innych przeglądarek</a>
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs text-muted-foreground">
            Nie teraz
          </Button>
        </div>
      );
    }

    // 3. Android Chrome (no native prompt)
    if (isAndroid && isChrome && !canInstall) {
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Otwórz menu <MoreVertical className="inline h-3.5 w-3.5" /> i wybierz „Zainstaluj aplikację".
          </p>
          <a href="/install" className="text-xs text-primary underline">Instrukcje dla innych przeglądarek</a>
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs text-muted-foreground">
            Nie teraz
          </Button>
        </div>
      );
    }

    // 4. Edge desktop (canInstall or not)
    if (isEdge && !isAndroid) {
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Kliknij ikonę <span className="inline-flex items-center gap-0.5 font-bold text-foreground"><LayoutGrid className="inline h-3.5 w-3.5" />+</span> w pasku adresu, aby zainstalować.
          </p>
          <div className="flex gap-2">
            {canInstall && (
              <Button size="sm" onClick={handleInstall} className="h-8 text-xs">
                <Download className="h-3.5 w-3.5 mr-1" />
                Zainstaluj
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs text-muted-foreground">
              Nie teraz
            </Button>
          </div>
          <a href="/install" className="text-xs text-primary underline">Instrukcje dla innych przeglądarek</a>
        </div>
      );
    }

    // 5. Chrome desktop (no canInstall)
    if (isChrome && !isAndroid && !canInstall) {
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Kliknij ikonę instalacji <Download className="inline h-3.5 w-3.5" /> w pasku adresu, obok gwiazdki.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs text-muted-foreground">
              Nie teraz
            </Button>
          </div>
          <a href="/install" className="text-xs text-primary underline">Instrukcje dla innych przeglądarek</a>
        </div>
      );
    }

    // 6. Opera desktop (no canInstall)
    if (isOpera && !isAndroid && !canInstall) {
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Otwórz menu i wybierz „Zainstaluj aplikację".
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs text-muted-foreground">
              Nie teraz
            </Button>
          </div>
          <a href="/install" className="text-xs text-primary underline">Instrukcje dla innych przeglądarek</a>
        </div>
      );
    }

    // 7. Generic canInstall fallback (Chrome/Opera desktop with prompt)
    if (canInstall) {
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Kliknij ikonę instalacji w pasku adresu lub użyj przycisku poniżej.
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
          <a href="/install" className="text-xs text-primary underline">Instrukcje dla innych przeglądarek</a>
        </div>
      );
    }

    // 8. Safari macOS
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
          <a href="/install" className="text-xs text-primary underline">Instrukcje dla innych przeglądarek</a>
        </div>
      );
    }

    // 9. Fallback: Firefox, etc.
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

  const indicatorStyle = "z-[51] flex items-center gap-1.5 animate-bounce rounded-full bg-black text-amber-400 px-2.5 py-1 shadow-lg border-2 border-amber-500/50";

  const renderArrowIndicator = () => {
    // iOS Safari — przycisk Udostępnij na dolnym pasku
    if (isIOS && isSafari) {
      return (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 ${indicatorStyle}`}>
          <Share className="h-4 w-4" />
          <span className="text-xs font-bold">Udostępnij</span>
          <ArrowDown className="h-5 w-5" />
        </div>
      );
    }

    // iOS Chrome / inne — przycisk Udostępnij na górnym pasku
    if (isIOS) {
      return (
        <div className={`fixed top-2 right-2 ${indicatorStyle}`}>
          <Share className="h-4 w-4" />
          <span className="text-xs font-bold">Udostępnij</span>
          <ArrowUp className="h-5 w-5" />
        </div>
      );
    }

    // Samsung Internet
    if (isAndroid && isSamsungBrowser) {
      return (
        <div className={`fixed bottom-16 right-4 ${indicatorStyle}`}>
          <span className="text-xs font-bold">Menu ☰</span>
          <ArrowDownRight className="h-5 w-5" />
        </div>
      );
    }

    // Chrome Android (no native prompt)
    if (isAndroid && isChrome && !canInstall) {
      return (
        <div className={`fixed top-2 right-2 ${indicatorStyle}`}>
          <span className="text-xs font-bold">⋮ → Zainstaluj</span>
          <ArrowUp className="h-5 w-5" />
        </div>
      );
    }

    // Edge desktop (canInstall) — address bar icon ⊞
    if (isEdge && !isAndroid && canInstall) {
      return (
        <div className={`fixed top-2 right-[140px] ${indicatorStyle}`}>
          <LayoutGrid className="h-4 w-4" />
          <span className="text-xs font-bold">⊞ Zainstaluj</span>
          <ArrowUp className="h-5 w-5" />
        </div>
      );
    }

    // Chrome desktop (canInstall)
    if (isChrome && !isAndroid && canInstall) {
      return (
        <div className={`fixed top-2 right-12 ${indicatorStyle}`}>
          <Download className="h-4 w-4" />
          <span className="text-xs font-bold">Zainstaluj</span>
          <ArrowUp className="h-5 w-5" />
        </div>
      );
    }

    // Opera desktop (canInstall)
    if (isOpera && !isAndroid && canInstall) {
      return (
        <div className={`fixed top-2 right-12 ${indicatorStyle}`}>
          <Download className="h-4 w-4" />
          <span className="text-xs font-bold">Zainstaluj</span>
          <ArrowUp className="h-5 w-5" />
        </div>
      );
    }

    // Edge desktop (no canInstall)
    if (isEdge && !isAndroid && !canInstall) {
      return (
        <div className={`fixed top-2 right-[140px] ${indicatorStyle}`}>
          <LayoutGrid className="h-4 w-4" />
          <span className="text-xs font-bold">⊞ Zainstaluj</span>
          <ArrowUp className="h-5 w-5" />
        </div>
      );
    }

    // Chrome desktop (no canInstall)
    if (isChrome && !isAndroid && !canInstall) {
      return (
        <div className={`fixed top-2 right-12 ${indicatorStyle}`}>
          <Download className="h-4 w-4" />
          <span className="text-xs font-bold">Zainstaluj</span>
          <ArrowUp className="h-5 w-5" />
        </div>
      );
    }

    // Opera desktop (no canInstall)
    if (isOpera && !isAndroid && !canInstall) {
      return (
        <div className={`fixed top-2 right-4 ${indicatorStyle}`}>
          <span className="text-xs font-bold">Menu → Zainstaluj</span>
          <ArrowUp className="h-5 w-5" />
        </div>
      );
    }

    // Safari macOS
    if (isSafari && !isIOS) {
      return (
        <div className={`fixed top-2 right-24 ${indicatorStyle}`}>
          <Share className="h-4 w-4" />
          <span className="text-xs font-bold">Udostępnij → Dock</span>
          <ArrowUp className="h-5 w-5" />
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderArrowIndicator()}

      <div className={`fixed top-2 z-50 animate-in slide-in-from-top-4 duration-300 ${(isIOS || isAndroid) ? 'left-4 right-4 mx-auto max-w-md' : 'right-[280px] max-w-sm'}`}>
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
