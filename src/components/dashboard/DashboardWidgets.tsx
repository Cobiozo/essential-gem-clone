import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Bell,
  ArrowRight,
  Link2,
  TrendingUp,
  BookOpen,
  FolderOpen,
  Users,
} from 'lucide-react';

// Training Progress Widget
const TrainingProgressWidget: React.FC = () => {
  const { user } = useAuth();

  const { data: trainingData, isLoading } = useQuery({
    queryKey: ['dashboard-training-progress', user?.id],
    queryFn: async () => {
      if (!user) return { modules: [], overallProgress: 0 };

      // Get training modules
      const { data: modules } = await supabase
        .from('training_modules')
        .select('id, title, position')
        .eq('is_active', true)
        .order('position');

      // Get lessons for each module and user progress
      const { data: lessons } = await supabase
        .from('training_lessons')
        .select('id, module_id');

      const { data: progress } = await supabase
        .from('training_progress')
        .select('lesson_id, is_completed')
        .eq('user_id', user.id);

      // Calculate progress per module
      const lessonsByModule = new Map<string, string[]>();
      lessons?.forEach(l => {
        const arr = lessonsByModule.get(l.module_id) || [];
        arr.push(l.id);
        lessonsByModule.set(l.module_id, arr);
      });

      const completedLessons = new Set(
        progress?.filter(p => p.is_completed).map(p => p.lesson_id) || []
      );

      const modulesWithProgress = modules?.map(m => {
        const moduleLessons = lessonsByModule.get(m.id) || [];
        const completed = moduleLessons.filter(lid => completedLessons.has(lid)).length;
        const total = moduleLessons.length;
        const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          ...m,
          progress: progressPct,
          completed: progressPct === 100,
        };
      }) || [];

      const totalProgress = modulesWithProgress.length > 0
        ? Math.round(modulesWithProgress.reduce((acc, m) => acc + m.progress, 0) / modulesWithProgress.length)
        : 0;

      return {
        modules: modulesWithProgress.slice(0, 3),
        overallProgress: totalProgress,
      };
    },
    enabled: !!user,
    staleTime: 60000,
  });

  return (
    <Card className="bg-card border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-2 rounded-lg bg-primary/10">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          Postęp szkoleń
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-2 bg-muted rounded w-full" />
            <div className="h-2 bg-muted rounded w-3/4" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-primary">
                {trainingData?.overallProgress || 0}%
              </span>
              <Badge variant="secondary" className="text-xs">
                Ogólnie
              </Badge>
            </div>
            <Progress value={trainingData?.overallProgress || 0} className="h-2" />
            <div className="space-y-2">
              {trainingData?.modules.map(module => (
                <div key={module.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate flex-1 mr-2">
                    {module.title}
                  </span>
                  <span className="font-medium text-foreground">
                    {module.progress}%
                  </span>
                </div>
              ))}
            </div>
            <Link to="/training">
              <Button variant="ghost" size="sm" className="w-full mt-2 text-primary hover:text-primary hover:bg-primary/10">
                Zobacz wszystkie
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Recent Activity Widget
const RecentActivityWidget: React.FC = () => {
  const { user } = useAuth();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['dashboard-recent-activity', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data } = await supabase
        .from('user_notifications')
        .select('id, title, message, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      return data || [];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <Card className="bg-card border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base font-semibold">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Bell className="h-4 w-4 text-blue-500" />
            </div>
            Aktywność
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} nowe
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.slice(0, 3).map(notification => (
              <div
                key={notification.id}
                className={`p-2 rounded-lg text-sm transition-colors ${
                  notification.is_read ? 'bg-muted/50' : 'bg-primary/5 border-l-2 border-primary'
                }`}
              >
                <p className="font-medium text-foreground truncate">
                  {notification.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {notification.message}
                </p>
              </div>
            ))}
            <Link to="/my-account?tab=notifications">
              <Button variant="ghost" size="sm" className="w-full mt-2 text-blue-500 hover:text-blue-500 hover:bg-blue-500/10">
                Zobacz wszystkie
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Brak nowych powiadomień
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Quick Links Widget
const QuickLinksWidget: React.FC = () => {
  const { isPartner, isSpecjalista } = useAuth();

  const links = [
    { icon: BookOpen, label: 'Akademia', path: '/training', color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: FolderOpen, label: 'Zasoby', path: '/knowledge', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ...(isPartner || isSpecjalista ? [
      { icon: Users, label: 'Zespół', path: '/my-account?tab=team-contacts', color: 'text-orange-500', bg: 'bg-orange-500/10' },
      { icon: Link2, label: 'Reflinki', path: '/my-account?tab=reflinks', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    ] : []),
  ];

  return (
    <Card className="bg-card border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-2 rounded-lg bg-green-500/10">
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          Szybki dostęp
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {links.map((link, idx) => {
            const Icon = link.icon;
            return (
              <Link key={idx} to={link.path}>
                <Button
                  variant="ghost"
                  className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-muted"
                >
                  <div className={`p-2 rounded-lg ${link.bg}`}>
                    <Icon className={`h-5 w-5 ${link.color}`} />
                  </div>
                  <span className="text-xs font-medium">{link.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Reflink Stats Widget (for partners/specialists)
const ReflinkStatsWidget: React.FC = () => {
  const { user, isPartner, isSpecjalista } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-reflink-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: reflinks } = await supabase
        .from('user_reflinks')
        .select('id, click_count, is_active')
        .eq('creator_user_id', user.id);

      if (!reflinks) return null;

      return {
        totalLinks: reflinks.length,
        activeLinks: reflinks.filter(r => r.is_active).length,
        totalClicks: reflinks.reduce((acc, r) => acc + (r.click_count || 0), 0),
      };
    },
    enabled: !!user && (isPartner || isSpecjalista),
    staleTime: 60000,
  });

  if (!isPartner && !isSpecjalista) return null;

  return (
    <Card className="bg-card border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <Link2 className="h-4 w-4 text-violet-500" />
          </div>
          Twoje reflinki
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        ) : stats ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold text-violet-500">{stats.totalLinks}</p>
                <p className="text-xs text-muted-foreground">Linków</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{stats.activeLinks}</p>
                <p className="text-xs text-muted-foreground">Aktywnych</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{stats.totalClicks}</p>
                <p className="text-xs text-muted-foreground">Kliknięć</p>
              </div>
            </div>
            <Link to="/my-account?tab=reflinks">
              <Button variant="ghost" size="sm" className="w-full mt-2 text-violet-500 hover:text-violet-500 hover:bg-violet-500/10">
                Zarządzaj reflinkami
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Brak danych
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Main Dashboard Widgets Container
export const DashboardWidgets: React.FC = () => {
  const { isPartner, isSpecjalista } = useAuth();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
      <TrainingProgressWidget />
      <RecentActivityWidget />
      <QuickLinksWidget />
      {(isPartner || isSpecjalista) && <ReflinkStatsWidget />}
    </div>
  );
};
