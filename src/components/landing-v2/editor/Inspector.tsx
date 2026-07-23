import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowUp, ArrowDown, Plus, Copy, Move, LayoutGrid, Settings2 } from 'lucide-react';
import type { HomepageV2Content, EditElementType, ElementStyle, Widget } from '@/types/homepageV2';
import {
  getByPath, setByPath, getStyle, updateStyle, parseListItemPath, uid,
  removeWidgetAt, moveWidget, duplicateWidget, parseWidgetIndex,
} from './pathUtils';
import { StyleControls } from './StyleControls';
import { ImageInput } from './inputs/ImageInput';
import { VideoInput } from './inputs/VideoInput';
import { IconInput } from './inputs/IconInput';
import { LinkPicker } from './inputs/LinkPicker';
import { WidgetPalette } from './WidgetPalette';



interface Props {
  content: HomepageV2Content;
  onChange: (next: HomepageV2Content) => void;
  selectedPath: string | null;
  selectedType: EditElementType | null;
  onSelect: (path: string | null, type: EditElementType | null) => void;
}

const TYPE_LABEL: Record<EditElementType, string> = {
  text: 'Tekst',
  heading: 'Nagłówek',
  image: 'Obraz',
  icon: 'Ikona',
  button: 'Przycisk CTA',
  card: 'Karta',
  stat: 'Statystyka',
  avatar: 'Avatar',
  logo: 'Logo',
  video: 'Wideo',
  section: 'Sekcja',
  bullet: 'Punkt listy',
  widget: 'Widżet',
};

