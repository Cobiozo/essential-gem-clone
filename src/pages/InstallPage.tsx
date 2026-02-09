import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share, PlusSquare, MoreVertical, Monitor, Smartphone, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const InstallPage = () => {
  const { canInstall, isInstalled, isIOS, isAndroid, promptInstall } = usePWAInstall();

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
            <p className="text-muted-foreground">
              Pure Life Center jest już zainstalowane na Twoim urządzeniu.
            </p>
            <Link to="/dashboard">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Przejdź do panelu
              </Button>
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
          <p className="text-muted-foreground">
            Dodaj aplikację do ekranu głównego i korzystaj jak z natywnej aplikacji mobilnej.
          </p>
        </div>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Korzyści z instalacji</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                'Szybki dostęp z ekranu głównego',
                'Działa w trybie pełnoekranowym',
                'Powiadomienia push (Android, iOS 16.4+)',
                'Szybsze ładowanie dzięki pamięci podręcznej',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Quick install button (if supported) */}
        {canInstall && (
          <Card className="border-primary/30">
            <CardContent className="pt-6 text-center space-y-3">
              <Button size="lg" onClick={handleInstall} className="w-full max-w-xs">
                <Download className="h-5 w-5 mr-2" />
                Zainstaluj teraz
              </Button>
              <p className="text-xs text-muted-foreground">
                Kliknij powyżej, aby zainstalować aplikację jednym kliknięciem.
              </p>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        <Card className={isIOS ? 'ring-2 ring-primary/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              iPhone / iPad (Safari)
              {isIOS && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Twoje urządzenie</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">1</span>
                <div>
                  <p className="font-medium text-foreground">Otwórz stronę w Safari</p>
                  <p className="text-muted-foreground">Upewnij się, że korzystasz z przeglądarki Safari (nie Chrome czy Firefox).</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">2</span>
                <div>
                  <p className="font-medium text-foreground flex items-center gap-1">
                    Kliknij <Share className="h-4 w-4 text-primary inline" /> Udostępnij
                  </p>
                  <p className="text-muted-foreground">Ikona na dole ekranu (kwadrat ze strzałką w górę).</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">3</span>
                <div>
                  <p className="font-medium text-foreground flex items-center gap-1">
                    Wybierz <PlusSquare className="h-4 w-4 text-primary inline" /> „Dodaj do ekranu głównego"
                  </p>
                  <p className="text-muted-foreground">Przewiń w dół listę opcji, jeśli nie widzisz.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">4</span>
                <div>
                  <p className="font-medium text-foreground">Potwierdź klikając „Dodaj"</p>
                  <p className="text-muted-foreground">Ikona Pure Life pojawi się na ekranie głównym.</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Android Instructions */}
        <Card className={isAndroid ? 'ring-2 ring-primary/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Android (Chrome)
              {isAndroid && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Twoje urządzenie</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">1</span>
                <div>
                  <p className="font-medium text-foreground flex items-center gap-1">
                    Kliknij <MoreVertical className="h-4 w-4 text-primary inline" /> menu (trzy kropki)
                  </p>
                  <p className="text-muted-foreground">W prawym górnym rogu przeglądarki Chrome.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">2</span>
                <div>
                  <p className="font-medium text-foreground">Wybierz „Zainstaluj aplikację" lub „Dodaj do ekranu głównego"</p>
                  <p className="text-muted-foreground">Nazwa opcji może się różnić w zależności od wersji Chrome.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">3</span>
                <div>
                  <p className="font-medium text-foreground">Potwierdź instalację</p>
                  <p className="text-muted-foreground">Aplikacja pojawi się na ekranie głównym i w szufladzie aplikacji.</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Desktop Instructions */}
        <Card className={!isIOS && !isAndroid ? 'ring-2 ring-primary/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Komputer (Chrome / Edge)
              {!isIOS && !isAndroid && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Twoje urządzenie</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">1</span>
                <div>
                  <p className="font-medium text-foreground">Kliknij ikonę instalacji w pasku adresu</p>
                  <p className="text-muted-foreground">Ikona monitora z strzałką w dół, po prawej stronie paska adresu.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">2</span>
                <div>
                  <p className="font-medium text-foreground">Kliknij „Zainstaluj"</p>
                  <p className="text-muted-foreground">Aplikacja otworzy się w osobnym oknie, jak natywna aplikacja.</p>
                </div>
              </li>
            </ol>
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
