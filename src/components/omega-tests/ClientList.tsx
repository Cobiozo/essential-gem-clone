import React, { useState } from 'react';
import { OmegaTestClientWithStats } from '@/hooks/useOmegaTestClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Mail, Phone, FlaskConical, BellRing, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ClientListProps {
  clients: OmegaTestClientWithStats[];
  isLoading: boolean;
  onAdd: () => void;
  onSelect: (clientId: string) => void;
  onEdit: (client: OmegaTestClientWithStats) => void;
  onDelete: (clientId: string) => void;
}

export const ClientList: React.FC<ClientListProps> = ({ clients, isLoading, onAdd, onSelect, onEdit, onDelete }) => {
  const [search, setSearch] = useState('');

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj klienta (imię, e-mail, telefon)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="action" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj klienta
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-sm text-muted-foreground py-8">Ładowanie…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-border/40 bg-card/30">
          <FlaskConical className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Brak klientów w bazie testów</p>
          <p className="text-xs text-muted-foreground mt-1">
            Dodaj pierwszego klienta, któremu wręczyłeś test Omega lub którego wynik chcesz zapisać.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="group p-4 rounded-xl border border-border/30 bg-card/50 hover:border-primary/40 hover:bg-card/70 transition-colors flex flex-col gap-2"
            >
              <div className="flex items-start justify-between">
                <button
                  className="text-left flex-1 min-w-0"
                  onClick={() => onSelect(c.id)}
                >
                  <h4 className="font-semibold text-foreground truncate">{c.first_name} {c.last_name}</h4>
                  <div className="text-[11px] text-muted-foreground space-y-0.5 mt-1">
                    {c.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" /><span className="truncate">{c.email}</span></div>}
                    {c.phone && <div className="flex items-center gap-1.5 truncate"><Phone className="h-3 w-3" />{c.phone}</div>}
                  </div>
                </button>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(c.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  {c.tests_count} {c.tests_count === 1 ? 'test' : 'testy'}
                </Badge>
                {c.last_test_date && (
                  <Badge variant="outline" className="text-[10px]">
                    Ostatni: {format(parseISO(c.last_test_date), 'dd MMM yyyy', { locale: pl })}
                  </Badge>
                )}
                {c.next_reminder_date && c.next_reminder_kind && (
                  <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/15">
                    <BellRing className="h-2.5 w-2.5 mr-1" />
                    {c.next_reminder_kind === '25d' ? 'Odbiór wyniku' : 'Test porównawczy'}: {format(parseISO(c.next_reminder_date), 'dd MMM', { locale: pl })}
                    {' '}(za {differenceInCalendarDays(parseISO(c.next_reminder_date), new Date())} dni)
                  </Badge>
                )}
              </div>

              <Button variant="ghost" size="sm" className="justify-between mt-1" onClick={() => onSelect(c.id)}>
                Otwórz testy klienta
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
