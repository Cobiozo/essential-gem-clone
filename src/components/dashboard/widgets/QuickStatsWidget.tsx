import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Bell, CheckCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  completedModules: number;
  totalModules: number;
  progressPercent: number;
  unreadNotifications: number;
}

export const QuickStatsWidget: React.FC = () => {
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    completedModules: 0,
    totalModules: 0,
    progressPercent: 0,
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // Fetch training modules visible to user's role
        const roleFilter = userRole?.role || 'client';
        let modulesQuery = supabase
          .from('training_modules')
          .select('id')
          .eq('is_active', true);

        // Add role visibility filter
        if (roleFilter === 'client') {
          modulesQuery = modulesQuery.eq('visible_to_clients', true);
        } else if (roleFilter === 'partner') {
          modulesQuery = modulesQuery.eq('visible_to_partners', true);
        } else if (roleFilter === 'specjalista') {
          modulesQuery = modulesQuery.eq('visible_to_specjalista', true);
        }

        const { data: modules } = await modulesQuery;
        const totalModules = modules?.length || 0;

        // Fetch completed modules
        const { data: progress } = await supabase
          .from('training_progress')
          .select('module_id, is_completed')
          .eq('user_id', user.id)
          .eq('is_completed', true);

        const completedModules = progress?.length || 0;
        const progressPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

        // Fetch unread notifications
        const { count: unreadCount } = await supabase
          .from('user_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        setStats({
          completedModules,
          totalModules,
          progressPercent,
          unreadNotifications: unreadCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, userRole]);

  const statItems = [
    {
      icon: BookOpen,
      label: t('dashboard.stats.completedModules'),
      value: `${stats.completedModules}/${stats.totalModules}`,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      icon: TrendingUp,
      label: t('dashboard.stats.progress'),
      value: `${stats.progressPercent}%`,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      icon: Bell,
      label: t('dashboard.stats.notifications'),
      value: stats.unreadNotifications.toString(),
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-primary" />
          {t('dashboard.quickStats')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('dashboard.overallProgress')}</span>
            <span className="font-medium">{stats.progressPercent}%</span>
          </div>
          <Progress value={stats.progressPercent} className="h-2" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          {statItems.map((item, index) => (
            <div key={index} className="text-center">
              <div className={`inline-flex p-2 rounded-lg ${item.bgColor} mb-2`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <p className="text-lg font-bold text-foreground">{loading ? '...' : item.value}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
