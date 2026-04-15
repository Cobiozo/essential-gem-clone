import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
  Clock,
  FileText,
  Video,
  Volume2,
  File,
  ExternalLink,
  Link,
  Download,
  StickyNote,
  ChevronDown,
  CircleDot,
  Circle
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { SecureMedia } from "@/components/SecureMedia";
import { LessonActionButton } from "@/types/training";
import { useLessonNotes } from "@/hooks/useLessonNotes";
import { LessonNotesDialog } from "@/components/training/LessonNotesDialog";

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
  video_duration_seconds?: number;
  is_required: boolean;
  position: number;
  action_buttons?: LessonActionButton[];
  completion_method?: string;
}

interface LessonProgress {
  lesson_id: string;
  time_spent_seconds: number;
  is_completed: boolean;
  started_at: string;
  completed_at: string | null;
  video_position_seconds?: number;
  updated_at?: string;
}

// Completion threshold: 80% of video duration (tolerant for iOS)
const VIDEO_COMPLETION_THRESHOLD = 0.8;

const TrainingModule = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [isNavigating, setIsNavigating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Ref for auto-scroll to completion button
  const completionButtonRef = useRef<HTMLDivElement>(null);
  // Video position tracking (lightweight — no auto-save)
  const [videoPosition, setVideoPosition] = useState(0);
  const [savedVideoPosition, setSavedVideoPosition] = useState(0);
  const [positionLoaded, setPositionLoaded] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoDurationRef = useRef<number>(0);
  
  // Text lesson timer (only for lessons without video)
  const [textLessonTime, setTextLessonTime] = useState(0);
  
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout>();
  const videoPositionRef = useRef<number>(0);
  
  // Refs for beforeunload to access current values without triggering re-registrations
  const textLessonTimeRef = useRef<number>(0);
  const currentLessonIndexRef = useRef<number>(0);
  const lessonsRef = useRef<TrainingLesson[]>([]);
  const progressRef = useRef<Record<string, LessonProgress>>({});
  
  // Notes dialog state
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const seekToTimeRef = useRef<((time: number) => void) | null>(null);
  
  // Translation state
  const [moduleTranslations, setModuleTranslations] = useState<Record<string, { title?: string; description?: string }>>({});
  const [lessonTranslations, setLessonTranslations] = useState<Record<string, { title?: string; content?: string; media_alt_text?: string }>>({});
  
  // Fetch translations when language changes
  useEffect(() => {
    if (language === 'pl' || !module || lessons.length === 0) {
      setModuleTranslations({});
      setLessonTranslations({});
      return;
    }
    
    const fetchTranslations = async () => {
      const [{ data: modTrans }, { data: lessTrans }] = await Promise.all([
        supabase.from('training_module_translations').select('*').eq('language_code', language).eq('module_id', module.id),
        supabase.from('training_lesson_translations').select('*').eq('language_code', language).in('lesson_id', lessons.map(l => l.id)),
      ]);
      
      const modMap: typeof moduleTranslations = {};
      modTrans?.forEach((t: any) => { modMap[t.module_id] = { title: t.title, description: t.description }; });
      setModuleTranslations(modMap);
      
      const lessMap: typeof lessonTranslations = {};
      lessTrans?.forEach((t: any) => { lessMap[t.lesson_id] = { title: t.title, content: t.content, media_alt_text: t.media_alt_text }; });
      setLessonTranslations(lessMap);
    };
    fetchTranslations();
  }, [language, module?.id, lessons.length]);
  
  // Apply translations
  const displayModule = useMemo(() => {
    if (!module) return null;
    const t = moduleTranslations[module.id];
    return t ? { ...module, title: t.title || module.title, description: t.description || module.description } : module;
  }, [module, moduleTranslations]);
  
  const displayLessons = useMemo(() => {
    return lessons.map(l => {
      const t = lessonTranslations[l.id];
      return t ? { ...l, title: t.title || l.title, content: t.content || l.content, media_alt_text: t.media_alt_text || l.media_alt_text } : l;
    });
  }, [lessons, lessonTranslations]);
  
  // Get current lesson for notes hook (must be before any conditional returns)
  const currentLesson = lessons[currentLessonIndex];
  
  // Notes hook
  const {
    notes,
    noteMarkers,
    addNote,
    updateNote,
    deleteNote,
    exportNotes,
    getNoteById
  } = useLessonNotes(currentLesson?.id, user?.id);
  
  const formatNoteTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleNoteMarkerClick = useCallback((noteId: string) => {
    const note = getNoteById(noteId);
    if (note) {
      toast({
        title: `Notatka (${formatNoteTime(note.video_timestamp_seconds)})`,
        description: note.content
      });
    }
  }, [getNoteById, toast]);
  
  const handleSeekToTime = useCallback((seconds: number) => {
    const currentProgress = progress[currentLesson?.id];
    const completed = currentProgress?.is_completed || false;
    if (seekToTimeRef.current && completed) {
      seekToTimeRef.current(seconds);
    }
  }, [progress, currentLesson?.id]);
  
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Redirect unauthenticated users
  useEffect(() => {
    if (!user && !loading) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      navigate(`/auth?returnTo=${returnUrl}`);
    }
  }, [user, loading, navigate]);

  // Load module, lessons and progress
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!moduleId || !user) return;
      
      if (!isValidUUID(moduleId)) {
        console.error('[TrainingModule] Invalid module ID format:', moduleId);
        toast({
          title: "Błąd",
          description: "Nieprawidłowy identyfikator modułu szkoleniowego",
          variant: "destructive"
        });
        navigate('/training');
        return;
      }
      
      try {
        const { data: moduleData, error: moduleError } = await supabase
          .from('training_modules')
          .select('*')
          .eq('id', moduleId)
          .single();

        if (!mounted) return;
        if (moduleError) throw moduleError;

        // Check sequential unlock via server-side validation
        if (moduleData.unlock_order != null) {
          const { data: isUnlocked, error: unlockErr } = await supabase
            .rpc('check_training_module_unlock', {
              p_user_id: user.id,
              p_module_id: moduleId
            });

          if (unlockErr) {
            console.error('[TrainingModule] Unlock check error:', unlockErr);
          }

          if (isUnlocked === false) {
            toast({
              title: "Moduł zablokowany",
              description: "Najpierw ukończ poprzednie szkolenie, aby odblokować ten moduł.",
              variant: "destructive"
            });
            navigate('/training');
            return;
          }
        }

        setModule(moduleData);

        const { data: lessonsData, error: lessonsError } = await supabase
          .from('training_lessons')
          .select('*')
          .eq('module_id', moduleId)
          .eq('is_active', true)
          .order('position');

        if (!mounted) return;
        if (lessonsError) throw lessonsError;
        
        const mappedLessons = (lessonsData || []).map(lesson => ({
          ...lesson,
          action_buttons: (Array.isArray(lesson.action_buttons) ? lesson.action_buttons : []) as unknown as LessonActionButton[],
          completion_method: (lesson as any).completion_method || 'auto'
        }));
        setLessons(mappedLessons);

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

          // Auto-create training_assignment if missing
          const { data: existingAssignment } = await supabase
            .from('training_assignments')
            .select('id')
            .eq('user_id', user.id)
            .eq('module_id', moduleId)
            .maybeSingle();
          
          if (!existingAssignment) {
            await supabase.from('training_assignments').insert({
              user_id: user.id,
              module_id: moduleId,
              assigned_by: user.id,
              assigned_at: new Date().toISOString(),
              is_completed: false
            });
          }

          setProgress(progressMap);

          // Find the last lesson with progress
          let targetIndex = 0;
          for (let i = lessonsData.length - 1; i >= 0; i--) {
            const lessonProgress = progressMap[lessonsData[i].id];
            if (lessonProgress && lessonProgress.time_spent_seconds > 0) {
              if (lessonProgress.is_completed && i < lessonsData.length - 1) {
                targetIndex = i + 1;
              } else {
                targetIndex = i;
              }
              break;
            }
          }
          
          setCurrentLessonIndex(targetIndex);
          const lessonId = lessonsData[targetIndex].id;
          const savedPos = progressMap[lessonId]?.video_position_seconds || 0;
          
          setSavedVideoPosition(savedPos);
          setVideoPosition(savedPos);
          videoPositionRef.current = savedPos;
          setTextLessonTime(progressMap[lessonId]?.time_spent_seconds || 0);
          setPositionLoaded(true);
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
    return () => { mounted = false; };
  }, [moduleId, user, toast]);

  // Keep refs in sync
  useEffect(() => { textLessonTimeRef.current = textLessonTime; }, [textLessonTime]);
  useEffect(() => { currentLessonIndexRef.current = currentLessonIndex; }, [currentLessonIndex]);
  useEffect(() => { lessonsRef.current = lessons; }, [lessons]);
  useEffect(() => { progressRef.current = progress; }, [progress]);

  // Timer only for text lessons (no video)
  useEffect(() => {
    const currentLesson = lessons[currentLessonIndex];
    const hasVideo = currentLesson?.media_type === 'video' && currentLesson?.media_url;
    const isLessonCompleted = progress[currentLesson?.id]?.is_completed;
    
    if (hasVideo || isLessonCompleted || isNotesDialogOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTextLessonTime(prev => prev + 1);
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentLessonIndex, lessons, progress, isNotesDialogOpen]);

  // Preconnect to VPS
  useEffect(() => {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://purelife.info.pl';
    preconnect.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect);
    
    const dnsPrefetch = document.createElement('link');
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = 'https://purelife.info.pl';
    document.head.appendChild(dnsPrefetch);
    
    return () => {
      if (preconnect.parentNode) document.head.removeChild(preconnect);
      if (dnsPrefetch.parentNode) document.head.removeChild(dnsPrefetch);
    };
  }, []);

  // Save video position on beforeunload (position only, NOT completion)
  useEffect(() => {
    const handleBeforeUnload = async () => {
      const currentLesson = lessonsRef.current[currentLessonIndexRef.current];
      if (!user || !currentLesson) return;
      if (progressRef.current[currentLesson.id]?.is_completed) return;

      const hasVideo = currentLesson?.media_type === 'video' && currentLesson?.media_url;
      const currentVideoPos = videoPositionRef.current;
      const effectiveTime = hasVideo ? Math.floor(currentVideoPos) : textLessonTimeRef.current;

      // Save position to localStorage for resume
      const backupData = {
        lesson_id: currentLesson.id,
        video_position_seconds: hasVideo ? currentVideoPos : 0,
        time_spent_seconds: effectiveTime,
        is_completed: false, // NEVER auto-complete on unload
        timestamp: Date.now()
      };
      localStorage.setItem(`lesson_progress_${currentLesson.id}`, JSON.stringify(backupData));

      // Try to save position via fetch+keepalive (no completion)
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (token) {
          fetch(
            `https://xzlhssqqbajqhnsmbucf.supabase.co/rest/v1/training_progress?on_conflict=user_id,lesson_id`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify({
                user_id: user.id,
                lesson_id: currentLesson.id,
                time_spent_seconds: effectiveTime,
                video_position_seconds: hasVideo ? currentVideoPos : 0,
                is_completed: false // Position save only
              }),
              keepalive: true
            }
          );
        }
      } catch (e) {
        console.warn('[TrainingModule] beforeunload position save failed');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  // Save position on visibility change (tab hidden)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden || !user) return;
      const currentLesson = lessonsRef.current[currentLessonIndexRef.current];
      if (!currentLesson || progressRef.current[currentLesson.id]?.is_completed) return;

      const hasVideo = currentLesson?.media_type === 'video' && currentLesson?.media_url;
      const effectiveTime = hasVideo ? Math.floor(videoPositionRef.current) : textLessonTimeRef.current;
      
      // Just save position, not completion
      await supabase.from('training_progress').upsert({
        user_id: user.id,
        lesson_id: currentLesson.id,
        time_spent_seconds: effectiveTime,
        video_position_seconds: hasVideo ? videoPositionRef.current : 0,
        is_completed: false
      }, { onConflict: 'user_id,lesson_id' });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // ============================================================
  // EXPLICIT COMPLETION: User clicks "Zalicz lekcję" button
  // ============================================================
  const completeCurrentLesson = useCallback(async () => {
    if (!user || !currentLesson || isCompleting) return;
    if (progressRef.current[currentLesson.id]?.is_completed) return;
    
    setIsCompleting(true);
    
    const hasVideo = currentLesson?.media_type === 'video' && currentLesson?.media_url;
    const effectiveTime = hasVideo ? Math.floor(videoPositionRef.current) : textLessonTime;
    
    try {
      const { error } = await supabase.from('training_progress').upsert({
        user_id: user.id,
        lesson_id: currentLesson.id,
        time_spent_seconds: effectiveTime,
        video_position_seconds: hasVideo ? videoPositionRef.current : 0,
        is_completed: true,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,lesson_id' });

      if (error) throw error;

      // Clear any localStorage backup
      localStorage.removeItem(`lesson_progress_${currentLesson.id}`);

      // Update local state
      setProgress(prev => ({
        ...prev,
        [currentLesson.id]: {
          ...prev[currentLesson.id],
          lesson_id: currentLesson.id,
          time_spent_seconds: effectiveTime,
          video_position_seconds: hasVideo ? videoPositionRef.current : 0,
          is_completed: true,
          started_at: prev[currentLesson.id]?.started_at || new Date().toISOString(),
          completed_at: new Date().toISOString()
        }
      }));

      toast({
        title: "✓ Lekcja zaliczona!",
        description: `Pomyślnie zaliczyłeś lekcję "${currentLesson.title}"`,
      });

      // Check if all lessons are now completed
      const allCompleted = lessons.every(l => 
        l.id === currentLesson.id ? true : progressRef.current[l.id]?.is_completed
      );
      if (allCompleted && lessons.length > 0 && moduleId) {
        await supabase.from('training_assignments').update({
          is_completed: true,
          completed_at: new Date().toISOString()
        }).eq('user_id', user.id).eq('module_id', moduleId).eq('is_completed', false);
        
        toast({
          title: "🎓 Moduł ukończony!",
          description: "Gratulacje! Ukończyłeś szkolenie. Możesz wygenerować certyfikat na stronie Akademii.",
        });
      }
    } catch (error) {
      console.error('[TrainingModule] Failed to complete lesson:', error);
      toast({
        title: "Błąd zapisu",
        description: "Nie udało się zaliczyć lekcji. Spróbuj ponownie.",
        variant: "destructive"
      });
    } finally {
      setIsCompleting(false);
    }
  }, [user, currentLesson, textLessonTime, lessons, moduleId, toast, isCompleting]);

  // Lightweight video time update (no auto-save, just track position)
  const handleVideoTimeUpdate = useCallback((newTime: number) => {
    setVideoPosition(newTime);
    videoPositionRef.current = newTime;
  }, []);

  // Handle video duration change — auto-update DB if needed
  const handleDurationChange = useCallback(async (duration: number) => {
    setVideoDuration(duration);
    videoDurationRef.current = duration;
    
    const currentLesson = lessons[currentLessonIndex];
    if (!currentLesson || currentLesson.media_type !== 'video') return;
    
    const storedDuration = currentLesson.video_duration_seconds || 0;
    const roundedDuration = Math.round(duration);
    
    if (!roundedDuration || roundedDuration <= 0) return;
    
    if (storedDuration === 0 || Math.abs(storedDuration - roundedDuration) > 5) {
      try {
        const { error } = await supabase
          .from('training_lessons')
          .update({ video_duration_seconds: roundedDuration })
          .eq('id', currentLesson.id);
          
        if (!error) {
          setLessons(prev => prev.map(lesson => 
            lesson.id === currentLesson.id 
              ? { ...lesson, video_duration_seconds: roundedDuration }
              : lesson
          ));
        }
      } catch (error) {
        console.error('[TrainingModule] Failed to update duration:', error);
      }
    }
  }, [lessons, currentLessonIndex]);

  const handlePlayStateChange = useCallback((_playing: boolean) => {
    // No auto-save on pause — completion is explicit via button
  }, []);

  // Navigation: free navigation, no locks
  const jumpToLesson = useCallback(async (index: number) => {
    if (isNavigating || index === currentLessonIndex) return;
    setIsNavigating(true);
    
    try {
      const targetLessonId = lessons[index].id;
      const targetProgress = progress[targetLessonId];
      const targetVideoPosition = targetProgress?.video_position_seconds || 0;
      const targetTimeSpent = targetProgress?.time_spent_seconds || 0;
      
      setCurrentLessonIndex(index);
      setVideoPosition(targetVideoPosition);
      setSavedVideoPosition(targetVideoPosition);
      setTextLessonTime(targetTimeSpent);
      videoPositionRef.current = targetVideoPosition;
    } finally {
      setIsNavigating(false);
    }
  }, [isNavigating, currentLessonIndex, lessons, progress]);

  const goToNextLesson = useCallback(async () => {
    if (isNavigating) return;
    
    // Must complete current lesson before going to next
    const isCurrentCompleted = progress[currentLesson?.id]?.is_completed;
    if (!isCurrentCompleted) {
      toast({
        title: "Zalicz lekcję",
        description: "Kliknij przycisk \"Zalicz lekcję\" aby przejść dalej.",
        variant: "destructive"
      });
      return;
    }
    
    if (currentLessonIndex < lessons.length - 1) {
      jumpToLesson(currentLessonIndex + 1);
    } else {
      // Last lesson completed — navigate back
      toast({
        title: "🎓 Moduł ukończony!",
        description: "Gratulacje! Ukończyłeś wszystkie lekcje w tym module.",
      });
      navigate('/training');
    }
  }, [isNavigating, progress, currentLesson?.id, currentLessonIndex, lessons.length, jumpToLesson, navigate, toast]);

  const goToPreviousLesson = useCallback(async () => {
    if (isNavigating || currentLessonIndex === 0) return;
    jumpToLesson(currentLessonIndex - 1);
  }, [isNavigating, currentLessonIndex, jumpToLesson]);

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Volume2 className="h-4 w-4" />;
      case 'document': return <File className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const ActionButton = ({ button }: { button: LessonActionButton }) => {
    const handleClick = async () => {
      let targetUrl = button.url || '';
      
      if (button.type === 'resource' && button.resource_id) {
        const { data } = await supabase
          .from('knowledge_resources')
          .select('source_url')
          .eq('id', button.resource_id)
          .single();
        if (data?.source_url) targetUrl = data.source_url;
      }
      
      if (button.type === 'file' && button.file_url) {
        try {
          let downloadUrl = button.file_url;
          if (!downloadUrl.startsWith('http')) {
            const { data } = await supabase.storage
              .from('training-media')
              .createSignedUrl(downloadUrl, 3600);
            if (!data?.signedUrl) return;
            downloadUrl = data.signedUrl;
          }
          const response = await fetch(downloadUrl);
          if (!response.ok) throw new Error('Fetch failed');
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = button.file_name || 'file';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (error) {
          console.error('Download error:', error);
          const link = document.createElement('a');
          link.href = button.file_url;
          link.download = button.file_name || 'file';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        return;
      }
      
      if (targetUrl) {
        if (button.open_in_new_tab) {
          window.open(targetUrl, '_blank');
        } else {
          window.location.href = targetUrl;
        }
      }
    };

    const getIcon = () => {
      switch (button.type) {
        case 'file': return <Download className="h-4 w-4 mr-2" />;
        case 'external': return <ExternalLink className="h-4 w-4 mr-2" />;
        case 'internal': return <Link className="h-4 w-4 mr-2" />;
        case 'resource': return <FileText className="h-4 w-4 mr-2" />;
        default: return null;
      }
    };

    return (
      <Button variant="outline" onClick={handleClick}>
        {getIcon()}
        {button.label}
      </Button>
    );
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/training')} className="flex items-center gap-2">
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

  const currentProgress = progress[currentLesson?.id];
  const isLessonCompleted = currentProgress?.is_completed || false;
  
  const hasVideo = currentLesson?.media_type === 'video' && currentLesson?.media_url;
  const effectiveTimeSpent = hasVideo ? Math.floor(videoPosition) : textLessonTime;
  
  // Determine required time
  const getRequiredTime = () => {
    if (currentLesson?.video_duration_seconds && currentLesson.video_duration_seconds > 0) {
      return currentLesson.video_duration_seconds;
    }
    if (hasVideo && videoDuration > 0) {
      return Math.floor(videoDuration);
    }
    return currentLesson?.min_time_seconds || 0;
  };
  const requiredTime = getRequiredTime();
  
  // Completion button eligibility
  const completionMethod = currentLesson?.completion_method || 'auto';
  const canComplete = (() => {
    if (isLessonCompleted) return false;
    if (completionMethod === 'manual') return true; // Always active for manual
    if (requiredTime === 0) return true; // No time requirement
    // For video: 80% threshold; for text: 100% of min_time
    const threshold = hasVideo ? VIDEO_COMPLETION_THRESHOLD : 1.0;
    return effectiveTimeSpent >= requiredTime * threshold;
  })();
  
  const progressPercentage = requiredTime > 0
    ? Math.min(100, (effectiveTimeSpent / requiredTime) * 100)
    : 100;

  // Sidebar lesson item renderer
  const LessonSidebarItem = ({ lesson, index }: { lesson: TrainingLesson; index: number }) => {
    const lessonProgress = progress[lesson.id];
    const isCompleted = lessonProgress?.is_completed;
    const isCurrent = index === currentLessonIndex;
    const hasAnyProgress = lessonProgress && (
      lessonProgress.time_spent_seconds > 0 || 
      (lessonProgress.video_position_seconds && lessonProgress.video_position_seconds > 0)
    );

    return (
      <button
        key={lesson.id}
        onClick={() => jumpToLesson(index)}
        className={`w-full text-left p-3 rounded-lg border transition-colors ${
          isCurrent 
            ? 'border-yellow-500 bg-yellow-500/10' 
            : isCompleted
            ? 'border-green-500 bg-green-500/5'
            : 'border-border hover:border-yellow-500/50'
        }`}
      >
        <div className="flex items-center gap-2 mb-1 min-w-0 overflow-hidden">
          {isCompleted ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
          ) : hasAnyProgress ? (
            <CircleDot className="h-4 w-4 flex-shrink-0 text-yellow-500" />
          ) : (
            <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
          <span className="text-sm font-medium truncate max-w-[calc(100%-24px)]">
            {lesson.title}
          </span>
        </div>
        {(lesson.video_duration_seconds || lesson.min_time_seconds) > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {lesson.video_duration_seconds && lesson.video_duration_seconds > 0 
                ? formatTime(lesson.video_duration_seconds)
                : `min. ${formatTime(lesson.min_time_seconds)}`}
            </span>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-[env(safe-area-inset-top)] z-50">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex flex-wrap items-center gap-2 sm:gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/training')}
            className="flex items-center gap-2 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Powrót do szkoleń</span>
          </Button>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-semibold truncate">{displayModule?.title || module.title}</h1>
            {(displayModule?.description || module.description) && (
              <p className="text-sm text-muted-foreground truncate">{displayModule?.description || module.description}</p>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="grid lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Mobile: Collapsible lesson list */}
          <div className="lg:col-span-1 lg:hidden">
            <Card>
              <Collapsible defaultOpen={true}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Lekcje ({currentLessonIndex + 1}/{lessons.length})</CardTitle>
                      <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-2 pt-0">
                    {displayLessons.map((lesson, index) => (
                      <LessonSidebarItem key={lesson.id} lesson={lesson} index={index} />
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>

          {/* Desktop: Regular lesson list */}
          <div className="hidden lg:block lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lekcje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {displayLessons.map((lesson, index) => (
                  <LessonSidebarItem key={lesson.id} lesson={lesson} index={index} />
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="break-words line-clamp-2 text-lg sm:text-xl lg:text-2xl flex-1 min-w-0 overflow-hidden" style={{ wordBreak: 'break-word' }}>
                    {displayLessons[currentLessonIndex]?.title || currentLesson.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {hasVideo && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsNotesDialogOpen(true)}
                        className="flex items-center gap-1.5"
                      >
                        <StickyNote className="h-4 w-4" />
                        <span className="hidden sm:inline">Notatki</span>
                        {notes.length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                            {notes.length}
                          </Badge>
                        )}
                      </Button>
                    )}
                    <Badge variant={isLessonCompleted ? "default" : "secondary"} className="whitespace-nowrap">
                      {isLessonCompleted ? "✓ Zaliczone" : "W trakcie"}
                    </Badge>
                  </div>
                </div>
                
                {!isLessonCompleted && completionMethod === 'auto' && requiredTime > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Postęp</span>
                      <span>
                        {formatTime(effectiveTimeSpent)} / {formatTime(requiredTime)}
                        {hasVideo && <span className="text-muted-foreground ml-1">(wymagane 80%)</span>}
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                {currentLesson.media_url && (
                  <div className="border rounded-lg overflow-hidden">
                    <SecureMedia 
                      key={currentLesson.id}
                      mediaUrl={currentLesson.media_url}
                      mediaType={currentLesson.media_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
                      altText={currentLesson.media_alt_text}
                      disableInteraction={!isLessonCompleted}
                      onPlayStateChange={handlePlayStateChange}
                      onTimeUpdate={handleVideoTimeUpdate}
                      onDurationChange={handleDurationChange}
                      initialTime={positionLoaded ? (progress[currentLesson?.id]?.video_position_seconds || 0) : 0}
                      className="w-full max-h-[45vh] sm:max-h-[60vh] lg:max-h-[70vh] object-contain"
                      noteMarkers={noteMarkers}
                      onNoteMarkerClick={handleNoteMarkerClick}
                      seekToTimeRef={seekToTimeRef}
                      pauseRequested={isNotesDialogOpen}
                    />
                    {isLessonCompleted && currentLesson.media_type === 'video' && (
                      <div className="bg-green-50 dark:bg-green-950/30 border-t border-green-200 dark:border-green-800 px-4 py-2 text-sm text-green-700 dark:text-green-300">
                        ✓ Lekcja zaliczona — możesz obejrzeć ponownie z pełnymi kontrolkami
                      </div>
                    )}
                  </div>
                )}

                {/* Notes Dialog */}
                <LessonNotesDialog
                  open={isNotesDialogOpen}
                  onOpenChange={setIsNotesDialogOpen}
                  lessonTitle={displayLessons[currentLessonIndex]?.title || currentLesson.title}
                  currentVideoTime={videoPosition}
                  isLessonCompleted={isLessonCompleted}
                  notes={notes}
                  onAddNote={addNote}
                  onUpdateNote={updateNote}
                  onDeleteNote={deleteNote}
                  onExportNotes={exportNotes}
                  onSeekToTime={handleSeekToTime}
                />

                {(displayLessons[currentLessonIndex]?.content || currentLesson.content) && (
                  <div className="prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: displayLessons[currentLessonIndex]?.content || currentLesson.content }} />
                  </div>
                )}

                {currentLesson.action_buttons && currentLesson.action_buttons.length > 0 && (
                  <div className="flex flex-wrap gap-2 py-4">
                    {currentLesson.action_buttons.map((btn) => (
                      <ActionButton key={btn.id} button={btn} />
                    ))}
                  </div>
                )}

                {/* ========== COMPLETION BUTTON ========== */}
                {isLessonCompleted ? (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">Lekcja zaliczona</p>
                      <p className="text-sm text-green-600 dark:text-green-400">Możesz przejść do następnej lekcji lub przeglądać tę ponownie.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={completeCurrentLesson}
                      disabled={!canComplete || isCompleting}
                      size="lg"
                      className="w-full h-14 text-base font-semibold rounded-xl bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isCompleting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Zapisywanie...
                        </div>
                      ) : canComplete ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Zalicz lekcję
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Zalicz lekcję
                        </div>
                      )}
                    </Button>
                    {!canComplete && completionMethod === 'auto' && requiredTime > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          {hasVideo 
                            ? `Obejrzyj co najmniej 80% wideo (${formatTime(Math.ceil(requiredTime * VIDEO_COMPLETION_THRESHOLD))}), aby odblokować przycisk.`
                            : `Spędź co najmniej ${formatTime(requiredTime)} na tej lekcji, aby odblokować przycisk.`
                          }
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Pozostało: {formatTime(Math.max(0, Math.ceil(requiredTime * (hasVideo ? VIDEO_COMPLETION_THRESHOLD : 1)) - effectiveTimeSpent))}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                <div className="flex flex-wrap justify-between items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={goToPreviousLesson}
                    disabled={currentLessonIndex === 0 || isNavigating}
                    className="min-h-[44px]"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Poprzednia
                  </Button>

                  <div className="text-sm text-muted-foreground order-last sm:order-none w-full sm:w-auto text-center">
                    {currentLessonIndex + 1} z {lessons.length}
                  </div>

                  <Button
                    onClick={goToNextLesson}
                    disabled={isNavigating || !isLessonCompleted}
                    className="min-h-[44px]"
                  >
                    {currentLessonIndex === lessons.length - 1 ? "Zakończ" : "Następna"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingModule;
