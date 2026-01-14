import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Bell, 
  TrendingUp, 
  Users, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';

interface Stats {
  // Activity
  lastSignIn: string | null;
  daysSinceRegistration: number;
  
  // Educational progress
  completedModules: number;
  totalModules: number;
  progressPercent: number;
  nextModuleTitle: string | null;
  nextModuleId: string | null;
  
  // Network (optional - for partner/specialist)
  invitedCount: number;
  activeCount: number;
  
  // Alerts
  pendingApprovals: number;
  newMaterials: number;
  unreadNotifications: number;
}

interface QuickStatsWidgetProps {
  fullWidth?: boolean;
}

export const QuickStatsWidget: React.FC<QuickStatsWidgetProps> = ({ fullWidth = false }) => {
  const { user, userRole, profile } = useAuth();
  const { t, language, refreshTranslations } = useLanguage();
  const navigate = useNavigate();
  
  // Refresh translations if they seem to be missing (keys shown instead of values)
  useEffect(() => {
    const testKey = t('dashboard.quickStats');
    if (testKey === 'dashboard.quickStats') {
      refreshTranslations();
    }
  }, []);
  const [stats, setStats] = useState<Stats>({
    lastSignIn: null,
    daysSinceRegistration: 0,
    completedModules: 0,
    totalModules: 0,
    progressPercent: 0,
    nextModuleTitle: null,
    nextModuleId: null,
    invitedCount: 0,
    activeCount: 0,
    pendingApprovals: 0,
    newMaterials: 0,
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(true);

  const isPartnerOrSpecialist = userRole?.role === 'partner' || userRole?.role === 'specjalista';
  const roleFilter = userRole?.role || 'client';

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !profile) return;

      try {
        // Calculate days since registration
        const registrationDate = profile.created_at ? new Date(profile.created_at) : new Date();
        const daysSinceRegistration = Math.floor(
          (Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Fetch training modules visible to user's role
        let modulesQuery = supabase
          .from('training_modules')
          .select('id, title, position')
          .eq('is_active', true);

        if (roleFilter === 'client') {
          modulesQuery = modulesQuery.eq('visible_to_clients', true);
        } else if (roleFilter === 'partner') {
          modulesQuery = modulesQuery.eq('visible_to_partners', true);
        } else if (roleFilter === 'specjalista') {
          modulesQuery = modulesQuery.eq('visible_to_specjalista', true);
        }

        const { data: modules } = await modulesQuery.order('position', { ascending: true });
        const totalModules = modules?.length || 0;

        // Fetch completed modules
        const { data: progress } = await supabase
          .from('training_progress')
          .select('lesson_id, is_completed, training_lessons!inner(module_id)')
          .eq('user_id', user.id)
          .eq('is_completed', true);

        // Get unique completed module IDs
        const completedModuleIds = new Set(
          progress?.map((p: any) => p.training_lessons?.module_id).filter(Boolean) || []
        );
        const completedModules = completedModuleIds.size;
        const progressPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

        // Find next incomplete module
        const nextModule = modules?.find(m => !completedModuleIds.has(m.id));

        // Fetch unread notifications
        const { count: unreadCount } = await supabase
          .from('user_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        // Fetch new materials count
        let materialsQuery = supabase
          .from('knowledge_resources')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .eq('is_new', true);

        if (roleFilter === 'client') {
          materialsQuery = materialsQuery.or('visible_to_clients.eq.true,visible_to_everyone.eq.true');
        } else if (roleFilter === 'partner') {
          materialsQuery = materialsQuery.or('visible_to_partners.eq.true,visible_to_everyone.eq.true');
        } else if (roleFilter === 'specjalista') {
          materialsQuery = materialsQuery.or('visible_to_specjalista.eq.true,visible_to_everyone.eq.true');
        }

        const { count: newMaterialsCount } = await materialsQuery;

        // Network stats (only for partner/specialist with eq_id)
        let invitedCount = 0;
        let activeCount = 0;
        let pendingApprovals = 0;

        if (isPartnerOrSpecialist && profile.eq_id) {
          // Invited users count
          const { count: invited } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('upline_eq_id', profile.eq_id);
          invitedCount = invited || 0;

          // Active users count (approved and active)
          const { count: active } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('upline_eq_id', profile.eq_id)
            .eq('is_active', true)
            .eq('guardian_approved', true)
            .eq('admin_approved', true);
          activeCount = active || 0;

          // Pending approvals count
          const { count: pending } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('upline_eq_id', profile.eq_id)
            .eq('guardian_approved', false);
          pendingApprovals = pending || 0;
        }

        // Get last sign in from user metadata or use current time
        const lastSignIn = user.last_sign_in_at || null;

        setStats({
          lastSignIn,
          daysSinceRegistration,
          completedModules,
          totalModules,
          progressPercent,
          nextModuleTitle: nextModule?.title || null,
          nextModuleId: nextModule?.id || null,
          invitedCount,
          activeCount,
          pendingApprovals,
          newMaterials: newMaterialsCount || 0,
          unreadNotifications: unreadCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, userRole, profile, roleFilter, isPartnerOrSpecialist]);

  const formatLastSignIn = () => {
    if (!stats.lastSignIn) return t('dashboard.stats.never');
    try {
      return formatDistanceToNow(new Date(stats.lastSignIn), { 
        addSuffix: true, 
        locale: language === 'pl' ? pl : enUS 
      });
    } catch {
      return t('dashboard.stats.recently');
    }
  };

  const totalAlerts = stats.pendingApprovals + stats.newMaterials + stats.unreadNotifications;

  return (
    <Card className={`shadow-sm ${fullWidth ? 'col-span-full' : ''}`}>
      <CardHeader className="pb-1">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {t('dashboard.quickStats')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Educational Progress Section - Clickable */}
        <div 
          className="p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors group"
          onClick={() => navigate('/training')}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{t('dashboard.stats.educationalProgress')}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {loading ? '...' : `${stats.completedModules}/${stats.totalModules} ${t('dashboard.stats.modules')}`}
              </span>
              <span className="font-medium">{loading ? '...' : `${stats.progressPercent}%`}</span>
            </div>
            <Progress value={stats.progressPercent} className="h-1.5" />
            
            {stats.nextModuleTitle && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{t('dashboard.stats.nextStep')}:</span> {stats.nextModuleTitle}
              </p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid gap-2 ${isPartnerOrSpecialist ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {/* Network Development - Only for partner/specialist */}
          {isPartnerOrSpecialist && (
            <div 
              className="text-center p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => navigate('/my-account?tab=team')}
            >
              <div className="inline-flex p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 mb-1">
                <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-base font-bold text-foreground">
                {loading ? '...' : `${stats.activeCount}/${stats.invitedCount}`}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1">{t('dashboard.stats.network')}</p>
            </div>
          )}

          {/* User Activity */}
          <div 
            className="text-center p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
            onClick={() => navigate('/my-account')}
          >
            <div className="inline-flex p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 mb-1">
              <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-bold text-foreground line-clamp-1">
              {loading ? '...' : formatLastSignIn()}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1">{t('dashboard.stats.lastLogin')}</p>
          </div>

          {/* Alerts/Actions Required */}
          <div 
            className={`text-center p-2 rounded-lg transition-colors cursor-pointer ${
              totalAlerts > 0 
                ? 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30' 
                : 'bg-muted/50 hover:bg-muted'
            }`}
            onClick={() => navigate('/notifications')}
          >
            <div className={`inline-flex p-1.5 rounded-lg mb-1 ${
              totalAlerts > 0 
                ? 'bg-amber-200 dark:bg-amber-800/50' 
                : 'bg-amber-100 dark:bg-amber-900/30'
            }`}>
              {totalAlerts > 0 ? (
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Bell className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <p className="text-base font-bold text-foreground">
              {loading ? '...' : totalAlerts}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1">{t('dashboard.stats.actions')}</p>
          </div>
        </div>

        {/* Alerts Details - if any */}
        {totalAlerts > 0 && !loading && (
          <div className="space-y-0.5 pt-1 border-t border-border">
            {stats.pendingApprovals > 0 && (
              <div 
                className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted cursor-pointer"
                onClick={() => navigate('/my-account?tab=team')}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="h-3 w-3 text-amber-600" />
                  <span>{t('dashboard.stats.pendingApprovals')}</span>
                </div>
                <span className="font-medium text-amber-600">{stats.pendingApprovals}</span>
              </div>
            )}
            {stats.newMaterials > 0 && (
              <div 
                className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted cursor-pointer"
                onClick={() => navigate('/knowledge-center')}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  <span>{t('dashboard.stats.newMaterials')}</span>
                </div>
                <span className="font-medium text-emerald-600">{stats.newMaterials}</span>
              </div>
            )}
            {stats.unreadNotifications > 0 && (
              <div 
                className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted cursor-pointer"
                onClick={() => navigate('/notifications')}
              >
                <div className="flex items-center gap-2">
                  <Bell className="h-3 w-3 text-blue-600" />
                  <span>{t('dashboard.stats.unreadNotifications')}</span>
                </div>
                <span className="font-medium text-blue-600">{stats.unreadNotifications}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
