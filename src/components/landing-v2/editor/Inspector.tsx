import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowUp, ArrowDown, Plus, Copy } from 'lucide-react';
import type { HomepageV2Content, EditElementType } from '@/types/homepageV2';
import { getByPath, setByPath, getStyle, updateStyle, parseListItemPath, uid } from './pathUtils';
import { StyleControls } from './StyleControls';
import { ImageInput } from './inputs/ImageInput';
import { IconInput } from './inputs/IconInput';

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
};

export const Inspector: React.FC<Props> = ({
  content,
  onChange,
  selectedPath,
  selectedType,
  onSelect,
}) => {
  if (!selectedPath || !selectedType) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        <div className="text-lg mb-2">👆</div>
        Kliknij dowolny element w podglądzie po lewej, aby go edytować.
        <div className="mt-6 text-xs text-left space-y-2 border-t pt-4">
          <div className="font-semibold text-foreground">Wskazówki:</div>
          <div>• Klikaj w tekst, obraz, ikonę lub przycisk — otworzy się dedykowany edytor.</div>
          <div>• Na kartach, statystykach i avatarach użyj strzałek, aby zmienić kolejność.</div>
          <div>• Wszystkie zmiany są zapisywane jako <b>draft</b> — publikacja jednym kliknięciem.</div>
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {TYPE_LABEL[selectedType]}
          </div>
          <div className="text-xs font-mono text-muted-foreground break-all">{selectedPath}</div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onSelect(null, null)}>Zamknij</Button>
      </div>

      {listInfo && (
        <div className="flex gap-1 border-b pb-3">
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

      {selectedType === 'image' && (
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

      {selectedType === 'button' && (
        <>
          <div>
            <Label className="text-xs">Tekst przycisku</Label>
            <Input
              value={val?.text || ''}
              onChange={(e) => setField('text', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Link (URL)</Label>
            <Input
              value={val?.url || ''}
              onChange={(e) => setField('url', e.target.value)}
              placeholder="/auth lub https://..."
              className="h-9 text-xs"
            />
          </div>
          <StyleControls style={style} onChange={patchStyle} variant="box" />
        </>
      )}

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

      {selectedType === 'video' && (
        <>
          <div>
            <Label className="text-xs">URL wideo (YouTube / plik)</Label>
            <Input value={typeof val === 'string' ? val : ''} onChange={(e) => setVal(e.target.value)} className="h-9 text-xs" />
          </div>
        </>
      )}

      {/* Add-to-list buttons where relevant */}
      {listInfo && (
        <div className="border-t pt-3">
          <AddSiblingButton listPath={listInfo.listPath} content={content} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

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
      newItem = { id: uid(), url: '', alt: '', link: '' };
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
