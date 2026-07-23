import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Box, Grid3x3, LayoutTemplate, ChevronDown, Heading1, Type, Image as ImageIcon,
  Video, MousePointerClick, Sparkles, LayoutGrid, BarChart3, List, Images,
  Minus, MoveVertical, Search, Plus,
} from 'lucide-react';
import type { HomepageV2Content, Widget, WidgetKind } from '@/types/homepageV2';
import { addWidget, uid } from './pathUtils';

interface Props {
  content: HomepageV2Content;
  onChange: (next: HomepageV2Content) => void;
}

interface Def {
  kind: WidgetKind;
  label: string;
  Icon: any;
  make: () => Widget;
}

const LAYOUT: Def[] = [
  { kind: 'container', label: 'Kontener', Icon: Box, make: () => ({ id: uid(), kind: 'container', props: {}, children: [] }) },
  { kind: 'grid', label: 'Siatka', Icon: Grid3x3, make: () => ({ id: uid(), kind: 'grid', props: { cols: 3 }, children: [] }) },
  { kind: 'section', label: 'Sekcja', Icon: LayoutTemplate, make: () => ({ id: uid(), kind: 'section', props: { title: 'Nowa sekcja' }, children: [] }) },
  { kind: 'collapsible', label: 'Sekcja zwijana', Icon: ChevronDown, make: () => ({ id: uid(), kind: 'collapsible', props: { items: [{ title: 'Pytanie', body: 'Odpowiedź.' }] } }) },
];

const BASIC: Def[] = [
  { kind: 'heading', label: 'Nagłówek', Icon: Heading1, make: () => ({ id: uid(), kind: 'heading', props: { text: 'Nowy nagłówek', level: 'h2' } }) },
  { kind: 'text', label: 'Tekst', Icon: Type, make: () => ({ id: uid(), kind: 'text', props: { text: 'Kliknij, aby edytować.' } }) },
  { kind: 'image', label: 'Obraz', Icon: ImageIcon, make: () => ({ id: uid(), kind: 'image', props: { url: '', alt: '' } }) },
  { kind: 'video', label: 'Wideo', Icon: Video, make: () => ({ id: uid(), kind: 'video', props: { url: '' } }) },
  { kind: 'button', label: 'Przycisk', Icon: MousePointerClick, make: () => ({ id: uid(), kind: 'button', props: { text: 'Kliknij mnie', url: '#' } }) },
  { kind: 'icon', label: 'Ikona', Icon: Sparkles, make: () => ({ id: uid(), kind: 'icon', props: { name: 'Sparkles' } }) },
  { kind: 'card', label: 'Karta', Icon: LayoutGrid, make: () => ({ id: uid(), kind: 'card', props: { icon: 'Sparkles', title: 'Tytuł', description: 'Opis karty.' } }) },
  { kind: 'stat', label: 'Statystyka', Icon: BarChart3, make: () => ({ id: uid(), kind: 'stat', props: { value: '100+', label: 'użytkowników' } }) },
  { kind: 'bullet-list', label: 'Lista punktów', Icon: List, make: () => ({ id: uid(), kind: 'bullet-list', props: { items: ['Punkt 1', 'Punkt 2', 'Punkt 3'] } }) },
  { kind: 'logo-row', label: 'Rząd logotypów', Icon: Images, make: () => ({ id: uid(), kind: 'logo-row', props: { logos: [] } }) },
  { kind: 'divider', label: 'Separator', Icon: Minus, make: () => ({ id: uid(), kind: 'divider', props: {} }) },
  { kind: 'spacer', label: 'Odstęp', Icon: MoveVertical, make: () => ({ id: uid(), kind: 'spacer', props: { height: 48 } }) },
];

const Group: React.FC<{ title: string; defs: Def[]; onAdd: (d: Def) => void }> = ({ title, defs, onAdd }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-2">
      {title} ({defs.length})
    </div>
    <div className="grid grid-cols-2 gap-2">
      {defs.map((d) => (
        <button
          key={d.kind}
          type="button"
          onClick={() => onAdd(d)}
          className="group flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition p-3 text-xs"
          title={`Dodaj: ${d.label}`}
        >
          <d.Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition" />
          <span className="text-foreground">{d.label}</span>
        </button>
      ))}
    </div>
  </div>
);

export const WidgetPalette: React.FC<Props> = ({ content, onChange }) => {
  const [q, setQ] = useState('');
  const layoutFiltered = useMemo(() => LAYOUT.filter((d) => d.label.toLowerCase().includes(q.toLowerCase())), [q]);
  const basicFiltered = useMemo(() => BASIC.filter((d) => d.label.toLowerCase().includes(q.toLowerCase())), [q]);

  const add = (d: Def) => {
    onChange(addWidget(content, d.make()));
  };

  return (
    <div className="p-4 space-y-5">
      <div>
        <div className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Dodaj widżet
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Kliknij widżet, aby dopisać go na końcu strony.
        </p>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj widżetu…" className="pl-8 h-9 text-xs" />
        </div>
      </div>

      {layoutFiltered.length > 0 && <Group title="Układ" defs={layoutFiltered} onAdd={add} />}
      {basicFiltered.length > 0 && <Group title="Podstawowe" defs={basicFiltered} onAdd={add} />}

      {(content.widgets?.length ?? 0) > 0 && (
        <div className="border-t pt-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Widżety na stronie ({content.widgets?.length})
          </div>
          <p className="text-[11px] text-muted-foreground">
            Kliknij widżet w podglądzie, aby otworzyć jego właściwości.
          </p>
        </div>
      )}
    </div>
  );
};
