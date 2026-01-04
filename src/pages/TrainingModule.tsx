import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Lock, 
  Play, 
  Clock,
  FileText,
  Video,
  Volume2,
  File
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SecureMedia } from "@/components/SecureMedia";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
}

interface TrainingLesson {
  id: string;
  title: string;
  content: string;
  media_url: string;
  media_type: string;
  media_alt_text: string;
  min_time_seconds: number;
  is_required: boolean;
  position: number;
}

interface LessonProgress {
  lesson_id: string;
  time_spent_seconds: number;
  is_completed: boolean;
  started_at: string;
  completed_at: string | null;
}

const TrainingModule = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canProceed, setCanProceed] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!moduleId) return;
      
      try {
        // Fetch module details
        const { data: moduleData, error: moduleError } = await supabase
          .from('training_modules')
          .select('*')
          .eq('id', moduleId)
          .single();

        if (!mounted) return;
        if (moduleError) throw moduleError;
        setModule(moduleData);

        // Fetch lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('training_lessons')
          .select('*')
          .eq('module_id', moduleId)
          .eq('is_active', true)
          .order('position');

        if (!mounted) return;
        if (lessonsError) throw lessonsError;
        setLessons(lessonsData);

        // Fetch user progress if logged in
        if (user) {
          const { data: progressData, error: progressError } = await supabase
            .from('training_progress')
            .select('*')
            .eq('user_id', user.id)
            .in('lesson_id', lessonsData.map(l => l.id));

          if (!mounted) return;
          if (progressError) throw progressError;

          const progressMap = progressData.reduce((acc, p) => {
            acc[p.lesson_id] = p;
            return acc;
          }, {} as Record<string, LessonProgress>);

          setProgress(progressMap);

          // Find the first incomplete lesson to start from
          const firstIncompleteIndex = lessonsData.findIndex(lesson => 
            !progressMap[lesson.id]?.is_completed
          );
          
          if (firstIncompleteIndex !== -1) {
            setCurrentLessonIndex(firstIncompleteIndex);
          }
        }
      } catch (error) {
        console.error('Error fetching module data:', error);
        if (mounted) {
          toast({
            title: "Błąd",
            description: "Nie można załadować danych szkolenia",
            variant: "destructive"
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [moduleId, user, toast]);

  useEffect(() => {
    // Start timer when lesson changes
    startTimeRef.current = Date.now();
    setTimeSpent(0);
    
    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start new timer
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
      setTimeSpent(elapsed);
      
      // Check if user can proceed
      const currentLesson = lessons[currentLessonIndex];
      if (currentLesson) {
        const lessonProgress = progress[currentLesson.id];
        const totalTimeSpent = (lessonProgress?.time_spent_seconds || 0) + elapsed;
        setCanProceed(totalTimeSpent >= (currentLesson.min_time_seconds || 0));
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentLessonIndex, lessons, progress]);

  const saveProgress = async () => {
    if (!user || lessons.length === 0) return;

    const currentLesson = lessons[currentLessonIndex];
    if (!currentLesson) return;

    const totalTimeSpent = (progress[currentLesson.id]?.time_spent_seconds || 0) + timeSpent;
    const isCompleted = totalTimeSpent >= (currentLesson.min_time_seconds || 0);

    try {
      const { error } = await supabase
        .from('training_progress')
        .upsert({
          user_id: user.id,
          lesson_id: currentLesson.id,
          time_spent_seconds: totalTimeSpent,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        });

      if (error) throw error;

      // Update local progress
      setProgress(prev => ({
        ...prev,
        [currentLesson.id]: {
          ...prev[currentLesson.id],
          lesson_id: currentLesson.id,
          time_spent_seconds: totalTimeSpent,
          is_completed: isCompleted,
          started_at: prev[currentLesson.id]?.started_at || new Date().toISOString(),
          completed_at: isCompleted ? new Date().toISOString() : null
        }
      }));

      if (isCompleted && !progress[currentLesson.id]?.is_completed) {
        toast({
          title: "Lekcja ukończona!",
          description: `Pomyślnie ukończyłeś lekcję "${currentLesson.title}"`,
        });
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const goToNextLesson = async () => {
    await saveProgress();
    
    if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    } else {
      // Check if all lessons are completed
      const allCompleted = lessons.every(lesson => {
        const lessonProgress = progress[lesson.id];
        if (lesson.id === lessons[currentLessonIndex].id) {
          // Current lesson - check if it will be completed after save
          const totalTime = (lessonProgress?.time_spent_seconds || 0) + timeSpent;
          return totalTime >= (lesson.min_time_seconds || 0);
        }
        return lessonProgress?.is_completed;
      });

      if (allCompleted && user) {
        // Auto-generate certificate
        toast({
          title: "Generowanie certyfikatu...",
          description: "Trwa automatyczne wystawianie certyfikatu.",
        });

        try {
          const { data, error } = await supabase.functions.invoke('auto-generate-certificate', {
            body: { userId: user.id, moduleId }
          });

          if (error) throw error;

          if (data?.success) {
            if (data.alreadyExists) {
              toast({
                title: "Moduł ukończony!",
                description: "Certyfikat został już wcześniej wystawiony.",
              });
            } else {
              toast({
                title: "🎉 Certyfikat wystawiony!",
                description: `Gratulacje! Ukończyłeś "${data.moduleTitle}" i otrzymałeś certyfikat.`,
              });
            }
          } else {
            console.error('Certificate generation failed:', data?.error);
            toast({
              title: "Moduł ukończony!",
              description: "Gratulacje! Ukończyłeś wszystkie lekcje.",
            });
          }
        } catch (certError) {
          console.error('Error generating certificate:', certError);
          toast({
            title: "Moduł ukończony!",
            description: "Gratulacje! Ukończyłeś wszystkie lekcje w tym module.",
          });
        }
      } else {
        toast({
          title: "Moduł ukończony!",
          description: "Gratulacje! Ukończyłeś wszystkie lekcje w tym module.",
        });
      }
      
      navigate('/training');
    }
  };

  const goToPreviousLesson = async () => {
    await saveProgress();
    
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const jumpToLesson = async (index: number) => {
    // Check if user can access this lesson
    if (index > 0) {
      const previousLesson = lessons[index - 1];
      if (previousLesson && !progress[previousLesson.id]?.is_completed) {
        toast({
          title: "Dostęp zablokowany",
          description: "Musisz ukończyć poprzednią lekcję, aby przejść dalej.",
          variant: "destructive"
        });
        return;
      }
    }

    await saveProgress();
    setCurrentLessonIndex(index);
  };

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Volume2 className="h-4 w-4" />;
      case 'document': return <File className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/training')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Powrót
            </Button>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Ładowanie szkolenia...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!module || lessons.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Nie znaleziono szkolenia</h3>
              <p className="text-muted-foreground mb-4">
                Szkolenie nie istnieje lub nie masz do niego dostępu.
              </p>
              <Button onClick={() => navigate('/training')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Powrót do szkoleń
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentLesson = lessons[currentLessonIndex];
  const currentProgress = progress[currentLesson?.id];
  const isLessonCompleted = currentProgress?.is_completed || false;
  const totalTimeSpent = (currentProgress?.time_spent_seconds || 0) + timeSpent;
  const progressPercentage = currentLesson?.min_time_seconds 
    ? Math.min(100, (totalTimeSpent / currentLesson.min_time_seconds) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Navigation */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/training')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Powrót do szkoleń
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-lg font-semibold">{module.title}</h1>
            {module.description && (
              <p className="text-sm text-muted-foreground">{module.description}</p>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Module Progress Overview */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Lesson List Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lekcje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lessons.map((lesson, index) => {
                  const lessonProgress = progress[lesson.id];
                  const isCompleted = lessonProgress?.is_completed;
                  const isCurrent = index === currentLessonIndex;
                  const isLocked = index > 0 && !progress[lessons[index - 1].id]?.is_completed;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => jumpToLesson(index)}
                      disabled={isLocked}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isCurrent 
                          ? 'border-primary bg-primary/5' 
                          : isLocked 
                          ? 'border-muted bg-muted/30 cursor-not-allowed opacity-60'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isLocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          getMediaIcon(lesson.media_type)
                        )}
                        <span className="text-sm font-medium truncate">
                          {lesson.title}
                        </span>
                      </div>
                      {lesson.min_time_seconds > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(lesson.min_time_seconds)}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{currentLesson.title}</CardTitle>
                  <Badge variant={currentProgress?.is_completed ? "default" : "secondary"}>
                    {currentProgress?.is_completed ? "Ukończone" : "W trakcie"}
                  </Badge>
                </div>
                
                {/* Progress Bar */}
                {currentLesson.min_time_seconds > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Postęp</span>
                      <span>
                        {formatTime(totalTimeSpent)} / {formatTime(currentLesson.min_time_seconds)}
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Media Content */}
                {currentLesson.media_url && (
                  <div className="border rounded-lg overflow-hidden">
                    <SecureMedia 
                      mediaUrl={currentLesson.media_url}
                      mediaType={currentLesson.media_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
                      altText={currentLesson.media_alt_text}
                      disableInteraction={!isLessonCompleted}
                      className="w-full max-h-96 object-contain"
                    />
                    {isLessonCompleted && currentLesson.media_type === 'video' && (
                      <div className="bg-green-50 border-t border-green-200 px-4 py-2 text-sm text-green-700">
                        ✓ Lekcja ukończona - możesz obejrzeć ponownie z pełnymi kontrolkami
                      </div>
                    )}
                  </div>
                )}

                {/* Text Content */}
                {currentLesson.content && (
                  <div className="prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: currentLesson.content }} />
                  </div>
                )}

                <Separator />

                {/* Navigation */}
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={goToPreviousLesson}
                    disabled={currentLessonIndex === 0}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Poprzednia
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    {currentLessonIndex + 1} z {lessons.length}
                  </div>

                  <Button
                    onClick={goToNextLesson}
                    disabled={!canProceed && currentLesson.min_time_seconds > 0 && !isLessonCompleted}
                  >
                    {currentLessonIndex === lessons.length - 1 ? "Zakończ" : "Następna"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                {/* Time Warning */}
                {!canProceed && currentLesson.min_time_seconds > 0 && !isLessonCompleted && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <Clock className="h-5 w-5 text-amber-600 mx-auto mb-2" />
                    <p className="text-sm text-amber-800">
                      Musisz spędzić co najmniej {formatTime(currentLesson.min_time_seconds)} na tej lekcji, 
                      aby przejść do następnej.
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Pozostało: {formatTime(Math.max(0, currentLesson.min_time_seconds - totalTimeSpent))}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingModule;