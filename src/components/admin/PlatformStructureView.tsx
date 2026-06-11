import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  FileSpreadsheet,
  FileText,
  FileCode,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  buildTree,
  summarize,
  exportToExcel,
  exportToWord,
  exportToHtml,
  ROLE_LABELS,
  type PlatformProfile,
  type PlatformNode,
} from './exports/platformStructureExport';
import PlatformUserDetailsDialog from './PlatformUserDetailsDialog';

interface RoleRow { user_id: string; role: string }

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

function fullName(p: PlatformProfile) {
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || (p.email ?? p.user_id);
}

async function fetchProfiles(): Promise<PlatformProfile[]> {
  const all: PlatformProfile[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'user_id, first_name, last_name, email, eq_id, upline_eq_id, phone_number, country, city, is_active, blocked_at, created_at, avatar_url',
      )
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as PlatformProfile[];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function fetchRoles(): Promise<Map<string, string[]>> {
  const m = new Map<string, string[]>();
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as RoleRow[];
    rows.forEach((r) => {
      const list = m.get(r.user_id) ?? [];
      list.push(r.role);
      m.set(r.user_id, list);
    });
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return m;
}

const PlatformStructureView: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [forceAllExpanded, setForceAllExpanded] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const profilesQ = useQuery({
    queryKey: ['platform-structure-profiles'],
    queryFn: fetchProfiles,
    staleTime: 60_000,
  });
  const rolesQ = useQuery({
    queryKey: ['platform-structure-roles'],
    queryFn: fetchRoles,
    staleTime: 60_000,
  });

  // Realtime
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const schedule = () => {
      if (document.visibilityState !== 'visible') return;
      if (debRef.current) clearTimeout(debRef.current);
      debRef.current = setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['platform-structure-profiles'] });
        qc.invalidateQueries({ queryKey: ['platform-structure-roles'] });
      }, 1500);
    };
    const ch = supabase
      .channel('admin-platform-structure')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, schedule)
      .subscribe();
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const { roots, allNodes } = useMemo(() => {
    const profiles = profilesQ.data ?? [];
    const roles = rolesQ.data ?? new Map<string, string[]>();
    const t = buildTree(profiles, roles);
    return { roots: t.roots, allNodes: t.allNodes };
  }, [profilesQ.data, rolesQ.data]);

  const summary = useMemo(() => summarize(allNodes), [allNodes]);

  // Compute filtered tree by search — keep ancestors of matching nodes.
  const { displayRoots, matchedIds } = useMemo(() => {
    if (!debouncedSearch) return { displayRoots: roots, matchedIds: null as Set<string> | null };
    const q = debouncedSearch;
    const matches = (n: PlatformNode) => {
      const p = n.profile;
      return (
        (p.user_id && p.user_id.toLowerCase().includes(q)) ||
        (p.eq_id && p.eq_id.toLowerCase().includes(q)) ||
        (p.first_name && p.first_name.toLowerCase().includes(q)) ||
        (p.last_name && p.last_name.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.phone_number && p.phone_number.toLowerCase().includes(q))
      );
    };
    const matchedIds = new Set<string>();
    const filterNode = (n: PlatformNode): PlatformNode | null => {
      const childResults = n.children.map(filterNode).filter(Boolean) as PlatformNode[];
      const self = matches(n);
      if (self || childResults.length) {
        if (self) matchedIds.add(n.profile.user_id);
        return { ...n, children: childResults };
      }
      return null;
    };
    const filtered = roots.map(filterNode).filter(Boolean) as PlatformNode[];
    return { displayRoots: filtered, matchedIds };
  }, [roots, debouncedSearch]);

  const isLoading = profilesQ.isLoading || rolesQ.isLoading;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const ids = new Set<string>();
    const walk = (n: PlatformNode) => {
      ids.add(n.profile.user_id);
      n.children.forEach(walk);
    };
    displayRoots.forEach(walk);
    setExpanded(ids);
    setForceAllExpanded(true);
  };
  const collapseAll = () => {
    setExpanded(new Set());
    setForceAllExpanded(false);
  };

  const refresh = async () => {
    await Promise.all([profilesQ.refetch(), rolesQ.refetch()]);
    toast({ title: 'Odświeżono', description: 'Struktura platformy została odświeżona.' });
  };

  const doExport = async (kind: 'xlsx' | 'docx' | 'html') => {
    try {
      if (kind === 'xlsx') exportToExcel(roots, allNodes);
      else if (kind === 'docx') await exportToWord(roots, allNodes);
      else exportToHtml(roots, allNodes);
    } catch (e: any) {
      toast({ title: 'Błąd eksportu', description: e?.message ?? 'Nieznany błąd', variant: 'destructive' });
    }
  };

  // Render a node
  const renderNode = (n: PlatformNode): React.ReactNode => {
    const hasChildren = n.children.length > 0;
    const isOpen = expanded.has(n.profile.user_id) || (!!debouncedSearch);
    const isAdmin = n.roles.includes('admin');
    const isBlocked = n.profile.blocked_at || n.profile.is_active === false;
    const isMatch = matchedIds?.has(n.profile.user_id);

    return (
      <div key={n.profile.user_id} className="border-l border-border ml-1 pl-1.5 sm:ml-2 sm:pl-2">
        <div
          className={`group flex flex-col sm:flex-row sm:items-center gap-x-1.5 gap-y-1 py-1 px-1 rounded text-xs ${
            isAdmin ? 'bg-destructive/5 border border-destructive/30' : ''
          } ${isMatch ? 'ring-1 ring-primary/60' : ''}`}
        >
          <div className="flex items-center gap-1.5 min-w-0 w-full sm:w-auto sm:flex-1">
            <button
              type="button"
              onClick={() => hasChildren && toggle(n.profile.user_id)}
              className={`shrink-0 w-6 h-6 sm:w-4 sm:h-4 flex items-center justify-center text-muted-foreground ${
                hasChildren ? 'hover:text-foreground' : 'opacity-0 pointer-events-none'
              }`}
              aria-label={isOpen ? 'Zwiń' : 'Rozwiń'}
            >
              <ChevronRight
                className={`h-4 w-4 sm:h-3.5 sm:w-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`}
              />
            </button>
            {isAdmin && <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />}
            <span className="font-medium truncate flex-1 min-w-0">{fullName(n.profile)}</span>
            <span className="text-[10px] text-muted-foreground shrink-0 sm:hidden">
              {hasChildren && <>({n.directCount}) </>}
              {n.downlineCount > 0 && <>Σ{n.downlineCount}</>}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pl-7 sm:pl-0 min-w-0">
            {n.roles.map((r) => (
              <Badge
                key={r}
                className={`${ROLE_BADGE_CLASS[r] ?? 'bg-secondary text-secondary-foreground'} text-[9px] px-1 py-0 h-4 font-semibold uppercase tracking-wide`}
              >
                {ROLE_LABELS[r] ?? r}
              </Badge>
            ))}
            {n.profile.eq_id && (
              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 rounded whitespace-nowrap">
                {n.profile.eq_id}
              </span>
            )}
            {isBlocked && (
              <span className="text-[9px] uppercase font-semibold text-destructive">Zablok.</span>
            )}
          </div>

          <span className="hidden sm:inline ml-auto text-[10px] text-muted-foreground shrink-0">
            {hasChildren && <>({n.directCount}) </>}
            {n.downlineCount > 0 && <>Σ{n.downlineCount}</>}
          </span>
        </div>

        {isOpen && (
          <div className="ml-7 sm:ml-4 text-[10px] text-muted-foreground py-0.5 flex flex-col sm:flex-row sm:flex-wrap gap-x-3 gap-y-0.5">
            {n.profile.email && (
              <a href={`mailto:${n.profile.email}`} className="inline-flex items-center gap-1 hover:text-primary break-all">
                <Mail className="h-3 w-3 shrink-0" /> <span className="break-all">{n.profile.email}</span>
              </a>
            )}
            {n.profile.phone_number && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3 shrink-0" /> {n.profile.phone_number}
              </span>
            )}
            {(n.profile.city || n.profile.country) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {[n.profile.city, n.profile.country].filter(Boolean).join(', ')}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              {new Date(n.profile.created_at).toLocaleDateString('pl-PL')}
            </span>
            {n.uplinePath && <span className="opacity-70 break-all">Upline: {n.uplinePath}</span>}
          </div>
        )}

        {isOpen && hasChildren && <div className="mt-0.5">{n.children.map(renderNode)}</div>}
      </div>
    );
  };

  // Disable forceAllExpanded indicator on next toggle
  useEffect(() => {
    if (forceAllExpanded && expanded.size === 0) setForceAllExpanded(false);
  }, [expanded, forceAllExpanded]);

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <Card>
        <CardContent className="p-2 sm:p-3 space-y-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj: ID, EQ ID, imię, nazwisko, e-mail, telefon…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9 text-base sm:text-sm"
            />
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Odśwież
            </Button>
            <Button size="sm" variant="outline" onClick={forceAllExpanded ? collapseAll : expandAll}>
              {forceAllExpanded ? (
                <>
                  <ChevronsDownUp className="h-4 w-4 mr-1.5" /> Zwiń
                </>
              ) : (
                <>
                  <ChevronsUpDown className="h-4 w-4 mr-1.5" /> Rozwiń wszystko
                </>
              )}
            </Button>
            <div className="hidden sm:block w-px h-6 bg-border mx-1" />
            <Button size="sm" variant="outline" onClick={() => doExport('xlsx')} className="col-span-2 sm:col-span-1">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => doExport('docx')}>
              <FileText className="h-4 w-4 mr-1.5" /> Word
            </Button>
            <Button size="sm" variant="outline" onClick={() => doExport('html')}>
              <FileCode className="h-4 w-4 mr-1.5" /> HTML
            </Button>
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-1 text-[11px]">
            <Badge variant="secondary" className="h-5 px-1.5">
              Razem: <b className="ml-1">{summary.total}</b>
            </Badge>
            <Badge variant="secondary" className="h-5 px-1.5">
              Aktywni: <b className="ml-1 text-green-700">{summary.activeCount}</b>
            </Badge>
            <Badge variant="secondary" className="h-5 px-1.5">
              Zablokowani: <b className="ml-1 text-destructive">{summary.blockedCount}</b>
            </Badge>
            <Badge variant="secondary" className="h-5 px-1.5">
              Z uplinem: <b className="ml-1">{summary.withUpline}</b>
            </Badge>
            <Badge variant="secondary" className="h-5 px-1.5">
              Korzeni: <b className="ml-1">{summary.rootCount}</b>
            </Badge>
            {Object.entries(summary.byRole)
              .sort((a, b) => b[1] - a[1])
              .map(([role, count]) => (
                <Badge
                  key={role}
                  className={`h-5 px-1.5 ${ROLE_BADGE_CLASS[role] ?? 'bg-secondary text-secondary-foreground'}`}
                >
                  {ROLE_LABELS[role] ?? role}: <b className="ml-1">{count}</b>
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Tree */}
      <Card>
        <CardContent className="p-2 sm:p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Ładowanie struktury…
            </div>
          ) : displayRoots.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {debouncedSearch ? 'Brak wyników wyszukiwania.' : 'Brak użytkowników do wyświetlenia.'}
            </div>
          ) : (
            <div className="font-medium">
              {displayRoots.map(renderNode)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformStructureView;
