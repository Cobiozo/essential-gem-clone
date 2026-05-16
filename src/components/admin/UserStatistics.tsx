import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Users, MapPin, Globe2, UserCheck, UserX, ShieldCheck, Activity,
  Loader2, Download, TrendingUp, Clock, Languages, Crown, Award, Link2, Search
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend, AreaChart, Area,
} from 'recharts';
import { normalizeCountry } from '@/lib/countryFlags';
import UserWorldMap from './UserWorldMap';

type ProfileRow = {
  id: string;
  user_id: string;
  email: string | null;
  role: string | null;
  rank: string | null;
  first_name: string | null;
  last_name: string | null;
  eq_id: string | null;
  is_active: boolean | null;
  blocked_at: string | null;
  country: string | null;
  city: string | null;
  postal_code: string | null;
  street_address: string | null;
  phone_number: string | null;
  specialization: string | null;
  training_language: string | null;
  upline_eq_id: string | null;
  registered_via_reflink: string | null;
  avatar_url: string | null;
  profile_completed: boolean | null;
  accepted_terms: boolean | null;
  accepted_privacy: boolean | null;
  accepted_rodo: boolean | null;
  tutorial_completed: boolean | null;
  tutorial_skipped: boolean | null;
  last_seen_at: string | null;
  created_at: string;
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6', '#f43f5e', '#8b5cf6',
];