function LayoutControls({ style, onChange }: { style: ElementStyle; onChange: (p: Partial<ElementStyle>) => void }) {
  const reset = () => onChange({ offsetX: undefined, offsetY: undefined, scale: undefined, width: undefined, height: undefined, zIndex: undefined });
  return (
    <div className="space-y-3 border-t pt-3 mt-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <Move className="w-3 h-3" /> Pozycja i rozmiar
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={reset}>Reset</Button>
      </div>
      <div className="text-[10px] text-muted-foreground -mt-1">
        Możesz też chwycić element w podglądzie i przeciągnąć / rozciągnąć narożnikami.
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Przesunięcie X (px)</Label>
          <Input type="number" value={style.offsetX ?? ''} onChange={(e) => onChange({ offsetX: e.target.value === '' ? undefined : Number(e.target.value) })} className="h-9 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Przesunięcie Y (px)</Label>
          <Input type="number" value={style.offsetY ?? ''} onChange={(e) => onChange({ offsetY: e.target.value === '' ? undefined : Number(e.target.value) })} className="h-9 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Szerokość</Label>
          <Input value={style.width || ''} onChange={(e) => onChange({ width: e.target.value })} placeholder="np. 320px" className="h-9 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Wysokość</Label>
          <Input value={style.height || ''} onChange={(e) => onChange({ height: e.target.value })} placeholder="np. 200px" className="h-9 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Skala</Label>
          <Input type="number" step="0.05" value={style.scale ?? ''} onChange={(e) => onChange({ scale: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="np. 1.2" className="h-9 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Warstwa (z-index)</Label>
          <Input type="number" value={style.zIndex ?? ''} onChange={(e) => onChange({ zIndex: e.target.value === '' ? undefined : Number(e.target.value) })} className="h-9 text-xs" />
        </div>
      </div>
    </div>
  );
}

export const Inspector: React.FC<Props> = ({
  content,
  onChange,
  selectedPath,
  selectedType,
  onSelect,
}) => {
  const [tab, setTab] = useState<'widgets' | 'properties'>('properties');

  // Auto-switch to Properties tab when user selects an element
  React.useEffect(() => {
    if (selectedPath) setTab('properties');
  }, [selectedPath]);

  const Tabs = (
    <div className="flex items-center gap-1 p-1 border-b border-border bg-muted/30 sticky top-0 z-10">
      <button
        type="button"
        onClick={() => setTab('widgets')}
        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md transition ${tab === 'widgets' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
      >
        <LayoutGrid className="w-3.5 h-3.5" /> Widżety
      </button>
      <button
        type="button"
        onClick={() => setTab('properties')}
        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md transition ${tab === 'properties' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
      >
        <Settings2 className="w-3.5 h-3.5" /> Właściwości
      </button>
    </div>
  );

  if (tab === 'widgets') {
    return (
      <div>
        {Tabs}
        <WidgetPalette content={content} onChange={onChange} />
      </div>
    );
  }

  if (!selectedPath || !selectedType) {
    return (
      <div>
        {Tabs}
        <div className="p-6 text-center text-sm text-muted-foreground">
          <div className="text-lg mb-2">👆</div>
          Kliknij dowolny element w podglądzie po lewej, aby go edytować.
          <div className="mt-6 text-xs text-left space-y-2 border-t pt-4">
            <div className="font-semibold text-foreground">Wskazówki:</div>
            <div>• Zakładka <b>Widżety</b> pozwala dodawać nowe bloki (nagłówek, tekst, obraz, wideo, kartę itp.).</div>
            <div>• Klikaj w tekst, obraz, ikonę lub przycisk — otworzy się dedykowany edytor.</div>
            <div>• Zaznaczony element możesz <b>chwycić i przesunąć</b> lub złapać za narożnik i <b>zmienić rozmiar</b>.</div>
            <div>• Wszystkie zmiany są zapisywane jako <b>draft</b> — publikacja jednym kliknięciem.</div>
          </div>
        </div>
      </div>
    );
  }


  const val = getByPath(content, selectedPath);
  const style = getStyle(content, selectedPath);
  const listInfo = parseListItemPath(selectedPath);

  const setVal = (v: any) => onChange(setByPath(content, selectedPath, v));
  const setField = (subPath: string, v: any) =>
    onChange(setByPath(content, `${selectedPath}.${subPath}`, v));
  const patchStyle = (patch: any) => onChange(updateStyle(content, selectedPath, patch));

  const moveInList = (dir: -1 | 1) => {
    if (!listInfo) return;
    const list = getByPath(content, listInfo.listPath) || [];
    const j = listInfo.index + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[listInfo.index], next[j]] = [next[j], next[listInfo.index]];
    onChange(setByPath(content, listInfo.listPath, next));
    onSelect(`${listInfo.listPath}[${j}]`, selectedType);
  };
  const removeFromList = () => {
    if (!listInfo) return;
    const list = getByPath(content, listInfo.listPath) || [];
    const next = list.filter((_: any, i: number) => i !== listInfo.index);
    onChange(setByPath(content, listInfo.listPath, next));
    onSelect(null, null);
  };
  const duplicateInList = () => {
    if (!listInfo) return;
    const list = getByPath(content, listInfo.listPath) || [];
    const copy = JSON.parse(JSON.stringify(list[listInfo.index]));
    if (copy && typeof copy === 'object' && 'id' in copy) copy.id = uid();
    const next = [...list];
    next.splice(listInfo.index + 1, 0, copy);
    onChange(setByPath(content, listInfo.listPath, next));
  };

  const widgetIndex = parseWidgetIndex(selectedPath);
  const isWidget = selectedPath.startsWith('widgets.');
  const widget: Widget | undefined = isWidget ? getByPath(content, selectedPath) : undefined;

  return (
    <div>
      {Tabs}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {widget ? `Widżet: ${widget.kind}` : TYPE_LABEL[selectedType]}
            </div>
            <div className="text-xs font-mono text-muted-foreground break-all">{selectedPath}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => onSelect(null, null)}>Zamknij</Button>
        </div>

        {widgetIndex != null && (
          <div className="flex flex-wrap gap-1 border-b pb-3">
            <Button size="sm" variant="outline" onClick={() => onChange(moveWidget(content, widgetIndex, -1))}>
              <ArrowUp className="w-3 h-3 mr-1" /> W górę
            </Button>
            <Button size="sm" variant="outline" onClick={() => onChange(moveWidget(content, widgetIndex, 1))}>
              <ArrowDown className="w-3 h-3 mr-1" /> W dół
            </Button>
            <Button size="sm" variant="outline" onClick={() => onChange(duplicateWidget(content, widgetIndex))}>
              <Copy className="w-3 h-3 mr-1" /> Duplikuj
            </Button>
            <Button size="sm" variant="destructive" onClick={() => { onChange(removeWidgetAt(content, widgetIndex)); onSelect(null, null); }}>
              <Trash2 className="w-3 h-3 mr-1" /> Usuń
            </Button>
          </div>
        )}

        {listInfo && !isWidget && (
          <div className="flex flex-wrap gap-1 border-b pb-3">
            <Button size="sm" variant="outline" onClick={() => moveInList(-1)}>
              <ArrowUp className="w-3 h-3 mr-1" /> W górę
            </Button>
            <Button size="sm" variant="outline" onClick={() => moveInList(1)}>
              <ArrowDown className="w-3 h-3 mr-1" /> W dół
            </Button>
            <Button size="sm" variant="outline" onClick={duplicateInList}>
              <Copy className="w-3 h-3 mr-1" /> Duplikuj
            </Button>
            <Button size="sm" variant="destructive" onClick={removeFromList}>
              <Trash2 className="w-3 h-3 mr-1" /> Usuń
            </Button>
          </div>
        )}

        {isWidget && widget && (
          <WidgetPropsEditor
            widget={widget}
            onChange={(next) => onChange(setByPath(content, selectedPath, next))}
          />
        )}

        {!isWidget && (<>


      {/* ==== EDITORS BY TYPE ==== */}

      {(selectedType === 'text' || selectedType === 'heading' || selectedType === 'bullet') && (
        <>
          <div>
            <Label className="text-xs">Treść</Label>
            <Textarea
              value={typeof val === 'string' ? val : ''}
              onChange={(e) => setVal(e.target.value)}
              rows={selectedType === 'heading' ? 2 : 4}
              className="text-sm"
            />
          </div>
          <StyleControls style={style} onChange={patchStyle} variant="text" />
        </>
      )}

      {selectedType === 'image' && selectedPath === 'hero.media' && (() => {
        const media = (val && typeof val === 'object') ? val : { kind: 'image' };
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1">
              {(['image', 'video'] as const).map((k) => (
                <button key={k} type="button" onClick={() => setVal({ ...media, kind: k })}
                  className={`text-xs py-1.5 rounded border transition ${media.kind === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 hover:bg-muted'}`}>
                  {k === 'image' ? 'Obraz' : 'Wideo'}
                </button>
              ))}
            </div>
            {media.kind === 'image' ? (
              <ImageInput label="Obraz mockupu Hero" value={media.imageUrl || ''} onChange={(v) => setVal({ ...media, imageUrl: v })} />
            ) : (
              <>
                <VideoInput label="Wideo Hero (MP4 / YouTube / Vimeo)" value={media.videoUrl || ''} onChange={(v) => setVal({ ...media, videoUrl: v })} />
                <ImageInput label="Poster (miniatura)" value={media.videoPoster || ''} onChange={(v) => setVal({ ...media, videoPoster: v })} />
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={!!media.videoAutoplay} onChange={(e) => setVal({ ...media, videoAutoplay: e.target.checked })} />
                  Autoodtwarzanie (wyciszone)
                </label>
              </>
            )}
          </div>
        );
      })()}

      {selectedType === 'image' && selectedPath !== 'hero.media' && (
        <>
          <ImageInput
            label="Obraz"
            value={typeof val === 'string' ? val : val?.url || ''}
            onChange={(v) => {
              if (typeof val === 'object' && val && 'url' in val) setField('url', v);
              else setVal(v);
            }}
          />
          {typeof val === 'object' && val && 'alt' in val && (
            <div>
              <Label className="text-xs">Alt tekst</Label>
              <Input value={val.alt || ''} onChange={(e) => setField('alt', e.target.value)} className="h-9 text-xs" />
            </div>
          )}
          <StyleControls style={style} onChange={patchStyle} variant="box" />
        </>
      )}


      {selectedType === 'avatar' && (
        <ImageInput
          label="Avatar (zdjęcie osoby)"
          value={typeof val === 'object' && val ? val.url || '' : ''}
          onChange={(v) => setField('url', v)}
        />
      )}

      {selectedType === 'logo' && (
        <>
          <ImageInput
            label="Logo"
            value={val?.url || ''}
            onChange={(v) => setField('url', v)}
          />
          <div>
            <Label className="text-xs">Alt / nazwa</Label>
            <Input value={val?.alt || ''} onChange={(e) => setField('alt', e.target.value)} className="h-9 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Link (opcjonalnie)</Label>
            <Input value={val?.link || ''} onChange={(e) => setField('link', e.target.value)} className="h-9 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Wysokość (px)</Label>
            <Input
              type="number"
              value={val?.heightPx ?? ''}
              onChange={(e) => setField('heightPx', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="np. 64"
              className="h-9 text-xs"
            />
          </div>
        </>
      )}

      {selectedType === 'icon' && (
        <>
          <IconInput value={typeof val === 'string' ? val : ''} onChange={(v) => setVal(v)} />
          <StyleControls style={style} onChange={patchStyle} variant="icon" />
        </>
      )}

      {selectedType === 'button' && (() => {
        // Ensure val is a CtaConfig object; if not, initialize from legacy flat fields.
        const cta = (val && typeof val === 'object') ? val : { text: '', url: '' };
        return (
          <>
            <div>
              <Label className="text-xs">Tekst przycisku</Label>
              <Input
                value={cta.text || ''}
                onChange={(e) => setVal({ ...cta, text: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <LinkPicker
              url={cta.url || ''}
              kind={cta.kind}
              onChange={({ url, kind }) => setVal({ ...cta, url, kind })}
            />
            <StyleControls style={style} onChange={patchStyle} variant="box" />
          </>
        );
      })()}


      {selectedType === 'stat' && (
        <>
          <div>
            <Label className="text-xs">Ikona</Label>
            <IconInput value={val?.icon || ''} onChange={(v) => setField('icon', v)} />
          </div>
          <div>
            <Label className="text-xs">Liczba / wartość</Label>
            <Input value={val?.value || ''} onChange={(e) => setField('value', e.target.value)} className="h-9 text-sm font-bold" />
          </div>
          <div>
            <Label className="text-xs">Podpis</Label>
            <Textarea value={val?.label || ''} onChange={(e) => setField('label', e.target.value)} rows={2} className="text-sm" />
          </div>
          <StyleControls style={style} onChange={patchStyle} variant="box" />
        </>
      )}

      {selectedType === 'card' && (
        <>
          <div>
            <Label className="text-xs">Ikona</Label>
            <IconInput value={val?.icon || ''} onChange={(v) => setField('icon', v)} />
          </div>
          <div>
            <Label className="text-xs">Tytuł</Label>
            <Input value={val?.title || ''} onChange={(e) => setField('title', e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Opis</Label>
            <Textarea value={val?.description || ''} onChange={(e) => setField('description', e.target.value)} rows={3} className="text-sm" />
          </div>
          <StyleControls style={style} onChange={patchStyle} variant="box" />
        </>
      )}

      {selectedType === 'video' && (() => {
        // The `community.video` path stores full community object; edit its videoUrl/poster/autoplay.
        // But when val is a string (legacy), fall back to raw url.
        const community = getByPath(content, 'community') || {};
        return (
          <div className="space-y-3">
            <VideoInput
              label="Wideo (MP4 / YouTube / Vimeo)"
              value={community.videoUrl || ''}
              onChange={(v) => onChange(setByPath(content, 'community.videoUrl', v))}
            />
            <ImageInput
              label="Poster (miniatura widoczna przed odtworzeniem)"
              value={community.videoPoster || ''}
              onChange={(v) => onChange(setByPath(content, 'community.videoPoster', v))}
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={!!community.videoAutoplay}
                onChange={(e) => onChange(setByPath(content, 'community.videoAutoplay', e.target.checked))}
              />
              Autoodtwarzanie (wyciszone — zgodnie z polityką przeglądarek)
            </label>
            <div className="text-[11px] text-muted-foreground border-t pt-2">
              Wskazówka: dla YouTube wklej link w postaci <code>https://youtu.be/ID</code> lub <code>https://www.youtube.com/watch?v=ID</code>.
            </div>
          </div>
        );
      })()}

      <LayoutControls style={style} onChange={patchStyle} />

      {/* Add-to-list buttons where relevant */}
      {listInfo && (
        <div className="border-t pt-3">
          <AddSiblingButton listPath={listInfo.listPath} content={content} onChange={onChange} />
        </div>
      )}
        </>)}
      </div>
    </div>
  );
};

/** Editor for a dynamic widget's props (context-sensitive by kind). */
function WidgetPropsEditor({ widget, onChange }: { widget: Widget; onChange: (w: Widget) => void }) {
  const p = widget.props || {};
  const set = (patch: Record<string, any>) => onChange({ ...widget, props: { ...p, ...patch } });

  switch (widget.kind) {
    case 'heading':
      return (
        <>
          <div>
            <Label className="text-xs">Tekst nagłówka</Label>
            <Input value={p.text || ''} onChange={(e) => set({ text: e.target.value })} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Poziom</Label>
            <select value={p.level || 'h2'} onChange={(e) => set({ level: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="h1">H1</option><option value="h2">H2</option><option value="h3">H3</option><option value="h4">H4</option>
            </select>
          </div>
        </>
      );
    case 'text':
      return (
        <div>
          <Label className="text-xs">Treść</Label>
          <Textarea value={p.text || ''} onChange={(e) => set({ text: e.target.value })} rows={4} className="text-sm" />
        </div>
      );
    case 'image':
      return (
        <>
          <ImageInput label="URL obrazu" value={p.url || ''} onChange={(v) => set({ url: v })} />
          <div>
            <Label className="text-xs">Alt tekst</Label>
            <Input value={p.alt || ''} onChange={(e) => set({ alt: e.target.value })} className="h-9 text-xs" />
          </div>
        </>
      );
    case 'video':
      return <VideoInput label="URL wideo (MP4 / YouTube / Vimeo)" value={p.url || ''} onChange={(v) => set({ url: v })} />;
    case 'button':
      return (
        <>
          <div>
            <Label className="text-xs">Tekst przycisku</Label>
            <Input value={p.text || ''} onChange={(e) => set({ text: e.target.value })} className="h-9 text-sm" />
          </div>
          <LinkPicker url={p.url || ''} kind={p.kind} onChange={({ url, kind }) => set({ url, kind })} />
        </>
      );
    case 'icon':
      return <IconInput value={p.name || ''} onChange={(v) => set({ name: v })} />;
    case 'card':
      return (
        <>
          <div><Label className="text-xs">Ikona</Label><IconInput value={p.icon || ''} onChange={(v) => set({ icon: v })} /></div>
          <div><Label className="text-xs">Tytuł</Label><Input value={p.title || ''} onChange={(e) => set({ title: e.target.value })} className="h-9 text-sm" /></div>
          <div><Label className="text-xs">Opis</Label><Textarea value={p.description || ''} onChange={(e) => set({ description: e.target.value })} rows={3} className="text-sm" /></div>
        </>
      );
    case 'stat':
      return (
        <>
          <div><Label className="text-xs">Wartość</Label><Input value={p.value || ''} onChange={(e) => set({ value: e.target.value })} className="h-9 text-sm font-bold" /></div>
          <div><Label className="text-xs">Podpis</Label><Input value={p.label || ''} onChange={(e) => set({ label: e.target.value })} className="h-9 text-sm" /></div>
        </>
      );
    case 'bullet-list': {
      const items: string[] = Array.isArray(p.items) ? p.items : [];
      const setItem = (i: number, v: string) => set({ items: items.map((x, j) => j === i ? v : x) });
      const remove = (i: number) => set({ items: items.filter((_, j) => j !== i) });
      const add = () => set({ items: [...items, 'Nowy punkt'] });
      return (
        <div className="space-y-2">
          <Label className="text-xs">Punkty listy</Label>
          {items.map((it, i) => (
            <div key={i} className="flex gap-1">
              <Input value={it} onChange={(e) => setItem(i, e.target.value)} className="h-9 text-sm" />
              <Button size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={add} className="w-full"><Plus className="w-3 h-3 mr-1" /> Dodaj punkt</Button>
        </div>
      );
    }
    case 'logo-row': {
      const logos: Array<{ url: string; alt?: string }> = Array.isArray(p.logos) ? p.logos : [];
      const setLogo = (i: number, patch: Partial<{ url: string; alt: string }>) => set({ logos: logos.map((l, j) => j === i ? { ...l, ...patch } : l) });
      const remove = (i: number) => set({ logos: logos.filter((_, j) => j !== i) });
      const add = () => set({ logos: [...logos, { url: '', alt: '' }] });
      return (
        <div className="space-y-3">
          <Label className="text-xs">Logotypy</Label>
          {logos.map((l, i) => (
            <div key={i} className="space-y-1 border rounded-md p-2">
              <ImageInput label={`Logo #${i + 1}`} value={l.url} onChange={(v) => setLogo(i, { url: v })} />
              <div className="flex gap-1">
                <Input value={l.alt || ''} onChange={(e) => setLogo(i, { alt: e.target.value })} placeholder="Alt / nazwa" className="h-8 text-xs" />
                <Button size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={add} className="w-full"><Plus className="w-3 h-3 mr-1" /> Dodaj logo</Button>
        </div>
      );
    }
    case 'grid':
      return (
        <div>
          <Label className="text-xs">Liczba kolumn (1–6)</Label>
          <Input type="number" min={1} max={6} value={p.cols || 3} onChange={(e) => set({ cols: Math.max(1, Math.min(6, Number(e.target.value) || 1)) })} className="h-9 text-sm" />
        </div>
      );
    case 'section':
      return (
        <div>
          <Label className="text-xs">Tytuł sekcji</Label>
          <Input value={p.title || ''} onChange={(e) => set({ title: e.target.value })} className="h-9 text-sm" />
        </div>
      );
    case 'spacer':
      return (
        <div>
          <Label className="text-xs">Wysokość (px)</Label>
          <Input type="number" value={p.height || 48} onChange={(e) => set({ height: Number(e.target.value) || 0 })} className="h-9 text-sm" />
        </div>
      );
    case 'collapsible': {
      const items: Array<{ title: string; body: string }> = Array.isArray(p.items) ? p.items : [];
      const setItem = (i: number, patch: Partial<{ title: string; body: string }>) => set({ items: items.map((x, j) => j === i ? { ...x, ...patch } : x) });
      const remove = (i: number) => set({ items: items.filter((_, j) => j !== i) });
      const add = () => set({ items: [...items, { title: 'Nowe pytanie', body: 'Odpowiedź.' }] });
      return (
        <div className="space-y-3">
          <Label className="text-xs">Sekcje zwijane</Label>
          {items.map((it, i) => (
            <div key={i} className="space-y-1 border rounded-md p-2">
              <Input value={it.title} onChange={(e) => setItem(i, { title: e.target.value })} placeholder="Tytuł" className="h-8 text-xs" />
              <Textarea value={it.body} onChange={(e) => setItem(i, { body: e.target.value })} rows={2} className="text-xs" />
              <Button size="sm" variant="ghost" onClick={() => remove(i)} className="w-full"><Trash2 className="w-3 h-3 mr-1" /> Usuń</Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={add} className="w-full"><Plus className="w-3 h-3 mr-1" /> Dodaj</Button>
        </div>
      );
    }
    case 'container':
    case 'divider':
    default:
      return <div className="text-xs text-muted-foreground">Brak dodatkowych właściwości. Użyj sekcji Pozycja i rozmiar poniżej.</div>;
  }
}


function AddSiblingButton({
  listPath,
  content,
  onChange,
}: {
  listPath: string;
  content: HomepageV2Content;
  onChange: (n: HomepageV2Content) => void;
}) {
  const list = getByPath(content, listPath) || [];
  const template: any = list[0] ? JSON.parse(JSON.stringify(list[0])) : null;
  const add = () => {
    let newItem: any;
    if (listPath.endsWith('features.items')) {
      newItem = { id: uid(), icon: 'Sparkles', title: 'Nowa karta', description: 'Opis' };
    } else if (listPath.endsWith('stats.items')) {
      newItem = { id: uid(), icon: 'Users', value: '100+', label: 'nowa statystyka' };
    } else if (listPath.endsWith('bullets')) {
      newItem = 'Nowy punkt';
    } else if (listPath.endsWith('avatars')) {
      newItem = { id: uid(), url: '' };
    } else if (listPath.endsWith('logos')) {
      newItem = { id: uid(), url: '', alt: 'Nowe logo', link: '' };
    } else if (template) {
      newItem = template;
      if (newItem && typeof newItem === 'object' && 'id' in newItem) newItem.id = uid();
    } else {
      newItem = '';
    }
    onChange(setByPath(content, listPath, [...list, newItem]));
  };
  return (
    <Button size="sm" variant="outline" onClick={add} className="w-full">
      <Plus className="w-3 h-3 mr-2" /> Dodaj element do listy
    </Button>
  );
}
