import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { OmegaTestInput } from '@/hooks/useOmegaTests';
import { OmegaTestClient } from '@/hooks/useOmegaTestClients';

interface ClientTestFormProps {
  client: OmegaTestClient;
  onSubmit: (data: OmegaTestInput) => void;
  isLoading?: boolean;
}

export const ClientTestForm: React.FC<ClientTestFormProps> = ({ client, onSubmit, isLoading }) => {
  const [date, setDate] = useState<Date>(new Date());
  const [handedDate, setHandedDate] = useState<Date | undefined>(undefined);
  const [omega3Index, setOmega3Index] = useState('');
  const [omega6_3Ratio, setOmega6_3Ratio] = useState('');
  const [aa, setAa] = useState('');
  const [epa, setEpa] = useState('');
  const [dha, setDha] = useState('');
  const [la, setLa] = useState('');
  const [notes, setNotes] = useState('');

  const [reminder25, setReminder25] = useState(true);
  const [reminder120, setReminder120] = useState(true);
  const [notifyPartner, setNotifyPartner] = useState(true);
  const [notifyClient, setNotifyClient] = useState(false);

  const hasEmail = !!client.email;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      client_id: client.id,
      test_date: format(date, 'yyyy-MM-dd'),
      test_handed_date: handedDate ? format(handedDate, 'yyyy-MM-dd') : null,
      omega3_index: omega3Index ? parseFloat(omega3Index) : null,
      omega6_3_ratio: omega6_3Ratio ? parseFloat(omega6_3Ratio) : null,
      aa: aa ? parseFloat(aa) : null,
      epa: epa ? parseFloat(epa) : null,
      dha: dha ? parseFloat(dha) : null,
      la: la ? parseFloat(la) : null,
      notes: notes || null,
      reminder_25d_enabled: reminder25,
      reminder_120d_enabled: reminder120,
      notify_partner_email: notifyPartner,
      notify_client_email: hasEmail ? notifyClient : false,
    });
    setOmega3Index('');
    setOmega6_3Ratio('');
    setAa('');
    setEpa('');
    setDha('');
    setLa('');
    setNotes('');
  };

  const remind25Date = addDays(date, 25);
  const remind120Date = addDays(date, 120);

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-xl border border-border/30 bg-card/50">
      <h3 className="text-sm font-semibold">Dodaj wynik testu klienta</h3>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Data wykonania testu</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal h-9 text-sm')}>
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {format(date, 'dd MMM yyyy', { locale: pl })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Data wręczenia (opcj.)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal h-9 text-sm', !handedDate && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {handedDate ? format(handedDate, 'dd MMM yyyy', { locale: pl }) : 'Brak'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={handedDate} onSelect={setHandedDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Stosunek Omega-6:3</Label>
          <Input type="number" step="0.1" placeholder="np. 15.2" value={omega6_3Ratio} onChange={e => setOmega6_3Ratio(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Indeks Omega-3 (%)</Label>
          <Input type="number" step="0.1" placeholder="np. 3.1" value={omega3Index} onChange={e => setOmega3Index(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">AA (%)</Label>
          <Input type="number" step="0.01" value={aa} onChange={e => setAa(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">EPA (%)</Label>
          <Input type="number" step="0.01" value={epa} onChange={e => setEpa(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">DHA (%)</Label>
          <Input type="number" step="0.01" value={dha} onChange={e => setDha(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">LA (%)</Label>
          <Input type="number" step="0.01" value={la} onChange={e => setLa(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Notatka</Label>
        <Textarea placeholder="Obserwacje, uwagi, kontekst kuracji..." value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px] text-sm" />
      </div>

      <div className="rounded-lg border border-border/30 bg-background/40 p-3 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Przypomnienia</h4>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">+25 dni — odbiór wyniku</Label>
            <p className="text-[11px] text-muted-foreground">{format(remind25Date, 'dd MMM yyyy', { locale: pl })}</p>
          </div>
          <Switch checked={reminder25} onCheckedChange={setReminder25} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">+120 dni — test porównawczy</Label>
            <p className="text-[11px] text-muted-foreground">{format(remind120Date, 'dd MMM yyyy', { locale: pl })}</p>
          </div>
          <Switch checked={reminder120} onCheckedChange={setReminder120} />
        </div>

        <div className="border-t border-border/20 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Powiadom mnie (in‑app + e‑mail)</Label>
            <Switch checked={notifyPartner} onCheckedChange={setNotifyPartner} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Powiadom też klienta mailem</Label>
              {!hasEmail && (
                <p className="text-[11px] text-muted-foreground">Dodaj e-mail klienta, aby aktywować</p>
              )}
            </div>
            <Switch checked={notifyClient} onCheckedChange={setNotifyClient} disabled={!hasEmail} />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" variant="action" disabled={isLoading}>
        <Save className="h-4 w-4 mr-2" />
        ZAPISZ WYNIK KLIENTA
      </Button>
    </form>
  );
};
