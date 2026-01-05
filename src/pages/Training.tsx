import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BookOpen, Clock, CheckCircle, ArrowLeft, Award, Download, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCertificateGeneration } from "@/hooks/useCertificateGeneration";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  position: number;
  lessons_count: number;
  completed_lessons: number;
  total_time_minutes: number;
  certificate_id?: string;
  certificate_url?: string;
}

const Training = () => {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<{[key: string]: {id: string, url: string}}>({});
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { generateCertificate } = useCertificateGeneration();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      let certMap: {[key: string]: {id: string, url: string}} = {};
      
      if (user) {
        certMap = await fetchCertificates();
      }
      await fetchTrainingModules(certMap);
      setLoading(false);
    };
    loadData();
  }, [user]);

  const fetchCertificates = async () => {
    if (!user) return {};

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('id, module_id, file_url, issued_at')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      if (error) throw error;

      const certMap: {[key: string]: {id: string, url: string}} = {};
      // Only keep the newest certificate for each module
      data?.forEach(cert => {
        if (!certMap[cert.module_id]) {
          certMap[cert.module_id] = { id: cert.id, url: cert.file_url };
        }
      });
      setCertificates(certMap);
      return certMap;
    } catch (error) {
      console.error('Error fetching certificates:', error);
      return {};
    }
  };

  // Generate certificate (one-time only)
  const handleGenerateCertificate = async (moduleId: string, moduleTitle: string) => {
    if (!user) return;

    // Check if certificate already exists
    if (certificates[moduleId]) {
      toast({
        title: "Certyfikat już wygenerowany",
        description: "Możesz go pobrać klikając przycisk 'Pobierz certyfikat'.",
      });
      return;
    }

    setGenerating(moduleId);
    
    try {
      toast({
        title: "Generowanie certyfikatu...",
        description: "Trwa przygotowywanie certyfikatu.",
      });

      // Generate without forceRegenerate (one-time only)
      const result = await generateCertificate(user.id, moduleId, moduleTitle, false);

      if (!result.success) {
        throw new Error(result.error || 'Błąd generowania certyfikatu');
      }

      // Refresh certificates list
      await fetchCertificates();

      toast({
        title: "Sukces!",
        description: "Certyfikat został wygenerowany. Możesz go teraz pobrać.",
      });
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : "Nie udało się wygenerować certyfikatu",
        variant: "destructive"
      });
    } finally {
      setGenerating(null);
    }
  };

  // Regenerate certificate with confirmation
  const handleRegenerateCertificate = async (moduleId: string, moduleTitle: string) => {
    if (!user) return;

    setRegenerating(moduleId);
    
    try {
      toast({
        title: "Regenerowanie certyfikatu...",
        description: "Trwa przygotowywanie nowego certyfikatu.",
      });

      const result = await generateCertificate(user.id, moduleId, moduleTitle, true);

      if (!result.success) {
        throw new Error(result.error || 'Błąd regenerowania certyfikatu');
      }

      await fetchCertificates();

      toast({
        title: "Sukces!",
        description: "Nowy certyfikat został wygenerowany.",
      });
    } catch (error) {
      console.error('Error regenerating certificate:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : "Nie udało się zregenerować certyfikatu",
        variant: "destructive"
      });
    } finally {
      setRegenerating(null);
    }
  };

  // Download existing certificate (no regeneration)
  const downloadCertificate = async (moduleId: string, moduleTitle: string) => {
    const cert = certificates[moduleId];
    if (!cert) return;

    setDownloading(moduleId);
    
    try {
      const { data, error } = await supabase.functions.invoke('get-certificate-url', {
        body: { certificateId: cert.id }
      });

      if (error) throw error;

      if (data?.url) {
        const response = await fetch(data.url);
        const blob = await response.blob();
        
        const filename = `certyfikat-${moduleTitle.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        title: t('common.error'),
        description: "Nie udało się pobrać certyfikatu",
        variant: "destructive"
      });
    } finally {
      setDownloading(null);
    }
  };

  const fetchTrainingModules = async (certMap: {[key: string]: {id: string, url: string}} = certificates) => {
    try {
      // Get current user's profile to check if admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      let modulesData;
      
      if (isAdmin) {
        // Admins see all modules
        const { data, error } = await supabase
          .from('training_modules')
          .select('*')
          .eq('is_active', true)
          .order('position');
        
        if (error) throw error;
        modulesData = data;
      } else {
        // Non-admins see assigned modules (bypassing visibility restrictions)
        const { data: assignments, error } = await supabase
          .from('training_assignments')
          .select('module_id')
          .eq('user_id', user?.id);
        
        if (error) throw error;
        
        if (assignments && assignments.length > 0) {
          const moduleIds = assignments.map(a => a.module_id);
          const { data: assignedModules, error: modulesError } = await supabase
            .from('training_modules')
            .select('*')
            .in('id', moduleIds)
            .order('position');
          
          if (modulesError) throw modulesError;
          modulesData = assignedModules || [];
        } else {
          modulesData = [];
        }
      }

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
            total_time_minutes: Math.ceil(totalTime / 60),
            certificate_id: certMap[module.id]?.id,
            certificate_url: certMap[module.id]?.url
          };
        })
      );

      setModules(modulesWithProgress);
    } catch (error) {
      console.error('Error fetching training modules:', error);
      toast({
        title: t('common.error'),
        description: t('training.loadError'),
        variant: "destructive"
      });
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getModuleStatus = (completed: number, total: number) => {
    if (total === 0) return { text: t('training.statusNoLessons'), variant: "secondary" as const };
    if (completed === 0) return { text: t('training.statusNotStarted'), variant: "default" as const };
    if (completed === total) return { text: t('training.statusCompleted'), variant: "success" as const };
    return { text: t('training.statusInProgress'), variant: "warning" as const };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('training.loadingAcademy')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Navigation */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('training.backToHome')}
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-xl font-semibold">{t('training.title')}</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{t('training.title')}</h1>
          <p className="text-muted-foreground">
            {t('training.description')}
          </p>
        </div>

        {modules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('training.noTrainings')}</h3>
                <p className="text-muted-foreground">
                  {t('training.noTrainingsDescription')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => {
              const progress = getProgressPercentage(module.completed_lessons, module.lessons_count);
              const status = getModuleStatus(module.completed_lessons, module.lessons_count);
              const hasCertificate = !!certificates[module.id];
              
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
                          <span className="text-sm font-medium">{t('training.progress')}</span>
                          <span className="text-sm text-muted-foreground">
                            {module.completed_lessons}/{module.lessons_count} {t('training.lessons')}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{module.lessons_count} {t('training.lessons')}</span>
                        </div>
                        {module.total_time_minutes > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{module.total_time_minutes} {t('training.minutes')}</span>
                          </div>
                        )}
                      </div>

                      {/* Certificate Section - Only show when 100% completed */}
                      {progress === 100 && (
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Award className="h-5 w-5 text-primary" />
                              <span className="text-sm font-medium">
                                {hasCertificate 
                                  ? "Certyfikat gotowy do pobrania" 
                                  : "Certyfikat dostępny do wygenerowania"}
                              </span>
                            </div>
                            
                            {hasCertificate ? (
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => downloadCertificate(module.id, module.title)}
                                  disabled={downloading === module.id}
                                >
                                  {downloading === module.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                  <span className="ml-2">Pobierz certyfikat</span>
                                </Button>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="text-xs h-7"
                                      disabled={regenerating === module.id}
                                    >
                                      {regenerating === module.id ? (
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-3 w-3" />
                                      )}
                                      <span className="ml-1">Regeneruj certyfikat</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Regeneruj certyfikat</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Czy na pewno chcesz wygenerować nowy certyfikat? 
                                        Poprzedni certyfikat zostanie zastąpiony.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleRegenerateCertificate(module.id, module.title)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Tak, regeneruj
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleGenerateCertificate(module.id, module.title)}
                                disabled={generating === module.id}
                              >
                                {generating === module.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Award className="h-4 w-4" />
                                )}
                                <span className="ml-2">Wygeneruj</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      <Button 
                        onClick={() => navigate(`/training/${module.id}`)}
                        className="w-full"
                        variant={progress === 100 ? "outline" : "default"}
                      >
                        {progress === 100 ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t('training.reviewAgain')}
                          </>
                        ) : progress > 0 ? (
                          t('training.continueTraining')
                        ) : (
                          t('training.startTraining')
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
