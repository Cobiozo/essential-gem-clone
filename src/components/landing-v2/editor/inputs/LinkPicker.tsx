import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CtaKind } from '@/types/homepageV2';

export const KNOWN_APP_ROUTES: { value: string; label: string }[] = [
  { value: '/', label: 'Strona główna (/)' },
  { value: '/auth', label: 'Logowanie / rejestracja (/auth)' },
  { value: '/dashboard', label: 'Panel użytkownika (/dashboard)' },
  { value: '/webinary', label: 'Webinary (/webinary)' },
  { value: '/aktualnosci', label: 'Aktualności (/aktualnosci)' },
  { value: '/baza-wiedzy', label: 'Baza Wiedzy (/baza-wiedzy)' },
  { value: '/kontakt', label: 'Kontakt (/kontakt)' },
  { value: '/wydarzenia', label: 'Wydarzenia (/wydarzenia)' },
  { value: '/kalkulator', label: 'Kalkulator (/kalkulator)' },
];

export const V2_ANCHORS: { value: string; label: string }[] = [
  { value: '#hero', label: 'Sekcja: Hero (#hero)' },
  { value: '#features', label: 'Sekcja: Funkcje (#features)' },
  { value: '#stats', label: 'Sekcja: Statystyki (#stats)' },
  { value: '#community', label: 'Sekcja: Społeczność (#community)' },
  { value: '#trusted-by', label: 'Sekcja: Zaufali nam (#trusted-by)' },
];

interface Props {
  url: string;
  kind?: CtaKind;
  onChange: (patch: { url: string; kind: CtaKind }) => void;
}

export const LinkPicker: React.FC<Props> = ({ url, kind, onChange }) => {
  const currentKind: CtaKind = kind || (url.startsWith('#') ? 'anchor' : /^https?:\/\//i.test(url) ? 'external' : 'route');

  const setKind = (k: CtaKind) => {
    // reset URL when switching, keep external as-is
    const next = k === currentKind ? url : '';
    onChange({ url: next, kind: k });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Miejsce docelowe przycisku</Label>
      <div className="grid grid-cols-3 gap-1">
        {(['route', 'anchor', 'external'] as CtaKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`text-[11px] py-1.5 rounded border transition ${
              currentKind === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 hover:bg-muted'
            }`}
          >
            {k === 'route' ? 'Trasa' : k === 'anchor' ? 'Kotwica' : 'URL'}
          </button>
        ))}
      </div>

      {currentKind === 'route' && (
        <Select value={url} onValueChange={(v) => onChange({ url: v, kind: 'route' })}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Wybierz stronę..." /></SelectTrigger>
          <SelectContent>
            {KNOWN_APP_ROUTES.map((r) => (
              <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {currentKind === 'anchor' && (
        <Select value={url} onValueChange={(v) => onChange({ url: v, kind: 'anchor' })}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Wybierz sekcję..." /></SelectTrigger>
          <SelectContent>
            {V2_ANCHORS.map((r) => (
              <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {currentKind === 'external' && (
        <Input
          value={url}
          onChange={(e) => onChange({ url: e.target.value, kind: 'external' })}
          placeholder="https://..."
          className="h-9 text-xs"
        />
      )}
    </div>
  );
};
