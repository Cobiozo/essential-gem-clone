import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Search, GraduationCap, Users, TrendingUp, CheckCircle, ChevronDown } from 'lucide-react';

interface TeamProgressRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  eq_id: string | null;
  role: string | null;
  module_id: string | null;
  module_title: string | null;
  assigned_at: string | null;
  is_completed: boolean | null;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  level: number;
}

interface PersonSummary {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  eq_id: string | null;
  role: string | null;
  level: number;
  modules: {
    module_id: string;
    module_title: string;
    is_completed: boolean;
    progress_percentage: number;
    completed_lessons: number;
    total_lessons: number;
  }[];
  overallProgress: number;
}

const roleLabels: Record<string, string> = {
  partner: 'Partner',
  specjalista: 'Specjalista',
  client: 'Klient',
  user: 'Użytkownik',
  admin: 'Admin',
};

const levelLabels: Record<number, string> = {
  1: 'Poziom 1 (bezpośredni)',
  2: 'Poziom 2',
  3: 'Poziom 3',
  4: 'Poziom 4',
  5: 'Poziom 5+',
};

const getLevelLabel = (level: number) => levelLabels[Math.min(level, 5)] || `Poziom ${level}`;

const getInitials = (firstName: string | null, lastName: string | null) => {
  const f = firstName?.charAt(0) || '';
  const l = lastName?.charAt(0) || '';
  return (f + l).toUpperCase() || '?';
};

