import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Play, CheckCircle, ArrowRight } from 'lucide-react';

interface TrainingModule {
  id: string;
  title: string;
  progress: number;
  total_lessons: number;
  completed_lessons: number;
  is_completed: boolean;
}

export const TrainingProgressWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrainingProgress = async () => {
      if (!user) return;

      try {
        const { data: assignments, error } = await supabase
          .from('training_assignments')
          .select('module_id, is_completed')
          .eq('user_id', user.id)
          .order('assigned_at', { ascending: false })
          .limit(4);

        if (error) throw error;

        const modulesWithProgress: TrainingModule[] = [];
        
        for (const assignment of assignments || []) {
          const { data: moduleData } = await supabase
            .from('training_modules')
            .select('id, title, is_active')
            .eq('id', assignment.module_id)
            .eq('is_active', true)
            .single();

          if (!moduleData) continue;

          const { count: totalLessons } = await supabase
            .from('training_lessons')
            .select('*', { count: 'exact', head: true })
            .eq('module_id', moduleData.id)
            .eq('is_active', true);

          const { count: completedLessons } = await supabase
            .from('training_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('module_id', moduleData.id)
            .eq('completed', true);

          const progress = totalLessons && totalLessons > 0 
            ? Math.round(((completedLessons || 0) / totalLessons) * 100)
            : 0;

          modulesWithProgress.push({
            id: moduleData.id,
            title: moduleData.title,
            progress,
            total_lessons: totalLessons || 0,
            completed_lessons: completedLessons || 0,
            is_completed: assignment.is_completed || false,
          });
        }

        setModules(modulesWithProgress);
      } catch (error) {
        console.error('Error fetching training progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainingProgress();
  }, [user]);

  if (loading) {
    return (
      <Card className="dashboard-widget h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Postęp szkoleń
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-widget h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Postęp szkoleń
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/szkolenia')}
          className="text-primary hover:text-primary/80"
        >
          Zobacz wszystkie
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {modules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Brak przypisanych szkoleń</p>
            <Button 
              variant="link" 
              onClick={() => navigate('/szkolenia')}
              className="mt-2"
            >
              Przeglądaj szkolenia
            </Button>
          </div>
        ) : (
          modules.map((module) => (
            <div 
              key={module.id}
              className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/szkolenia/${module.id}`)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="font-medium text-sm line-clamp-1 flex-1">
                  {module.title}
                </h4>
                {module.is_completed ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 shrink-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ukończone
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 shrink-0">
                    <Play className="h-3 w-3 mr-1" />
                    W trakcie
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Progress value={module.progress} className="h-2 flex-1" />
                <span className="text-xs text-muted-foreground shrink-0">
                  {module.completed_lessons}/{module.total_lessons}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
