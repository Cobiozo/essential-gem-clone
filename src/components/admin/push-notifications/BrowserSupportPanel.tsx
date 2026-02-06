import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, Monitor, Smartphone } from 'lucide-react';

interface BrowserInfo {
  name: string;
  icon: string;
  desktopSupport: 'full' | 'partial' | 'none';
  mobileSupport: 'full' | 'partial' | 'pwa-only' | 'none';
  notes: string;
}

const browsers: BrowserInfo[] = [
  {
    name: 'Chrome',
    icon: '🌐',
    desktopSupport: 'full',
    mobileSupport: 'full',
    notes: 'Android 4.4+, Windows, macOS, Linux. Najlepsza kompatybilność.',
  },
  {
    name: 'Edge',
    icon: '📘',
    desktopSupport: 'full',
    mobileSupport: 'full',
    notes: 'Bazuje na Chromium. Pełna kompatybilność z Chrome.',
  },
  {
    name: 'Firefox',
    icon: '🦊',
    desktopSupport: 'full',
    mobileSupport: 'full',
    notes: 'Windows, macOS, Linux, Android. Może wymagać dodatkowych uprawnień.',
  },
  {
    name: 'Safari',
    icon: '🧭',
    desktopSupport: 'full',
    mobileSupport: 'pwa-only',
    notes: 'iOS 16.4+ wymaga dodania do ekranu głównego (PWA). macOS pełne wsparcie.',
  },
  {
    name: 'Brave',
    icon: '🦁',
    desktopSupport: 'full',
    mobileSupport: 'full',
    notes: 'Bazuje na Chromium. Może blokować niektóre trackery - test zalecany.',
  },
  {
    name: 'Opera',
    icon: '🔴',
    desktopSupport: 'full',
    mobileSupport: 'full',
    notes: 'Bazuje na Chromium. Pełna kompatybilność.',
  },
  {
    name: 'Samsung Internet',
    icon: '🌍',
    desktopSupport: 'none',
    mobileSupport: 'full',
    notes: 'Tylko urządzenia Samsung. Bazuje na Chromium.',
  },
];

const SupportBadge: React.FC<{ support: string }> = ({ support }) => {
  switch (support) {
    case 'full':
      return <Badge variant="default">✓ Pełne</Badge>;
    case 'partial':
      return <Badge variant="secondary">⚠️ Częściowe</Badge>;
    case 'pwa-only':
      return <Badge variant="secondary">📲 PWA</Badge>;
    case 'none':
      return <Badge variant="outline" className="text-muted-foreground">✗ Brak</Badge>;
    default:
      return <Badge variant="outline">?</Badge>;
  }
};

export const BrowserSupportPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Wsparcie przeglądarek
          </CardTitle>
          <CardDescription>
            Status Web Push API w różnych przeglądarkach i platformach
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Przeglądarka</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Monitor className="w-4 h-4" />
                    Desktop
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Smartphone className="w-4 h-4" />
                    Mobile
                  </div>
                </TableHead>
                <TableHead>Uwagi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {browsers.map((browser) => (
                <TableRow key={browser.name}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-lg">{browser.icon}</span>
                      {browser.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <SupportBadge support={browser.desktopSupport} />
                  </TableCell>
                  <TableCell className="text-center">
                    <SupportBadge support={browser.mobileSupport} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">
                    {browser.notes}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Additional info cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">iOS (iPhone/iPad)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Wymagania:</strong> iOS 16.4 lub nowszy
            </p>
            <p>
              <strong>Instalacja:</strong> Użytkownik musi dodać stronę do ekranu głównego (PWA)
            </p>
            <p>
              <strong>Proces:</strong> Safari → Udostępnij → Dodaj do ekranu głównego
            </p>
            <p className="text-xs">
              Po dodaniu do ekranu głównego, aplikacja PWA może wysyłać powiadomienia push.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Android</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Wymagania:</strong> Android 4.4+ z Chrome lub kompatybilną przeglądarką
            </p>
            <p>
              <strong>PWA opcjonalna:</strong> Powiadomienia działają bez instalacji PWA
            </p>
            <p>
              <strong>Instalacja PWA:</strong> Chrome → Menu → Dodaj do ekranu głównego
            </p>
            <p className="text-xs">
              Instalacja PWA zapewnia lepsze doświadczenie i stały dostęp do powiadomień.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <SupportBadge support="full" />
              <span>Pełne wsparcie Web Push API</span>
            </div>
            <div className="flex items-center gap-2">
              <SupportBadge support="pwa-only" />
              <span>Tylko po instalacji jako PWA</span>
            </div>
            <div className="flex items-center gap-2">
              <SupportBadge support="partial" />
              <span>Częściowe wsparcie z ograniczeniami</span>
            </div>
            <div className="flex items-center gap-2">
              <SupportBadge support="none" />
              <span>Brak wsparcia</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
