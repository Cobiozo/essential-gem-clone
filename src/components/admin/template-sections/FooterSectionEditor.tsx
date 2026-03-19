import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const FooterSectionEditor: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });

  const links: Array<{ text: string; url: string }> = config.links || [];
  const social: Array<{ platform: string; url: string }> = config.social || [];

  const addLink = () => update('links', [...links, { text: '', url: '' }]);
  const removeLink = (i: number) => update('links', links.filter((_, idx) => idx !== i));
  const updateLink = (i: number, key: string, value: string) =>
    update('links', links.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));

  const addSocial = () => update('social', [...social, { platform: 'facebook', url: '' }]);
  const removeSocial = (i: number) => update('social', social.filter((_, idx) => idx !== i));
  const updateSocial = (i: number, key: string, value: string) =>
    update('social', social.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));

  return (
    <div className="space-y-4">
      <div>
        <Label>Nazwa firmy</Label>
        <Input value={config.company_name || ''} onChange={e => update('company_name', e.target.value)} />
      </div>
      <div>
        <Label>Adres</Label>
        <Input value={config.address || ''} onChange={e => update('address', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Telefon</Label>
          <Input value={config.phone || ''} onChange={e => update('phone', e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={config.email || ''} onChange={e => update('email', e.target.value)} />
        </div>
      </div>

      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Linki</legend>
        {links.map((link, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div>
              <Label className="text-xs">Tekst</Label>
              <Input value={link.text} onChange={e => updateLink(i, 'text', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">URL</Label>
              <Input value={link.url} onChange={e => updateLink(i, 'url', e.target.value)} />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeLink(i)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addLink}>
          <Plus className="w-4 h-4 mr-1" /> Dodaj link
        </Button>
      </fieldset>

      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Social Media</legend>
        {social.map((s, i) => (
          <div key={i} className="grid grid-cols-[120px_1fr_auto] gap-2 items-end">
            <div>
              <Label className="text-xs">Platforma</Label>
              <Select value={s.platform} onValueChange={v => updateSocial(i, 'platform', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">URL</Label>
              <Input value={s.url} onChange={e => updateSocial(i, 'url', e.target.value)} />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeSocial(i)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addSocial}>
          <Plus className="w-4 h-4 mr-1" /> Dodaj social
        </Button>
      </fieldset>

      <div>
        <Label>Tekst copyright (opcja)</Label>
        <Input value={config.copyright_text || ''} onChange={e => update('copyright_text', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Kolor tła</Label>
          <Input value={config.bg_color || '#0a1628'} onChange={e => update('bg_color', e.target.value)} />
        </div>
        <div>
          <Label>Kolor tekstu</Label>
          <Input value={config.text_color || '#ffffff'} onChange={e => update('text_color', e.target.value)} />
        </div>
      </div>
    </div>
  );
};
