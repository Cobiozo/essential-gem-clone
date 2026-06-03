import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, MessageCircle } from 'lucide-react';
import {
  ContactConversation,
  ConvChannel,
  ConvSubchannel,
  makeEmptyConversation,
} from '@/hooks/useContactConversations';

interface Props {
  items: ContactConversation[];
  onChange: (items: ContactConversation[]) => void;
  minDate?: string; // added_at
}

const OFFLINE_SUBS: { value: ConvSubchannel; label: string }[] = [
  { value: 'face_to_face', label: 'Spotkanie face to face' },
];

const ONLINE_SUBS: { value: ConvSubchannel; label: string }[] = [
  { value: 'phone', label: 'Rozmowa telefoniczna' },
  { value: 'zoom', label: 'Rozmowa Zoom' },
  { value: 'whatsapp', label: 'Rozmowa WhatsApp' },
  { value: 'messenger', label: 'Rozmowa Messenger' },
  { value: 'other_messenger', label: 'Inne komunikatory' },
  { value: 'social_media', label: 'Social media' },
];

const PHONE_RESULTS = [
  { value: 'answered', label: 'Odebrał' },
  { value: 'no_answer', label: 'Nieodebrane' },
  { value: 'wrong_number', label: 'Błędny numer' },
  { value: 'out_of_range', label: 'Poza zasięgiem' },
] as const;

export const ConversationHistoryEditor: React.FC<Props> = ({ items, onChange, minDate }) => {
  const update = (idx: number, patch: Partial<ContactConversation>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sort_index: i })));
  };

  const add = () => {
    onChange([...items, makeEmptyConversation(items.length)]);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Brak zapisanych rozmów. Dodaj pierwszy wpis, aby rozpocząć historię komunikacji z tym kontaktem.
        </p>
      )}

      {items.map((it, idx) => {
        const subs = it.channel === 'offline' ? OFFLINE_SUBS : it.channel === 'online' ? ONLINE_SUBS : [];
        const showPhoneResult = it.subchannel === 'phone';
        return (
          <div
            key={it.id}
            className="rounded-lg border border-border/60 bg-background/40 p-3 sm:p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MessageCircle className="h-4 w-4 text-primary" />
                Rozmowa #{idx + 1}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(idx)}
                aria-label="Usuń rozmowę"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data kontaktu</Label>
                <Input
                  type="date"
                  value={it.contact_date}
                  min={minDate}
                  onChange={(e) => update(idx, { contact_date: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Kanał</Label>
                <Select
                  value={it.channel || ''}
                  onValueChange={(v) =>
                    update(idx, {
                      channel: v as ConvChannel,
                      subchannel: '',
                      phone_result: '',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz kanał..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {it.channel && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Sposób kontaktu</Label>
                  <Select
                    value={it.subchannel || ''}
                    onValueChange={(v) =>
                      update(idx, {
                        subchannel: v as ConvSubchannel,
                        phone_result: v === 'phone' ? it.phone_result : '',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subs.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showPhoneResult && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Wynik rozmowy telefonicznej</Label>
                  <Select
                    value={(it.phone_result as string) || ''}
                    onValueChange={(v) => update(idx, { phone_result: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz wynik..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PHONE_RESULTS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Data kolejnego kontaktu</Label>
                <Input
                  type="date"
                  value={it.next_contact_date || ''}
                  min={it.contact_date || minDate}
                  onChange={(e) => update(idx, { next_contact_date: e.target.value || null })}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Adnotacja po rozmowie</Label>
                <Textarea
                  value={it.note || ''}
                  onChange={(e) => update(idx, { note: e.target.value || null })}
                  placeholder="Co ustalono, co warto zapamiętać po tej rozmowie..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Dodaj {items.length === 0 ? 'pierwszą' : 'kolejną'} rozmowę
      </Button>
    </div>
  );
};
