import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, CheckCircle, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  position: number;
  lessons_count: number;
  completed_lessons: number;
  total_time_minutes: number;
}

const Training = () => {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchTrainingModules();
  }, [user]);

  const fetchTrainingModules = async () => {
    try {
      // Fetch modules with lesson counts and progress
      const { data: modulesData, error: modulesError } = await supabase
        .from('training_modules')
        .select('*')
        .eq('is_active', true)
        .order('position');

      if (modulesError) throw modulesError;

      // For each module, get lesson count and user progress
      const modulesWithProgress = await Promise.all(
        modulesData.map(async (module) => {
          // Get lesson count
          const { count: lessonsCount } = await supabase
            .from('training_lessons')
            .select('*', { count: 'exact', head: true })
            .eq('module_id', module.id)
            .eq('is_active', true);

          // Get user progress if logged in
          let completedLessons = 0;
          let totalTime = 0;

          if (user) {
            const { data: progressData } = await supabase
              .from('training_progress')
              .select(`
                is_completed,
                lesson:training_lessons!inner(min_time_seconds)
              `)
              .eq('user_id', user.id)
              .eq('lesson.module_id', module.id)
              .eq('is_completed', true);

            completedLessons = progressData?.length || 0;
          }

          // Get total estimated time for module
          const { data: lessonsData } = await supabase
            .from('training_lessons')
            .select('min_time_seconds')
            .eq('module_id', module.id)
            .eq('is_active', true);

          totalTime = lessonsData?.reduce((acc, lesson) => acc + (lesson.min_time_seconds || 0), 0) || 0;

          return {
            ...module,
            lessons_count: lessonsCount || 0,
            completed_lessons: completedLessons,
            total_time_minutes: Math.ceil(totalTime / 60)
          };
        })
      );

      setModules(modulesWithProgress);
    } catch (error) {
      console.error('Error fetching training modules:', error);
      toast({
        title: "Błąd",
        description: "Nie można załadować modułów szkoleniowych",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getModuleStatus = (completed: number, total: number) => {
    if (total === 0) return { text: "Brak lekcji", variant: "secondary" as const };
    if (completed === 0) return { text: "Nierozpoczęty", variant: "default" as const };
    if (completed === total) return { text: "Ukończony", variant: "success" as const };
    return { text: "W trakcie", variant: "warning" as const };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie szkoleń...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Szkolenia</h1>
          <p className="text-muted-foreground">
            Ukończ wszystkie wymagane szkolenia, aby zdobyć niezbędną wiedzę i certyfikaty.
          </p>
        </div>

        {modules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Brak dostępnych szkoleń</h3>
                <p className="text-muted-foreground">
                  Obecnie nie ma żadnych szkoleń dostępnych dla Twojej roli.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => {
              const progress = getProgressPercentage(module.completed_lessons, module.lessons_count);
              const status = getModuleStatus(module.completed_lessons, module.lessons_count);
              
              return (
                <Card key={module.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="h-6 w-6 text-primary" />
                      <Badge variant={status.variant === "success" ? "default" : status.variant === "warning" ? "secondary" : status.variant}>{status.text}</Badge>
                    </div>
                    <CardTitle className="text-xl">{module.title}</CardTitle>
                    {module.description && (
                      <p className="text-muted-foreground text-sm">{module.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Progress */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Postęp</span>
                          <span className="text-sm text-muted-foreground">
                            {module.completed_lessons}/{module.lessons_count} lekcji
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{module.lessons_count} lekcji</span>
                        </div>
                        {module.total_time_minutes > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{module.total_time_minutes} min</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <Button 
                        onClick={() => navigate(`/training/${module.id}`)}
                        className="w-full"
                        variant={progress === 100 ? "outline" : "default"}
                      >
                        {progress === 100 ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Przejrzyj ponownie
                          </>
                        ) : progress > 0 ? (
                          "Kontynuuj szkolenie"
                        ) : (
                          "Rozpocznij szkolenie"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Training;