async function fetchAllProfiles(): Promise<ProfileRow[]> {
  const PAGE = 1000;
  const all: ProfileRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id,user_id,email,role,rank,first_name,last_name,eq_id,is_active,blocked_at,country,city,postal_code,street_address,phone_number,specialization,training_language,upline_eq_id,registered_via_reflink,avatar_url,profile_completed,accepted_terms,accepted_privacy,accepted_rodo,tutorial_completed,tutorial_skipped,last_seen_at,created_at'
      )
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data || []) as ProfileRow[];
    all.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function Kpi({
  icon: Icon, label, value, sub, tone = 'default',
}: {
  icon: React.ElementType; label: string; value: React.ReactNode; sub?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const toneClass = {
    default: 'text-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-rose-600 dark:text-rose-400',
    info: 'text-sky-600 dark:text-sky-400',
  }[tone];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
            <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
            {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
          </div>
          <Icon className={`h-5 w-5 ${toneClass}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function exportXlsx(filename: string, rows: any[]) {
  import('xlsx').then((XLSX) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dane');
    XLSX.writeFile(wb, filename);
  });
}

function pct(n: number, total: number): string {
  if (!total) return '0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

const UserStatistics: React.FC = () => {
  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ['user-statistics-profiles'],
    queryFn: fetchAllProfiles,
    staleTime: 60_000,
  });

  // Fallback map: city (lowercased) -> country label from geocoder
  const { data: geocacheCountryMap } = useQuery({
    queryKey: ['city-geocache-countries'],
    queryFn: async () => {
      const m = new Map<string, string>();
      const { data } = await supabase
        .from('city_geocache')
        .select('city, display_country')
        .not('display_country', 'is', null)
        .limit(5000);
      (data ?? []).forEach((r: any) => {
        if (r.city && r.display_country) {
          m.set(String(r.city).trim().toLowerCase(), String(r.display_country));
        }
      });
      return m;
    },
    staleTime: 5 * 60_000,
  });

  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [trendBucket, setTrendBucket] = useState<'day' | 'week' | 'month'>('month');
  const [citySearch, setCitySearch] = useState('');

  const stats = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const filtered = countryFilter === 'all'
      ? profiles
      : profiles.filter((p) => (normalizeCountry(p.country).label) === countryFilter);

    const total = filtered.length;
    const active = filtered.filter((p) => p.is_active && !p.blocked_at).length;
    const blocked = filtered.filter((p) => p.blocked_at || p.is_active === false).length;
    const completed = filtered.filter((p) => p.profile_completed).length;
    const allConsents = filtered.filter((p) => p.accepted_terms && p.accepted_privacy && p.accepted_rodo).length;
    const withAvatar = filtered.filter((p) => !!p.avatar_url).length;
    const fromReflink = filtered.filter((p) => !!p.registered_via_reflink).length;
    const withUpline = filtered.filter((p) => !!p.upline_eq_id).length;
    const fullContact = filtered.filter((p) => p.phone_number && p.street_address && p.city && p.country).length;

    const new7 = filtered.filter((p) => now - new Date(p.created_at).getTime() < 7 * day).length;
    const prev7 = filtered.filter((p) => {
      const t = now - new Date(p.created_at).getTime();
      return t >= 7 * day && t < 14 * day;
    }).length;
    const new30 = filtered.filter((p) => now - new Date(p.created_at).getTime() < 30 * day).length;
    const new90 = filtered.filter((p) => now - new Date(p.created_at).getTime() < 90 * day).length;

    const onlineNow = filtered.filter((p) => p.last_seen_at && now - new Date(p.last_seen_at).getTime() < 5 * 60 * 1000).length;
    const active24h = filtered.filter((p) => p.last_seen_at && now - new Date(p.last_seen_at).getTime() < day).length;

    // Countries (use unfiltered to feed the filter dropdown)
    const countryMap = new Map<string, { count: number; flag: string }>();
    profiles.forEach((p) => {
      const c = normalizeCountry(p.country);
      const ex = countryMap.get(c.label) ?? { count: 0, flag: c.flag };
      ex.count++;
      countryMap.set(c.label, ex);
    });
    const countries = [...countryMap.entries()]
      .map(([label, v]) => ({ label, count: v.count, flag: v.flag }))
      .sort((a, b) => b.count - a.count);

    // Cities (respect country filter)
    const cityMap = new Map<string, { count: number; country: string }>();
    filtered.forEach((p) => {
      const city = (p.city ?? '').trim() || 'Nieznane';
      const cityKey = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
      const ex = cityMap.get(cityKey) ?? { count: 0, country: normalizeCountry(p.country).label };
      ex.count++;
      cityMap.set(cityKey, ex);
    });
    const cities = [...cityMap.entries()]
      .map(([label, v]) => ({ label, count: v.count, country: v.country }))
      .sort((a, b) => b.count - a.count);

    // Postal prefixes
    const postalMap = new Map<string, number>();
    filtered.forEach((p) => {
      const code = (p.postal_code ?? '').trim();
      if (!code) return;
      const prefix = code.replace(/[^0-9A-Za-z]/g, '').slice(0, 2).toUpperCase();
      if (!prefix) return;
      postalMap.set(prefix, (postalMap.get(prefix) ?? 0) + 1);
    });
    const postalPrefixes = [...postalMap.entries()]
      .map(([prefix, count]) => ({ prefix, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const countBy = <K extends keyof ProfileRow>(key: K, normalize?: (v: any) => string) => {
      const m = new Map<string, number>();
      filtered.forEach((p) => {
        const raw = p[key] as any;
        const v = normalize ? normalize(raw) : (raw == null || raw === '' ? 'Brak' : String(raw));
        m.set(v, (m.get(v) ?? 0) + 1);
      });
      return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    };

    const roles = countBy('role');
    const ranks = countBy('rank');
    const langs = countBy('training_language', (v) => (v ? String(v).toUpperCase() : 'Brak'));
    const specializations = countBy('specialization').slice(0, 10);

    // Last seen histogram
    const lastSeen = { today: 0, w: 0, m: 0, q: 0, older: 0, never: 0 };
    filtered.forEach((p) => {
      if (!p.last_seen_at) { lastSeen.never++; return; }
      const diff = now - new Date(p.last_seen_at).getTime();
      if (diff < day) lastSeen.today++;
      else if (diff < 7 * day) lastSeen.w++;
      else if (diff < 30 * day) lastSeen.m++;
      else if (diff < 90 * day) lastSeen.q++;
      else lastSeen.older++;
    });

    // Trend (12 months)
    const trend: { bucket: string; count: number; cumulative: number }[] = [];
    {
      const bucketKey = (d: Date) => {
        if (trendBucket === 'day') return d.toISOString().slice(0, 10);
        if (trendBucket === 'week') {
          const t = new Date(d);
          t.setUTCDate(t.getUTCDate() - t.getUTCDay());
          return t.toISOString().slice(0, 10);
        }
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      };
      const horizon = trendBucket === 'day' ? 60 * day : trendBucket === 'week' ? 180 * day : 365 * day;
      const buckets = new Map<string, number>();
      filtered.forEach((p) => {
        const t = new Date(p.created_at).getTime();
        if (now - t > horizon) return;
        const k = bucketKey(new Date(p.created_at));
        buckets.set(k, (buckets.get(k) ?? 0) + 1);
      });
      const keys = [...buckets.keys()].sort();
      let cum = 0;
      keys.forEach((k) => {
        cum += buckets.get(k) ?? 0;
        trend.push({ bucket: k, count: buckets.get(k) ?? 0, cumulative: cum });
      });
    }

    // Onboarding funnel
    const funnel = [
      { step: 'Zarejestrowani', count: total },
      { step: 'Email aktywowany', count: filtered.filter((p) => (p as any).email_activated !== false && p.profile_completed !== null).length || filtered.filter((p) => !!p.last_seen_at).length },
      { step: 'Profil ukończony', count: completed },
      { step: 'Wszystkie zgody', count: allConsents },
      { step: 'Aktywni (niezablokowani)', count: active },
    ];

    return {
      total, active, blocked, completed, allConsents, withAvatar, fromReflink, withUpline, fullContact,
      new7, prev7, new30, new90, onlineNow, active24h,
      countries, cities, postalPrefixes,
      roles, ranks, langs, specializations,
      lastSeen, trend, funnel,
    };
  }, [profiles, countryFilter, trendBucket]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return <p className="text-destructive text-sm p-4">Błąd ładowania danych statystycznych: {(error as Error).message}</p>;
  }

  const trendDelta = stats.prev7 ? ((stats.new7 - stats.prev7) / stats.prev7) * 100 : 0;
  const filteredCities = stats.cities.filter((c) =>
    !citySearch || c.label.toLowerCase().includes(citySearch.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header + global filter */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Statystyki użytkowników
              </CardTitle>
              <CardDescription>Pełny widok danych o użytkownikach platformy</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-muted-foreground" />
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Filtruj po kraju" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie kraje ({profiles.length})</SelectItem>
                  {stats.countries.map((c) => (
                    <SelectItem key={c.label} value={c.label}>
                      {c.flag} {c.label} ({c.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportXlsx('uzytkownicy_pelne.xlsx', profiles)}
              >
                <Download className="h-4 w-4 mr-1" /> Eksport
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <Kpi icon={Users} label="Łącznie" value={stats.total} tone="default" />
        <Kpi icon={UserCheck} label="Aktywni" value={stats.active} sub={pct(stats.active, stats.total)} tone="success" />
        <Kpi icon={UserX} label="Zablokowani / nieaktywni" value={stats.blocked} sub={pct(stats.blocked, stats.total)} tone="danger" />
        <Kpi
          icon={TrendingUp}
          label="Nowi (7 dni)"
          value={stats.new7}
          sub={`${trendDelta >= 0 ? '+' : ''}${trendDelta.toFixed(0)}% vs poprzedni tydzień`}
          tone={trendDelta >= 0 ? 'success' : 'warning'}
        />
        <Kpi icon={TrendingUp} label="Nowi (30 dni)" value={stats.new30} tone="info" />
        <Kpi icon={TrendingUp} label="Nowi (90 dni)" value={stats.new90} tone="info" />
        <Kpi icon={Activity} label="Online teraz" value={stats.onlineNow} sub="ostatnie 5 min" tone="success" />
        <Kpi icon={Clock} label="Aktywni 24h" value={stats.active24h} tone="info" />
        <Kpi icon={UserCheck} label="Profil ukończony" value={stats.completed} sub={pct(stats.completed, stats.total)} tone="success" />
        <Kpi icon={ShieldCheck} label="Wszystkie zgody" value={stats.allConsents} sub={pct(stats.allConsents, stats.total)} tone="success" />
        <Kpi icon={Link2} label="Z reflink" value={stats.fromReflink} sub={pct(stats.fromReflink, stats.total)} tone="info" />
        <Kpi icon={Crown} label="Z upline" value={stats.withUpline} sub={pct(stats.withUpline, stats.total)} tone="info" />
      </div>

      {/* Geografia */}
      <UserWorldMap cities={stats.cities.map((c) => ({ city: c.label, country: c.country, count: c.count }))} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe2 className="h-4 w-4 text-primary" /> Kraje ({stats.countries.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => exportXlsx('kraje.xlsx', stats.countries)}>
                <Download className="h-3 w-3 mr-1" /> XLSX
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
            {stats.countries.map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <div className="text-xl w-7">{c.flag}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{c.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {c.count} · {pct(c.count, profiles.length)}
                    </span>
                  </div>
                  <Progress value={(c.count / profiles.length) * 100} className="h-1.5 mt-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" /> Miasta ({filteredCities.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    placeholder="Szukaj miasta..."
                    className="h-8 w-44 pl-7 text-xs"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => exportXlsx('miasta.xlsx', filteredCities)}>
                  <Download className="h-3 w-3 mr-1" /> XLSX
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
            {filteredCities.slice(0, 50).map((c) => (
              <div key={`${c.label}-${c.country}`} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
                <span className="truncate">
                  <span className="font-medium">{c.label}</span>{' '}
                  <span className="text-muted-foreground text-xs">({c.country})</span>
                </span>
                <Badge variant="secondary" className="tabular-nums">{c.count}</Badge>
              </div>
            ))}
            {filteredCities.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-6">Brak miast pasujących do filtra.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Kody pocztowe + Lejek */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Top kody pocztowe (prefiks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.postalPrefixes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak danych adresowych.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.postalPrefixes}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="prefix" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> Lejek onboardingu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.funnel.map((s, i) => {
              const prev = i === 0 ? s.count : stats.funnel[i - 1].count;
              const drop = prev ? ((prev - s.count) / prev) * 100 : 0;
              return (
                <div key={s.step}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{s.step}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {s.count} {i > 0 && <span className="text-xs">({drop > 0 ? '-' : '+'}{Math.abs(drop).toFixed(0)}%)</span>}
                    </span>
                  </div>
                  <Progress value={stats.total ? (s.count / stats.total) * 100 : 0} className="h-2 mt-1" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Trend rejestracji */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Trend rejestracji
            </CardTitle>
            <Select value={trendBucket} onValueChange={(v: any) => setTrendBucket(v)}>
              <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Dziennie (60d)</SelectItem>
                <SelectItem value="week">Tygodniowo (180d)</SelectItem>
                <SelectItem value="month">Miesięcznie (12m)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.trend}>
              <defs>
                <linearGradient id="reg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="bucket" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="count" name="Nowe konta" stroke="hsl(var(--primary))" fill="url(#reg)" />
              <Line type="monotone" dataKey="cumulative" name="Łącznie" stroke="hsl(var(--accent-foreground))" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Demografia: role, rangi, języki, specjalizacje */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Role</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={stats.roles} dataKey="count" nameKey="label" outerRadius={70} label>
                  {stats.roles.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-xs space-y-1 mt-2">
              {stats.roles.map((r, i) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {r.label}
                  </span>
                  <span className="text-muted-foreground tabular-nums">{r.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4" /> Rangi</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.ranks} layout="vertical">
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Languages className="h-4 w-4" /> Język szkolenia</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {stats.langs.map((l) => (
              <div key={l.label} className="flex items-center justify-between text-sm">
                <span className="font-medium">{l.label}</span>
                <Badge variant="secondary">{l.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top specjalizacje</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {stats.specializations.length === 0 && <p className="text-xs text-muted-foreground">Brak danych.</p>}
            {stats.specializations.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="truncate">{s.label}</span>
                <Badge variant="outline">{s.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Aktywność + Jakość profilu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Ostatnia aktywność
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={[
                  { label: 'Dziś', count: stats.lastSeen.today },
                  { label: '7 dni', count: stats.lastSeen.w },
                  { label: '30 dni', count: stats.lastSeen.m },
                  { label: '90 dni', count: stats.lastSeen.q },
                  { label: '> 90 dni', count: stats.lastSeen.older },
                  { label: 'Nigdy', count: stats.lastSeen.never },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Jakość profili i zgody
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Profil ukończony', value: stats.completed },
              { label: 'Pełne dane kontaktowe (tel + adres)', value: stats.fullContact },
              { label: 'Z avatarem', value: stats.withAvatar },
              { label: 'Akceptacja Regulaminu', value: profiles.filter((p) => p.accepted_terms).length },
              { label: 'Akceptacja Privacy', value: profiles.filter((p) => p.accepted_privacy).length },
              { label: 'Akceptacja RODO', value: profiles.filter((p) => p.accepted_rodo).length },
              { label: 'Tutorial ukończony', value: profiles.filter((p) => p.tutorial_completed).length },
              { label: 'Tutorial pominięty', value: profiles.filter((p) => p.tutorial_skipped).length },
            ].map((r) => (
              <div key={r.label}>
                <div className="flex justify-between text-sm">
                  <span>{r.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {r.value} · {pct(r.value, stats.total)}
                  </span>
                </div>
                <Progress value={stats.total ? (r.value / stats.total) * 100 : 0} className="h-1.5 mt-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserStatistics;
