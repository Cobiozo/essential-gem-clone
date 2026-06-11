import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Copy,
  ShieldAlert,
  ExternalLink,
  Users,
  Hash,
  IdCard,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS, type PlatformNode } from './exports/platformStructureExport';

const ROLE_BADGE_CLASS: Record<string, string> = {
  admin: 'bg-destructive text-destructive-foreground hover:bg-destructive',
  moderator: 'bg-amber-500 text-white hover:bg-amber-500',
  leader: 'bg-primary text-primary-foreground hover:bg-primary',
  guardian: 'bg-violet-600 text-white hover:bg-violet-600',
  specjalista: 'bg-teal-600 text-white hover:bg-teal-600',
  partner: 'bg-slate-800 text-white hover:bg-slate-800',
  klient: 'bg-slate-400 text-white hover:bg-slate-400',
  client: 'bg-slate-400 text-white hover:bg-slate-400',
  guest_plc: 'bg-slate-200 text-slate-700 hover:bg-slate-200',
};

interface Props {
  node: PlatformNode | null;
  uplineName?: string | null;
  onOpenChange: (open: boolean) => void;
}

const Row: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({
  icon,
  label,
  children,
}) => (
  <div className="flex items-start gap-2 py-1.5 text-sm">
    <span className="text-muted-foreground shrink-0 mt-0.5">{icon}</span>
    <div className="min-w-0 flex-1">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="break-words">{children}</div>
    </div>
  </div>
);

const PlatformUserDetailsDialog: React.FC<Props> = ({ node, uplineName, onOpenChange }) => {
  const { toast } = useToast();
  const open = !!node;

  const copy = async (val: string, label: string) => {
    try {
      await navigator.clipboard.writeText(val);
      toast({ title: 'Skopiowano', description: `${label}: ${val}` });
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się skopiować', variant: 'destructive' });
    }
  };

  if (!node) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const p = node.profile;
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || (p.email ?? p.user_id);
  const initials = name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const isBlocked = !!p.blocked_at || p.is_active === false;
  const isAdmin = node.roles.includes('admin');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14 shrink-0">
              {p.avatar_url ? <AvatarImage src={p.avatar_url} alt={name} /> : null}
              <AvatarFallback
                className={isAdmin ? 'bg-destructive text-destructive-foreground' : ''}
              >
                {initials || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg flex items-center gap-2 flex-wrap">
                {isAdmin && <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />}
                <span className="break-words">{name}</span>
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {node.roles.map((r) => (
                  <Badge
                    key={r}
                    className={`${
                      ROLE_BADGE_CLASS[r] ?? 'bg-secondary text-secondary-foreground'
                    } text-[10px] px-1.5 py-0 h-5 font-semibold uppercase tracking-wide`}
                  >
                    {ROLE_LABELS[r] ?? r}
                  </Badge>
                ))}
                {isBlocked ? (
                  <Badge variant="outline" className="text-destructive border-destructive h-5 text-[10px]">
                    Zablokowany
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-green-700 border-green-700 h-5 text-[10px]">
                    Aktywny
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Kontakt
            </h3>
            <div className="rounded-md border bg-card divide-y">
              <div className="px-3">
                <Row icon={<Mail className="h-4 w-4" />} label="E-mail">
                  {p.email ? (
                    <a className="text-primary hover:underline break-all" href={`mailto:${p.email}`}>
                      {p.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Row>
              </div>
              <div className="px-3">
                <Row icon={<Phone className="h-4 w-4" />} label="Telefon">
                  {p.phone_number ? (
                    <a className="text-primary hover:underline" href={`tel:${p.phone_number}`}>
                      {p.phone_number}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Row>
              </div>
              <div className="px-3">
                <Row icon={<MapPin className="h-4 w-4" />} label="Lokalizacja">
                  {[p.city, p.country].filter(Boolean).join(', ') || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Row>
              </div>
              <div className="px-3">
                <Row icon={<Calendar className="h-4 w-4" />} label="Data rejestracji">
                  {new Date(p.created_at).toLocaleString('pl-PL')}
                </Row>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Konto i struktura
            </h3>
            <div className="rounded-md border bg-card divide-y">
              <div className="px-3">
                <Row icon={<IdCard className="h-4 w-4" />} label="EQ ID">
                  {p.eq_id ? (
                    <button
                      type="button"
                      onClick={() => copy(p.eq_id!, 'EQ ID')}
                      className="font-mono inline-flex items-center gap-1.5 hover:text-primary"
                    >
                      {p.eq_id} <Copy className="h-3 w-3" />
                    </button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Row>
              </div>
              <div className="px-3">
                <Row icon={<Hash className="h-4 w-4" />} label="User ID">
                  <button
                    type="button"
                    onClick={() => copy(p.user_id, 'User ID')}
                    className="font-mono text-xs inline-flex items-center gap-1.5 hover:text-primary break-all text-left"
                  >
                    {p.user_id} <Copy className="h-3 w-3 shrink-0" />
                  </button>
                </Row>
              </div>
              <div className="px-3">
                <Row icon={<Users className="h-4 w-4" />} label="Upline">
                  {p.upline_eq_id ? (
                    <span>
                      <span className="font-mono">{p.upline_eq_id}</span>
                      {uplineName && <span className="text-muted-foreground"> — {uplineName}</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Brak (root)</span>
                  )}
                </Row>
              </div>
              <div className="px-3">
                <Row icon={<Users className="h-4 w-4" />} label="Downline">
                  <span>
                    Bezpośrednio: <b>{node.directCount}</b> · Łącznie:{' '}
                    <b>{node.downlineCount}</b>
                  </span>
                </Row>
              </div>
              {node.uplinePath && (
                <div className="px-3">
                  <Row icon={<Users className="h-4 w-4" />} label="Ścieżka uplinów">
                    <span className="font-mono text-xs break-all">{node.uplinePath}</span>
                  </Row>
                </div>
              )}
              {p.blocked_at && (
                <div className="px-3">
                  <Row icon={<ShieldAlert className="h-4 w-4" />} label="Zablokowany od">
                    <span className="text-destructive">
                      {new Date(p.blocked_at).toLocaleString('pl-PL')}
                    </span>
                  </Row>
                </div>
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row mt-2">
          {p.email && (
            <Button variant="outline" asChild>
              <a href={`mailto:${p.email}`}>
                <Mail className="h-4 w-4 mr-1.5" /> Wyślij e-mail
              </a>
            </Button>
          )}
          <Button variant="outline" asChild>
            <a
              href={`/admin?tab=users&search=${encodeURIComponent(p.eq_id || p.email || p.user_id)}`}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" /> Otwórz w „Użytkownicy"
            </a>
          </Button>
          <Button onClick={() => onOpenChange(false)}>Zamknij</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlatformUserDetailsDialog;
