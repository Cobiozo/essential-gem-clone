import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, GraduationCap, Users, TrendingUp, CheckCircle } from 'lucide-react';

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

export const TeamTrainingProgressView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<TeamProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    loadProgress();
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_leader_team_training_progress', {
        p_leader_user_id: user.id,
      });
      if (error) throw error;
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

      {/* Filters */}
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
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
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

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Osoba</TableHead>
                  <TableHead>Rola / Poziom</TableHead>
                  {moduleFilter === 'all' ? (
                    <>
                      <TableHead>Moduły</TableHead>
                      <TableHead className="text-right">Ogólny postęp</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Postęp modułu</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeople.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {searchQuery || moduleFilter !== 'all' ? 'Brak wyników dla podanych filtrów' : 'Brak danych'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPeople.map(person => {
                    const displayModules = moduleFilter === 'all'
                      ? person.modules
                      : person.modules.filter(m => m.module_id === moduleFilter);

                    return (
                      <TableRow key={person.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {person.first_name} {person.last_name}
                            </p>
                            {person.eq_id && (
                              <p className="text-xs text-muted-foreground">EQ: {person.eq_id}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-xs">
                              {roleLabels[person.role || ''] || person.role}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {getLevelLabel(person.level)}
                            </p>
                          </div>
                        </TableCell>
                        {moduleFilter === 'all' ? (
                          <>
                            <TableCell>
                              <div className="space-y-1.5">
                                {displayModules.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">Brak przypisanych modułów</span>
                                ) : (
                                  displayModules.map(m => (
                                    <div key={m.module_id} className="flex items-center gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs truncate" title={m.module_title}>{m.module_title}</p>
                                        <Progress value={m.progress_percentage} className="h-1.5 mt-0.5" />
                                      </div>
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        {m.progress_percentage}%
                                      </span>
                                      {m.is_completed && (
                                        <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-sm font-semibold">{person.overallProgress}%</span>
                                <Progress value={person.overallProgress} className="h-2 w-20" />
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              {displayModules.length === 0 ? (
                                <span className="text-xs text-muted-foreground">Nieprzypisany</span>
                              ) : (
                                displayModules.map(m => (
                                  <div key={m.module_id} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Progress value={m.progress_percentage} className="h-2 flex-1" />
                                      <span className="text-sm font-medium shrink-0">{m.progress_percentage}%</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {m.completed_lessons} / {m.total_lessons} lekcji
                                    </p>
                                  </div>
                                ))
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {displayModules.length === 0 ? null : displayModules.map(m => (
                                m.is_completed ? (
                                  <Badge key={m.module_id} className="bg-primary/10 text-primary border-primary/20">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Ukończony
                                  </Badge>
                                ) : m.progress_percentage > 0 ? (
                                  <Badge key={m.module_id} variant="outline" className="text-primary border-primary/30">
                                    W trakcie
                                  </Badge>
                                ) : (
                                  <Badge key={m.module_id} variant="secondary">
                                    Nie rozpoczęty
                                  </Badge>
                                )
                              ))}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamTrainingProgressView;