export const TeamTrainingProgressView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<TeamProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    loadProgress();
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;
    setLoading(true);
    setAccessDenied(false);
    try {
      const { data, error } = await supabase.rpc('get_leader_team_training_progress', {
        p_leader_user_id: user.id,
      });
      if (error) {
        const msg = error.message || '';
        if (msg.includes('Access denied') || msg.includes('permission required')) {
          setAccessDenied(true);
        } else {
          console.error('Error loading team progress:', error);
          toast({
            title: 'Błąd techniczny',
            description: 'Nie udało się pobrać postępu szkoleń zespołu.',
            variant: 'destructive',
          });
        }
        return;
      }
      setRows((data as TeamProgressRow[]) || []);
    } catch (error: any) {
      console.error('Error loading team progress:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać postępu szkoleń zespołu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Get unique modules for filter
  const modules = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; title: string }[] = [];
    rows.forEach(r => {
      if (r.module_id && r.module_title && !seen.has(r.module_id)) {
        seen.add(r.module_id);
        result.push({ id: r.module_id, title: r.module_title });
      }
    });
    return result.sort((a, b) => a.title.localeCompare(b.title));
  }, [rows]);

  // Group rows by person
  const people = useMemo<PersonSummary[]>(() => {
    const map = new Map<string, PersonSummary>();

    rows.forEach(row => {
      if (!map.has(row.user_id)) {
        map.set(row.user_id, {
          user_id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          eq_id: row.eq_id,
          role: row.role,
          level: row.level,
          modules: [],
          overallProgress: 0,
        });
      }

      const person = map.get(row.user_id)!;
      if (row.module_id && row.module_title) {
        person.modules.push({
          module_id: row.module_id,
          module_title: row.module_title,
          is_completed: row.is_completed || false,
          progress_percentage: Number(row.progress_percentage) || 0,
          completed_lessons: Number(row.completed_lessons) || 0,
          total_lessons: Number(row.total_lessons) || 0,
        });
      }
    });

    // Calculate overall progress per person
    map.forEach(person => {
      if (person.modules.length > 0) {
        const avg = person.modules.reduce((sum, m) => sum + m.progress_percentage, 0) / person.modules.length;
        person.overallProgress = Math.round(avg);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
    });
  }, [rows]);

  // Filter people
  const filteredPeople = useMemo(() => {
    return people.filter(person => {
      const name = `${person.first_name || ''} ${person.last_name || ''}`.toLowerCase();
      const eq = (person.eq_id || '').toLowerCase();
      const matchSearch = !searchQuery || name.includes(searchQuery.toLowerCase()) || eq.includes(searchQuery.toLowerCase());
      const matchModule = moduleFilter === 'all' || person.modules.some(m => m.module_id === moduleFilter);
      return matchSearch && matchModule;
    });
  }, [people, searchQuery, moduleFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const total = people.length;
    const completed = people.filter(p => p.modules.length > 0 && p.modules.every(m => m.is_completed)).length;
    const inProgress = people.filter(p => p.overallProgress > 0 && p.overallProgress < 100).length;
    const notStarted = people.filter(p => p.overallProgress === 0).length;
    return { total, completed, inProgress, notStarted };
  }, [people]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Brak uprawnień</h3>
          <p className="text-muted-foreground text-sm">
            Nie masz uprawnień do przeglądania postępu szkoleń zespołu.<br />
            Skontaktuj się z administratorem, aby włączyć tę funkcję dla Twojego konta.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (people.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Brak osób w strukturze</h3>
          <p className="text-muted-foreground text-sm">
            Nie znaleziono żadnych osób w Twojej strukturze organizacji.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Łącznie osób</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Ukończyli wszystkie</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-primary">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">W trakcie</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-primary">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Nie rozpoczęli</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-muted-foreground">{stats.notStarted}</p>
          </CardContent>
        </Card>
      </div>

      {/* Header + Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5" />
            Postęp szkoleń zespołu
          </CardTitle>
          <CardDescription>
            Widok postępu szkoleń wszystkich osób w Twojej strukturze organizacyjnej
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po imieniu, nazwisku lub EQ ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Filtruj po module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie moduły</SelectItem>
                {modules.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredPeople.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {searchQuery || moduleFilter !== 'all' ? 'Brak wyników dla podanych filtrów' : 'Brak danych'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPeople.map(person => {
                const isExpanded = expandedUsers.has(person.user_id);
                const displayModules = moduleFilter === 'all'
                  ? person.modules
                  : person.modules.filter(m => m.module_id === moduleFilter);
                const allCompleted = person.modules.length > 0 && person.modules.every(m => m.is_completed);

                return (
                  <Collapsible
                    key={person.user_id}
                    open={isExpanded}
                    onOpenChange={() => toggleUserExpanded(person.user_id)}
                  >
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <CardContent className="pt-4 pb-4 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                {getInitials(person.first_name, person.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {person.first_name} {person.last_name}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                {person.eq_id && (
                                  <span className="text-xs text-muted-foreground">EQ: {person.eq_id}</span>
                                )}
                                <Badge variant="outline" className="text-xs py-0 h-4">
                                  {roleLabels[person.role || ''] || person.role}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {getLevelLabel(person.level)}
                                </span>
                                {(person as any).training_language ? (
                                  <Badge variant="outline" className="text-xs py-0 h-4 gap-1">
                                    <img
                                      src={`https://flagcdn.com/12x9/${(person as any).training_language === 'en' ? 'gb' : (person as any).training_language}.png`}
                                      alt={(person as any).training_language}
                                      className="w-3 h-2 object-cover rounded-sm"
                                    />
                                    {(person as any).training_language.toUpperCase()}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs py-0 h-4 text-muted-foreground">Brak języka</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                className={
                                  allCompleted
                                    ? 'bg-primary/10 text-primary border-primary/20'
                                    : person.overallProgress > 0
                                    ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                                    : 'bg-secondary text-secondary-foreground border-transparent'
                                }
                                variant="outline"
                              >
                                {person.overallProgress}%
                              </Badge>
                              <ChevronDown
                                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </div>
                          {/* Mini progress bar */}
                          <div className="mt-3">
                            <Progress value={person.overallProgress} className="h-1.5" />
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t px-4 pb-4 pt-3 space-y-4 bg-muted/20">
                          {displayModules.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              {moduleFilter !== 'all' ? 'Nieprzypisany do tego modułu' : 'Brak przypisanych modułów'}
                            </p>
                          ) : (
                            displayModules.map(m => (
                              <div key={m.module_id} className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-medium truncate" title={m.module_title}>
                                    {m.module_title}
                                  </p>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {m.is_completed && (
                                      <CheckCircle className="h-3.5 w-3.5 text-primary" />
                                    )}
                                    <Badge
                                      variant="outline"
                                      className={`text-xs py-0 h-4 ${
                                        m.is_completed
                                          ? 'bg-primary/10 text-primary border-primary/20'
                                          : m.progress_percentage > 0
                                          ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                                          : ''
                                      }`}
                                    >
                                      {m.progress_percentage}%
                                    </Badge>
                                  </div>
                                </div>
                                <Progress value={m.progress_percentage} className="h-2" />
                                <p className="text-xs text-muted-foreground">
                                  {m.completed_lessons} / {m.total_lessons} lekcji
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamTrainingProgressView;
