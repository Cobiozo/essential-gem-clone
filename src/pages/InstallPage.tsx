import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share, PlusSquare, MoreVertical, Monitor, Smartphone, ArrowLeft, CheckCircle2, Menu, LayoutGrid, Globe, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const StepItem = ({ step, title, description }: { step: number; title: React.ReactNode; description: string }) => (
  <li className="flex items-start gap-3">
    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">{step}</span>
    <div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-muted-foreground">{description}</p>
    </div>
  </li>
);

const DeviceBadge = () => (
  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Twoje urządzenie</span>
);

const InstallPage = () => {
  const { canInstall, isInstalled, isIOS, isAndroid, isSafari, isChrome, isEdge, isFirefox, isOpera, isSamsungBrowser, promptInstall } = usePWAInstall();

  const isMacOS = /Macintosh|MacIntel/.test(navigator.userAgent);
  const isDesktop = !isIOS && !isAndroid;

  const handleInstall = async () => {
    await promptInstall();
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Aplikacja zainstalowana!</h1>
            <p className="text-muted-foreground">Pure Life Center jest już zainstalowane na Twoim urządzeniu.</p>
            <Link to="/dashboard">
              <Button className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" />Przejdź do panelu</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Download className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Zainstaluj Pure Life Center</h1>
          <p className="text-muted-foreground">Dodaj aplikację do ekranu głównego i korzystaj jak z natywnej aplikacji mobilnej.</p>
        </div>

        {/* Benefits */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Korzyści z instalacji</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {['Szybki dostęp z ekranu głównego', 'Działa w trybie pełnoekranowym', 'Powiadomienia push (Android, iOS 16.4+)', 'Szybsze ładowanie dzięki pamięci podręcznej'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />{item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Quick install button */}
        {canInstall && (
          <Card className="border-primary/30">
            <CardContent className="pt-6 text-center space-y-3">
              <Button size="lg" onClick={handleInstall} className="w-full max-w-xs">
                <Download className="h-5 w-5 mr-2" />Zainstaluj teraz
              </Button>
              <p className="text-xs text-muted-foreground">Kliknij powyżej, aby zainstalować aplikację jednym kliknięciem.</p>
            </CardContent>
          </Card>
        )}

        {/* ===== MOBILE SECTION ===== */}
        <h2 className="text-lg font-semibold text-foreground pt-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5" /> Urządzenia mobilne
        </h2>

        {/* iOS Safari */}
        <Card className={isIOS && isSafari ? 'ring-2 ring-primary/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> iPhone / iPad (Safari)
              {isIOS && isSafari && <DeviceBadge />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <StepItem step={1} title="Otwórz stronę w Safari" description="Upewnij się, że korzystasz z przeglądarki Safari (nie Chrome czy Firefox)." />
              <StepItem step={2} title={<span className="flex items-center gap-1">Kliknij <Share className="h-4 w-4 text-primary inline" /> Udostępnij</span>} description="Ikona na dole ekranu (kwadrat ze strzałką w górę)." />
              <StepItem step={3} title={<span className="flex items-center gap-1">Wybierz <PlusSquare className="h-4 w-4 text-primary inline" /> „Dodaj do ekranu głównego"</span>} description="Przewiń w dół listę opcji, jeśli nie widzisz." />
              <StepItem step={4} title={'Potwierdź klikając „Dodaj"'} description="Ikona Pure Life pojawi się na ekranie głównym." />
            </ol>
          </CardContent>
        </Card>

        {/* Android Chrome */}
        <Card className={isAndroid && isChrome ? 'ring-2 ring-primary/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> Android (Chrome)
              {isAndroid && isChrome && <DeviceBadge />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <StepItem step={1} title={<span className="flex items-center gap-1">Kliknij <MoreVertical className="h-4 w-4 text-primary inline" /> menu (trzy kropki)</span>} description="W prawym górnym rogu przeglądarki Chrome." />
              <StepItem step={2} title={'Wybierz „Zainstaluj aplikację" lub „Dodaj do ekranu głównego"'} description="Nazwa opcji może się różnić w zależności od wersji Chrome." />
              <StepItem step={3} title="Potwierdź instalację" description="Aplikacja pojawi się na ekranie głównym i w szufladzie aplikacji." />
            </ol>
          </CardContent>
        </Card>

        {/* Android Samsung Internet */}
        <Card className={isAndroid && isSamsungBrowser ? 'ring-2 ring-primary/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> Android (Samsung Internet)
              {isAndroid && isSamsungBrowser && <DeviceBadge />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <StepItem step={1} title={<span className="flex items-center gap-1">Otwórz menu <Menu className="h-4 w-4 text-primary inline" /> na dolnym pasku</span>} description="Ikona hamburger menu (trzy poziome linie) na dole ekranu." />
              <StepItem step={2} title={'Wybierz „Dodaj stronę do" \u2192 „Ekran startowy"'} description="Znajdziesz tę opcję w menu udostępniania." />
              <StepItem step={3} title="Potwierdź dodanie" description="Ikona aplikacji pojawi się na ekranie głównym." />
            </ol>
          </CardContent>
        </Card>

        {/* Android Firefox */}
        <Card className={isAndroid && isFirefox ? 'ring-2 ring-primary/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> Android (Firefox)
              {isAndroid && isFirefox && <DeviceBadge />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <StepItem step={1} title={<span className="flex items-center gap-1">Kliknij <MoreVertical className="h-4 w-4 text-primary inline" /> menu (trzy kropki)</span>} description="W prawym górnym lub dolnym rogu przeglądarki Firefox." />
              <StepItem step={2} title={'Wybierz „Zainstaluj"'} description="Firefox automatycznie rozpozna aplikację PWA." />
              <StepItem step={3} title="Potwierdź instalację" description="Aplikacja pojawi się na ekranie głównym." />
            </ol>
          </CardContent>
        </Card>

        {/* Android Opera */}
        <Card className={isAndroid && isOpera ? 'ring-2 ring-primary/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> Android (Opera)
              {isAndroid && isOpera && <DeviceBadge />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <StepItem step={1} title={<span className="flex items-center gap-1">Kliknij <MoreVertical className="h-4 w-4 text-primary inline" /> menu (trzy kropki)</span>} description="W prawym górnym lub dolnym rogu przeglądarki Opera." />
              <StepItem step={2} title={'Wybierz „Ekran główny" lub „Dodaj do\u2026"'} description="Nazwa opcji może się różnić w zależności od wersji." />
              <StepItem step={3} title="Potwierdź dodanie" description="Aplikacja pojawi się na ekranie głównym." />
            </ol>
          </CardContent>
        </Card>

        {/* ===== DESKTOP SECTION ===== */}
        <h2 className="text-lg font-semibold text-foreground pt-4 flex items-center gap-2">
          <Monitor className="h-5 w-5" /> Komputery
        </h2>

        {/* Desktop Edge */}
        <Card className={isDesktop && isEdge ? 'ring-2 ring-primary/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5" /> Microsoft Edge
              {isDesktop && isEdge && <DeviceBadge />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <StepItem step={1} title={<span className="flex items-center gap-1">Kliknij ikonę <LayoutGrid className="h-4 w-4 text-primary inline" /> w pasku adresu</span>} description="Ikona trzech kwadracików z plusem, po prawej stronie paska adresu." />
              <StepItem step={2} title={'Kliknij „Zainstaluj"'} description="Aplikacja otworzy się w osobnym oknie, jak natywna aplikacja." />
            </ol>
            <p className="text-xs text-muted-foreground mt-4">{'Alternatywnie: Menu (\u00B7\u00B7\u00B7) \u2192 Aplikacje \u2192 Zainstaluj tę witrynę jako aplikację'}</p>
          </CardContent>
        </Card>

        {/* Desktop Chrome */}
        <Card className={isDesktop && isChrome ? 'ring-2 ring-primary/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5" /> Google Chrome
              {isDesktop && isChrome && <DeviceBadge />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <StepItem step={1} title="Kliknij ikonę instalacji w pasku adresu" description="Ikona monitora ze strzałką w dół, po prawej stronie paska adresu." />
              <StepItem step={2} title={'Kliknij „Zainstaluj"'} description="Aplikacja otworzy się w osobnym oknie, jak natywna aplikacja." />
            </ol>
            <p className="text-xs text-muted-foreground mt-4">{'Alternatywnie: Menu (\u22EE) \u2192 Zapisz i udostępnij \u2192 Zainstaluj aplikację'}</p>
          </CardContent>
        </Card>

        {/* Desktop Opera */}
        <Card className={isDesktop && isOpera ? 'ring-2 ring-primary/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5" /> Opera
              {isDesktop && isOpera && <DeviceBadge />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <StepItem step={1} title="Kliknij ikonę instalacji w pasku adresu" description={'Ikona może wyglądać jak monitor ze strzałką lub symbol „+".'} />
              <StepItem step={2} title={'Kliknij „Zainstaluj"'} description="Aplikacja otworzy się w osobnym oknie." />
            </ol>
            <p className="text-xs text-muted-foreground mt-4">{'Alternatywnie: Menu \u2192 Zainstaluj aplikację'}</p>
          </CardContent>
        </Card>

        {/* Desktop Safari macOS */}
        <Card className={isDesktop && isMacOS && isSafari ? 'ring-2 ring-primary/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5" /> Safari (macOS)
              {isDesktop && isMacOS && isSafari && <DeviceBadge />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <StepItem step={1} title={<span className="flex items-center gap-1">Kliknij <Share className="h-4 w-4 text-primary inline" /> Udostępnij w pasku narzędzi</span>} description="Ikona kwadratu ze strzałką w górę na pasku narzędzi Safari." />
              <StepItem step={2} title={'Wybierz „Dodaj do Docka"'} description="Aplikacja pojawi się w Docku na dole ekranu jako osobna ikona." />
            </ol>
            <p className="text-xs text-muted-foreground mt-4">Wymaga macOS Sonoma 14 lub nowszego.</p>
          </CardContent>
        </Card>

        {/* Desktop Firefox */}
        <Card className={isDesktop && isFirefox ? 'ring-2 ring-primary/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5" /> Firefox
              {isDesktop && isFirefox && <DeviceBadge />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Firefox nie wspiera instalacji PWA na komputerze</p>
                <p className="text-muted-foreground mt-1">
                  Aby zainstalować Pure Life Center jako aplikację na komputerze, użyj przeglądarki <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong> lub <strong>Opera</strong>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back link */}
        <div className="text-center pt-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Powrót do strony głównej
          </Link>
        </div>
      </div>
    </div>
  );
};

export default InstallPage;
