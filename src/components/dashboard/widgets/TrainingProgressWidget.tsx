import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowRight, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WidgetInfoButton } from '../WidgetInfoButton';
import { TrainingDonutChart } from './TrainingDonutChart';
import { Widget3DIcon } from './Widget3DIcon';
interface ModuleProgress {
  id: string;
  title: string;
  progress: number;
  isCompleted: boolean;
}

export const TrainingProgressWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { t, language } = useLanguage();
  const [modules, setModules] = useState<ModuleProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      if (!user) return;

      try {
        const roleFilter = userRole?.role || 'client';
        let modulesQuery = supabase
          .from('training_modules')
          .select('id, title')
          .eq('is_active', true)
          .order('position', { ascending: true })
          .limit(4);

        if (roleFilter === 'client') {
          modulesQuery = modulesQuery.eq('visible_to_clients', true);
        } else if (roleFilter === 'partner') {
          modulesQuery = modulesQuery.eq('visible_to_partners', true);
        } else if (roleFilter === 'specjalista') {
          modulesQuery = modulesQuery.eq('visible_to_specjalista', true);
        }

        const { data: modulesData } = await modulesQuery;

        if (!modulesData?.length) {
          setModules([]);
          setLoading(false);
          return;
        }

        const allModuleIds = modulesData.map((m: any) => m.id);

        // Fetch translations for non-default language
        let titleTransMap = new Map<string, string>();
        if (language !== 'pl') {
          const { data: translations } = await supabase
            .from('training_module_translations')
            .select('module_id, title')
            .eq('language_code', language)
            .in('module_id', allModuleIds);
          if (translations) {
            titleTransMap = new Map(translations.filter(t => t.title).map(t => [t.module_id, t.title!]));
          }
        }

        // Batch: fetch ALL lessons for all modules at once (fixes N+1)
        const [certificatesRes, lessonsRes, progressRes] = await Promise.all([
          supabase
            .from('certificates')
            .select('module_id, issued_at')
            .eq('user_id', user.id)
            .order('issued_at', { ascending: false }),
          supabase
            .from('training_lessons')
            .select('id, module_id, created_at')
            .in('module_id', allModuleIds)
            .eq('is_active', true),
          supabase
            .from('training_progress')
            .select('lesson_id, is_completed, training_lessons!inner(module_id, created_at)')
            .eq('user_id', user.id)
            .eq('is_completed', true),
        ]);

        // Build certificate map: module_id -> newest issued_at
        const certMap: Record<string, string> = {};
        certificatesRes.data?.forEach(cert => {
          if (!certMap[cert.module_id]) {
            certMap[cert.module_id] = cert.issued_at;
          }
        });

        // Group lessons by module_id
        const lessonsByModule = new Map<string, any[]>();
        lessonsRes.data?.forEach(l => {
          const arr = lessonsByModule.get(l.module_id) || [];
          arr.push(l);
          lessonsByModule.set(l.module_id, arr);
        });

        // Calculate progress for each module
        const modulesWithProgress: ModuleProgress[] = modulesData.map((mod: any) => {
          const certIssuedAt = certMap[mod.id];
          const lessons = lessonsByModule.get(mod.id) || [];

          // Filter lessons if certificate exists
          let totalLessons = lessons.length;
          if (certIssuedAt) {
            const certDate = new Date(certIssuedAt);
            const filtered = lessons.filter(l => new Date(l.created_at) <= certDate).length;
            totalLessons = filtered > 0 ? filtered : lessons.length;
          }

          // Count completed lessons for this module
          let completedInModule = 0;
          if (certIssuedAt) {
            const certDate = new Date(certIssuedAt);
            const filteredCompleted = (progressRes.data || []).filter(
              (p: any) => p.training_lessons?.module_id === mod.id &&
                         new Date(p.training_lessons?.created_at) <= certDate
            ).length;
            const allCompleted = (progressRes.data || []).filter(
              (p: any) => p.training_lessons?.module_id === mod.id
            ).length;
            completedInModule = filteredCompleted > 0 ? filteredCompleted : allCompleted;
          } else {
            completedInModule = (progressRes.data || []).filter(
              (p: any) => p.training_lessons?.module_id === mod.id
            ).length;
          }

          const progressPercent = totalLessons > 0 ? Math.round((completedInModule / totalLessons) * 100) : 0;

          return {
            id: mod.id,
            title: titleTransMap.get(mod.id) || mod.title,
            progress: progressPercent,
            isCompleted: progressPercent === 100,
          };
        });

        setModules(modulesWithProgress);
      } catch (error) {
        console.error('Error fetching training modules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [user, userRole, language]);

  return (
    <Card variant="premium" className="shadow-xl relative" data-tour="training-widget">
      <WidgetInfoButton description="Postęp w szkoleniach - śledź ukończone moduły i kontynuuj naukę" />
      <CardHeader className="pb-2 flex flex-row items-center justify-between relative">
        {/* Blur backdrop effect - różny dla light/dark */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/[0.02] to-transparent dark:from-white/5 dark:to-transparent rounded-t-2xl dark:backdrop-blur-[2px]" />
        <CardTitle className="relative z-10 text-base font-semibold flex items-center gap-3">
          <Widget3DIcon icon={GraduationCap} variant="gold" size="md" />
          {t('dashboard.trainingProgress')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/training')} className="relative z-10 text-xs text-muted-foreground hover:text-foreground">
          {t('dashboard.viewAll')}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-12 w-12 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : modules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('dashboard.noModulesAvailable')}
          </p>
        ) : (
          <>
            {modules.map((module) => (
              <div
                key={module.id}
                className="group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 -mx-2 px-3 py-3 rounded-xl transition-all"
                onClick={() => navigate(`/training/${module.id}`)}
              >
                <div className="flex items-center gap-4">
                  {/* Donut chart instead of progress bar */}
                  <TrainingDonutChart 
                    progress={module.progress} 
                    isCompleted={module.isCompleted}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground line-clamp-1">
                      {module.title}
                    </span>
                    <span className={`text-xs ${module.isCompleted ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                      {module.isCompleted ? `✓ ${t('dashboard.completed')}` : `${module.progress}% ${t('dashboard.completed').toLowerCase()}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <Button 
              variant="action"
              onClick={() => navigate('/training')} 
              className="w-full mt-3"
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              {t('dashboard.continueTraining')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TrainingProgressWidget;
