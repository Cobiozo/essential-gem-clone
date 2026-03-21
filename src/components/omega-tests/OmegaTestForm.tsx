import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { OmegaTestInput } from '@/hooks/useOmegaTests';

interface OmegaTestFormProps {
  onSubmit: (data: OmegaTestInput) => void;
  isLoading?: boolean;
}

export const OmegaTestForm: React.FC<OmegaTestFormProps> = ({ onSubmit, isLoading }) => {
  const [stage, setStage] = useState('test1');
  const [date, setDate] = useState<Date>(new Date());
  const [omega3Index, setOmega3Index] = useState('');
  const [omega6_3Ratio, setOmega6_3Ratio] = useState('');
  const [aa, setAa] = useState('');
  const [epa, setEpa] = useState('');
  const [dha, setDha] = useState('');
  const [la, setLa] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      test_date: format(date, 'yyyy-MM-dd'),
      omega3_index: omega3Index ? parseFloat(omega3Index) : null,
      omega6_3_ratio: omega6_3Ratio ? parseFloat(omega6_3Ratio) : null,
      aa: aa ? parseFloat(aa) : null,
      epa: epa ? parseFloat(epa) : null,
      dha: dha ? parseFloat(dha) : null,
      la: la ? parseFloat(la) : null,
      notes: notes || null,
    });
    setOmega3Index('');
    setOmega6_3Ratio('');
    setAa('');
    setEpa('');
    setDha('');
    setLa('');
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-foreground">Wprowadź Wyniki Testu Vitas</h3>
      
      <div>
        <Label className="text-xs text-muted-foreground">Wybierz etap protokołu</Label>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test1">Test 1 (Początek)</SelectItem>
            <SelectItem value="test2">Test 2 (Miesiąc 5)</SelectItem>
            <SelectItem value="next">Kolejny test</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Data wykonania testu</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !date && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {format(date, 'dd MMM yyyy', { locale: pl })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
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
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">AA (%)</Label>
          <Input type="number" step="0.01" placeholder="np. 7.5" value={aa} onChange={e => setAa(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">EPA (%)</Label>
          <Input type="number" step="0.01" placeholder="np. 1.2" value={epa} onChange={e => setEpa(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">DHA (%)</Label>
          <Input type="number" step="0.01" placeholder="np. 3.8" value={dha} onChange={e => setDha(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">LA (%)</Label>
          <Input type="number" step="0.01" placeholder="np. 18.2" value={la} onChange={e => setLa(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Samopoczucie / Uwagi</Label>
        <Textarea placeholder="Jak się czujesz? Zmiany, obserwacje..." value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px] text-sm" />
      </div>

      <Button type="submit" className="w-full" variant="action" disabled={isLoading}>
        <Save className="h-4 w-4 mr-2" />
        ZAPISZ WYNIKI
      </Button>
    </form>
  );
};
