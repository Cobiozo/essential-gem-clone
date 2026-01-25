import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, ArrowRight, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface ModuleProgress {
  id: string;
  title: string;
  progress: number;
  isCompleted: boolean;
}

export const TrainingProgressWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
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

        // Fetch user's certificates to check for issuance dates
        const { data: certificatesData } = await supabase
          .from('certificates')
          .select('module_id, issued_at')
          .eq('user_id', user.id)
          .order('issued_at', { ascending: false });

        // Build a map of module_id -> newest certificate issued_at
        const certMap: {[key: string]: string} = {};
        certificatesData?.forEach(cert => {
          if (!certMap[cert.module_id]) {
            certMap[cert.module_id] = cert.issued_at;
          }
        });

        // Calculate progress for each module based on completed lessons
        const modulesWithProgress: ModuleProgress[] = await Promise.all(
          modulesData.map(async (mod: any) => {
            const certIssuedAt = certMap[mod.id];
            
            // Get all active lessons with their creation dates
            const { data: lessonsData } = await supabase
              .from('training_lessons')
              .select('id, created_at')
              .eq('module_id', mod.id)
              .eq('is_active', true);

            // Calculate total lessons - exclude lessons created after certificate issuance
            let totalLessons = lessonsData?.length || 0;
            if (certIssuedAt && lessonsData) {
              const certDate = new Date(certIssuedAt);
              totalLessons = lessonsData.filter(l => 
                new Date(l.created_at) <= certDate
              ).length;
            }

            // Get completed lessons by user in this module
            const { data: completedData } = await supabase
              .from('training_progress')
              .select('lesson_id, is_completed, training_lessons!inner(module_id, created_at)')
              .eq('user_id', user.id)
              .eq('is_completed', true);

            // Filter completed lessons - exclude lessons created after certificate if user has one
            let completedInModule = 0;
            if (certIssuedAt && completedData) {
              const certDate = new Date(certIssuedAt);
              completedInModule = completedData.filter(
                (p: any) => p.training_lessons?.module_id === mod.id && 
                           new Date(p.training_lessons?.created_at) <= certDate
              ).length;
            } else {
              completedInModule = completedData?.filter(
                (p: any) => p.training_lessons?.module_id === mod.id
              ).length || 0;
            }

            const total = totalLessons || 0;
            const progressPercent = total > 0 ? Math.round((completedInModule / total) * 100) : 0;

            return {
              id: mod.id,
              title: mod.title,
              progress: progressPercent,
              isCompleted: progressPercent === 100,
            };
          })
        );

        setModules(modulesWithProgress);
      } catch (error) {
        console.error('Error fetching training modules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [user, userRole]);

  return (
    <Card className="shadow-sm" data-tour="training-widget">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          {t('dashboard.trainingProgress')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/training')} className="text-xs">
          {t('dashboard.viewAll')}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-2 bg-muted rounded" />
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
                className="group cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                onClick={() => navigate(`/training/${module.id}`)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground line-clamp-1 flex-1 mr-2">
                    {module.title}
                  </span>
                  <span className={`text-xs font-medium ${module.isCompleted ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {module.isCompleted ? t('dashboard.completed') : `${module.progress}%`}
                  </span>
                </div>
                <Progress 
                  value={module.progress} 
                  className={`h-1.5 ${module.isCompleted ? '[&>div]:bg-emerald-500' : ''}`} 
                />
              </div>
            ))}

            <Button 
              onClick={() => navigate('/training')} 
              className="w-full mt-2 bg-primary hover:bg-primary/90"
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
