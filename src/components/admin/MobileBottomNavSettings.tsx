import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMobileBottomNav, type MobileBottomNavItem } from '@/hooks/useMobileBottomNav';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Plus, ArrowUp, ArrowDown, Smartphone, MapPin } from 'lucide-react';
import MobileNavPathPicker from './MobileNavPathPicker';
import { APP_LOCATIONS, ICON_CHOICES } from './mobileNavRegistry';

const ROLE_FIELDS: Array<{ key: keyof MobileBottomNavItem; label: string }> = [
  { key: 'visible_to_client', label: 'Klient' },
  { key: 'visible_to_partner', label: 'Partner' },
  { key: 'visible_to_specjalista', label: 'Specjalista' },
  { key: 'visible_to_leader', label: 'Leader' },
  { key: 'visible_to_admin', label: 'Admin' },
];

const pathLabel = (p: string) => APP_LOCATIONS.find((l) => l.path === p)?.label || 'Ścieżka własna';

const MobileBottomNavSettings: React.FC = () => {
  const { items, refetch } = useMobileBottomNav();
  const [saving, setSaving] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const activeCount = items.filter((i) => i.is_active).length;

  const update = async (id: string, patch: Partial<MobileBottomNavItem>) => {
    setSaving(id);
    const { error } = await (supabase as any)
      .from('mobile_bottom_nav_items').update(patch).eq('id', id);
    setSaving(null);
    if (error) toast.error('Błąd zapisu: ' + error.message);
    else refetch();
  };

  const remove = async (id: string) => {
    if (activeCount <= 5 && items.find((i) => i.id === id)?.is_active) {
      toast.error('Musi pozostać co najmniej 5 aktywnych pozycji.');
      return;
    }
    if (!confirm('Usunąć pozycję?')) return;
    const { error } = await (supabase as any)
      .from('mobile_bottom_nav_items').delete().eq('id', id);
    if (error) toast.error('Błąd: ' + error.message);
    else { toast.success('Usunięto'); refetch(); }
  };

  const add = async () => {
    const maxPos = items.reduce((m, i) => Math.max(m, i.position), -1);
    const { error } = await (supabase as any)
      .from('mobile_bottom_nav_items').insert({
        label: 'Nowa pozycja',
        icon_name: 'Circle',
        target_path: '/dashboard',
        position: maxPos + 1,
      });
    if (error) toast.error('Błąd: ' + error.message);
    else { toast.success('Dodano pozycję'); refetch(); }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const a = items[idx];
    const b = items[idx + dir];
    if (!a || !b) return;
    await (supabase as any).from('mobile_bottom_nav_items').update({ position: b.position }).eq('id', a.id);
    await (supabase as any).from('mobile_bottom_nav_items').update({ position: a.position }).eq('id', b.id);
    refetch();
  };

  const pickerItem = pickerFor ? items.find((i) => i.id === pickerFor) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          Dolny pasek nawigacji (mobile)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pasek widoczny tylko na telefonach po zalogowaniu. Wymagane minimum 5 aktywnych pozycji.
          Ikonę wybierasz z listy, a ścieżkę — klikając konkretne miejsce w aplikacji.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((it, idx) => {
          const IconCmp = (Icons as any)[it.icon_name] || (Icons as any).Circle;
          const TargetIconName = APP_LOCATIONS.find((l) => l.path === it.target_path)?.iconName || 'MapPin';
          const TargetIcon = (Icons as any)[TargetIconName] || MapPin;
          return (
            <div key={it.id} className="border rounded-lg p-3 space-y-3 bg-card">
              <div className="flex items-center gap-2">
                <IconCmp className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">{it.label}</span>
                <Button variant="ghost" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Switch
                  checked={it.is_active}
                  disabled={saving === it.id}
                  onCheckedChange={(v) => {
                    if (!v && activeCount <= 5) {
                      toast.error('Musi pozostać co najmniej 5 aktywnych pozycji.');
                      return;
                    }
                    update(it.id, { is_active: v });
                  }}
                />
                <Button variant="ghost" size="icon" onClick={() => remove(it.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Etykieta</Label>
                  <Input defaultValue={it.label} onBlur={(e) => e.target.value !== it.label && update(it.id, { label: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Ikona</Label>
                  <Select value={it.icon_name} onValueChange={(v) => update(it.id, { icon_name: v })}>
                    <SelectTrigger>
                      <SelectValue>
                        <span className="flex items-center gap-2">
                          <IconCmp className="h-4 w-4" />
                          {it.icon_name}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {ICON_CHOICES.map((name) => {
                        const Cmp = (Icons as any)[name] || Icons.Circle;
                        return (
                          <SelectItem key={name} value={name}>
                            <span className="flex items-center gap-2">
                              <Cmp className="h-4 w-4" />
                              {name}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Miejsce w aplikacji</Label>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => setPickerFor(it.id)}
                  >
                    <TargetIcon className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-left truncate">
                      {pathLabel(it.target_path)}
                      <span className="text-muted-foreground text-xs ml-1">· {it.target_path}</span>
                    </span>
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                {ROLE_FIELDS.map((r) => (
                  <label key={r.key} className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={Boolean(it[r.key])}
                      onCheckedChange={(v) => update(it.id, { [r.key]: v } as any)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        <Button onClick={add} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Dodaj pozycję
        </Button>

        {activeCount < 5 && (
          <p className="text-xs text-destructive">
            Uwaga: aktywnych pozycji jest mniej niż 5. Włącz lub dodaj dodatkowe.
          </p>
        )}
      </CardContent>

      {pickerItem && (
        <MobileNavPathPicker
          open={!!pickerFor}
          onOpenChange={(v) => !v && setPickerFor(null)}
          currentPath={pickerItem.target_path}
          onPick={(path) => {
            const loc = APP_LOCATIONS.find((l) => l.path === path);
            const patch: Partial<MobileBottomNavItem> = { target_path: path };
            // Jeśli wybrano znane miejsce — autouzupełnij etykietę/ikonę gdy są wartościami domyślnymi
            if (loc) {
              if (pickerItem.label === 'Nowa pozycja' || !pickerItem.label) patch.label = loc.label;
              if (pickerItem.icon_name === 'Circle') patch.icon_name = loc.iconName;
            }
            update(pickerItem.id, patch);
          }}
        />
      )}
    </Card>
  );
};

export default MobileBottomNavSettings;
