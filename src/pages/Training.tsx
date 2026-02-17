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
import { BookOpen, Clock, CheckCircle, ArrowLeft, Award, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCertificateGeneration } from "@/hooks/useCertificateGeneration";
import { useTrainingTranslations } from "@/hooks/useTrainingTranslations";
import { TrainingModule as TrainingModuleType } from "@/types/training";

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
  const [refreshing, setRefreshing] = useState(false);
  const [hasRefreshReminder, setHasRefreshReminder] = useState(false);
  const [certificates, setCertificates] = useState<{[key: string]: {id: string, url: string, issuedAt: string}}>({});
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { generateCertificate } = useCertificateGeneration();

  // Translation hook — maps by id to translate title/description
  const modulesForTranslation = modules.map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    icon_name: m.icon_name || '',
    position: m.position || 0,
    is_active: true,
    visible_to_everyone: true,
    visible_to_clients: true,
    visible_to_partners: true,
    visible_to_specjalista: true,
    visible_to_anonymous: false,
    created_at: '',
  } as TrainingModuleType));
  
  const { translatedModules } = useTrainingTranslations(modulesForTranslation, [], language);
  
  // Apply translations back to modules with extra fields
  const displayModules = modules.map(m => {
    const translated = translatedModules.find(tm => tm.id === m.id);
    return translated ? { ...m, title: translated.title, description: translated.description } : m;
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      if (user) {
        const certMap = await fetchCertificates();
        await fetchTrainingModules(certMap);
        await checkRefreshReminder();
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  // Check for training refresh reminder notifications
  const checkRefreshReminder = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('notification_type', 'training_refresh_reminder')
        .eq('is_read', false)
        .limit(1);
      
      setHasRefreshReminder((data?.length || 0) > 0);
    } catch (error) {
      console.error('Error checking refresh reminder:', error);
    }
  };

  // Mark refresh reminders as read
  const markRefreshReminderRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('notification_type', 'training_refresh_reminder')
        .eq('is_read', false);
      
      setHasRefreshReminder(false);
    } catch (error) {
      console.error('Error marking reminder as read:', error);
    }
  };

  const fetchCertificates = async (): Promise<{[key: string]: {id: string, url: string, issuedAt: string}}> => {
    if (!user) return {};

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('id, module_id, file_url, issued_at')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      if (error) throw error;

      const certMap: {[key: string]: {id: string, url: string, issuedAt: string}} = {};
      // Only keep the newest certificate for each module
      data?.forEach(cert => {
        if (!certMap[cert.module_id]) {
          certMap[cert.module_id] = { id: cert.id, url: cert.file_url, issuedAt: cert.issued_at };
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

    // Check if certificate already exists and has a valid file
    if (certificates[moduleId] && certificates[moduleId].url !== 'downloaded-and-deleted') {
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
      // Check if session is active before calling edge function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast({
          title: "Sesja wygasła",
          description: "Zaloguj się ponownie, aby pobrać certyfikat.",
          variant: "destructive"
        });
        setDownloading(null);
        return;
      }

      let data, error;
      
      // First attempt
      const result = await supabase.functions.invoke('get-certificate-url', {
        body: { certificateId: cert.id }
      });
      
      data = result.data;
      error = result.error;

      // If auth error, try to refresh session and retry
      if (error || data?.sessionExpired) {
        console.log('Auth error, attempting session refresh...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          toast({
            title: "Sesja wygasła",
            description: "Zaloguj się ponownie, aby pobrać certyfikat.",
            variant: "destructive"
          });
          setDownloading(null);
          return;
        }
        
        // Retry after refresh
        const retryResult = await supabase.functions.invoke('get-certificate-url', {
          body: { certificateId: cert.id }
        });
        
        data = retryResult.data;
        error = retryResult.error;
        
        if (error || data?.sessionExpired) {
          throw new Error('Nie udało się odświeżyć sesji');
        }
      }

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

        // Auto-delete certificate file from Storage after successful download
        try {
          if (cert.url && !cert.url.startsWith('pending') && !cert.url.startsWith('downloaded')) {
            let filePath = cert.url;
            // Extract path if it's a full URL
            if (filePath.includes('/storage/v1/object/')) {
              const parts = filePath.split('certificates/');
              if (parts.length > 1) {
                filePath = parts[1];
              }
            }
            await supabase.storage.from('certificates').remove([filePath]);
            await supabase.from('certificates').update({ file_url: 'downloaded-and-deleted' }).eq('id', cert.id);
            // Update local state
            setCertificates(prev => ({
              ...prev,
              [moduleId]: { ...prev[moduleId], url: 'downloaded-and-deleted' }
            }));
            console.log('Certificate file deleted from Storage after download');
          }
        } catch (cleanupError) {
          console.warn('Could not clean up certificate file from Storage:', cleanupError);
          // Don't fail the download if cleanup fails
        }
        
        toast({
          title: "Sukces",
          description: "Certyfikat został pobrany.",
        });
      } else if (data?.deleted) {
        toast({
          title: "Certyfikat już pobrany",
          description: "Użyj opcji 'Regeneruj certyfikat' aby wygenerować nowy.",
          variant: "default"
        });
      } else if (data?.pending) {
        toast({
          title: "Certyfikat w trakcie generowania",
          description: "Poczekaj chwilę i spróbuj ponownie.",
          variant: "default"
        });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : "Nie udało się pobrać certyfikatu. Spróbuj odświeżyć stronę.",
        variant: "destructive"
      });
    } finally {
      setDownloading(null);
    }
  };

  const fetchTrainingModules = async (certMap: {[key: string]: {id: string, url: string, issuedAt: string}} = certificates) => {
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
            .eq('is_active', true)
            .order('position');
          
          if (modulesError) throw modulesError;
          modulesData = assignedModules || [];
        } else {
          // FALLBACK: Use visibility flags if no assignments exist
          let fallbackQuery = supabase
            .from('training_modules')
            .select('*')
            .eq('is_active', true)
            .order('position');
          
          const currentRole = userRole?.role;
          if (currentRole === 'partner') {
            fallbackQuery = fallbackQuery.eq('visible_to_partners', true);
          } else if (currentRole === 'specjalista') {
            fallbackQuery = fallbackQuery.eq('visible_to_specjalista', true);
          } else if (currentRole === 'client' || currentRole === 'user') {
            fallbackQuery = fallbackQuery.eq('visible_to_clients', true);
          }
          
          const { data: fallbackModules, error: fallbackError } = await fallbackQuery;
          if (fallbackError) throw fallbackError;
          modulesData = fallbackModules || [];
        }
      }

      // For each module, get lesson count and user progress
      const modulesWithProgress = await Promise.all(
        modulesData.map(async (module) => {
          // Get certificate date for this module (if exists)
          const certIssuedAt = certMap[module.id]?.issuedAt;
          
          // Get all active lessons with their creation dates
          const { data: lessonsData } = await supabase
            .from('training_lessons')
            .select('id, min_time_seconds, video_duration_seconds, created_at')
            .eq('module_id', module.id)
            .eq('is_active', true);

          // Calculate lessons count - exclude lessons created after certificate issuance
          let relevantLessonsCount = lessonsData?.length || 0;
          if (certIssuedAt && lessonsData) {
            const certDate = new Date(certIssuedAt);
            relevantLessonsCount = lessonsData.filter(l => 
              new Date(l.created_at) <= certDate
            ).length;
          }

          // Get user progress if logged in
          let completedLessons = 0;
          let totalTime = 0;

          if (user) {
            const { data: progressData } = await supabase
              .from('training_progress')
              .select(`
                is_completed,
                lesson:training_lessons!inner(min_time_seconds, created_at)
              `)
              .eq('user_id', user.id)
              .eq('lesson.module_id', module.id)
              .eq('is_completed', true);

            // Count completed lessons - exclude lessons created after certificate if user has one
            if (certIssuedAt && progressData) {
              const certDate = new Date(certIssuedAt);
              completedLessons = progressData.filter((p: any) => 
                new Date(p.lesson.created_at) <= certDate
              ).length;
            } else {
              completedLessons = progressData?.length || 0;
            }
          }

          // Get total estimated time for module (prioritize video_duration_seconds)
          totalTime = lessonsData?.reduce((acc, lesson) => 
            acc + (lesson.video_duration_seconds || lesson.min_time_seconds || 0), 0) || 0;

          return {
            ...module,
            lessons_count: relevantLessonsCount,
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

  // Get dashboard preference for proper navigation
  const dashboardPreference = localStorage.getItem('dashboard_view_preference') || 'modern';
  const homeUrl = dashboardPreference === 'modern' ? '/dashboard' : '/';

  // Refresh academy - check and add missing assignments
  const refreshAcademy = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      // 1. Get user's role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      const currentRole = roleData?.role;
      
      // 2. Get existing assignments (only module IDs)
      const { data: existingAssignments } = await supabase
        .from('training_assignments')
        .select('module_id')
        .eq('user_id', user.id);
      
      const existingModuleIds = new Set(existingAssignments?.map(a => a.module_id) || []);
      
      // 3. Get modules available for role
      let query = supabase
        .from('training_modules')
        .select('id')
        .eq('is_active', true);
      
      if (currentRole === 'partner') {
        query = query.eq('visible_to_partners', true);
      } else if (currentRole === 'specjalista') {
        query = query.eq('visible_to_specjalista', true);
      } else if (currentRole === 'client' || currentRole === 'user') {
        query = query.eq('visible_to_clients', true);
      } else if (currentRole === 'admin') {
        // Admin sees all modules - no filter needed
      }
      
      const { data: availableModules } = await query;
      
      // 4. Find missing assignments
      const missingModuleIds = (availableModules || [])
        .filter(m => !existingModuleIds.has(m.id))
        .map(m => m.id);
      
      // 5. Add missing assignments (if any)
      if (missingModuleIds.length > 0) {
        const newAssignments = missingModuleIds.map(moduleId => ({
          user_id: user.id,
          module_id: moduleId,
          assigned_by: null,
          notification_sent: true
        }));
        
        await supabase
          .from('training_assignments')
          .insert(newAssignments);
        
        toast({
          title: "Akademia odświeżona",
          description: `Dodano ${missingModuleIds.length} nowych szkoleń`,
        });
        
        // Reload data
        const certMap = await fetchCertificates();
        await fetchTrainingModules(certMap);
      } else {
        toast({
          title: "Akademia aktualna",
          description: "Wszystkie dostępne szkolenia są już przypisane",
        });
      }
    } catch (error) {
      console.error('Error refreshing academy:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się odświeżyć akademii",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Navigation */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(homeUrl)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('training.backToHome')}
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-xl font-semibold">{t('training.title')}</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAcademy}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Odśwież akademię</span>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Refresh reminder banner */}
        {hasRefreshReminder && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Wykryto brakujące szkolenia</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Kliknij przycisk poniżej, aby zsynchronizować dostępne materiały szkoleniowe.</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={async () => {
                await refreshAcademy();
                await markRefreshReminderRead();
              }}
              disabled={refreshing}
              className="flex-shrink-0"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Odśwież akademię
            </Button>
          </div>
        )}

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
            {displayModules.map((module) => {
              const progress = getProgressPercentage(module.completed_lessons, module.lessons_count);
              const status = getModuleStatus(module.completed_lessons, module.lessons_count);
              const hasCertificate = !!certificates[module.id];
              const certDeleted = certificates[module.id]?.url === 'downloaded-and-deleted';
              
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
                                {certDeleted
                                  ? "Certyfikat pobrany — wygeneruj ponownie"
                                  : hasCertificate 
                                    ? "Certyfikat gotowy do pobrania" 
                                    : "Certyfikat dostępny do wygenerowania"}
                              </span>
                            </div>
                            
                            {hasCertificate && !certDeleted ? (
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
