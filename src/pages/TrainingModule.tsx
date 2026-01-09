import { useState, useEffect, useRef, useCallback } from "react";
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
  Clock,
  FileText,
  Video,
  Volume2,
  File,
  ExternalLink,
  Link,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SecureMedia } from "@/components/SecureMedia";
import { LessonActionButton } from "@/types/training";

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

const TrainingModule = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [isNavigating, setIsNavigating] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Video position = time spent (single source of truth for video lessons)
  const [videoPosition, setVideoPosition] = useState(0);
  const [savedVideoPosition, setSavedVideoPosition] = useState(0);
  const [positionLoaded, setPositionLoaded] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoDurationRef = useRef<number>(0);
  
  // Text lesson timer (only for lessons without video)
  const [textLessonTime, setTextLessonTime] = useState(0);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout>();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const videoPositionRef = useRef<number>(0);
  const hasInitialSaveRef = useRef<boolean>(false);
  
  // Refs to prevent race conditions during lesson transitions
  const currentLessonIdRef = useRef<string | null>(null);
  const isTransitioningRef = useRef<boolean>(false);

  // Load module, lessons and progress
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!moduleId) return;
      
      try {
        const { data: moduleData, error: moduleError } = await supabase
          .from('training_modules')
          .select('*')
          .eq('id', moduleId)
          .single();

        if (!mounted) return;
        if (moduleError) throw moduleError;
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
          action_buttons: (Array.isArray(lesson.action_buttons) ? lesson.action_buttons : []) as unknown as LessonActionButton[]
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

          setProgress(progressMap);

          // Find the last lesson with progress (most advanced lesson user worked on)
          let targetIndex = 0;
          for (let i = lessonsData.length - 1; i >= 0; i--) {
            const lessonProgress = progressMap[lessonsData[i].id];
            if (lessonProgress && lessonProgress.time_spent_seconds > 0) {
              // If this lesson is completed, move to next (if exists)
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
          
          // Check localStorage backup (might be newer than DB data)
          let savedPos = progressMap[lessonId]?.video_position_seconds || 0;
          const dbUpdatedAt = progressMap[lessonId]?.updated_at 
            ? new Date(progressMap[lessonId].updated_at as unknown as string).getTime() 
            : 0;
          const backupKey = `lesson_progress_${lessonId}`;
          const backupStr = localStorage.getItem(backupKey);
          
          if (backupStr) {
            try {
              const backup = JSON.parse(backupStr);
              // Use backup if it's newer than DB and not older than 24h
              if (backup.timestamp > dbUpdatedAt && Date.now() - backup.timestamp < 86400000) {
                savedPos = backup.video_position_seconds || 0;
                
                // Sync backup to database
                if (user) {
                  supabase.from('training_progress').upsert({
                    user_id: user.id,
                    lesson_id: lessonId,
                    time_spent_seconds: backup.time_spent_seconds || 0,
                    video_position_seconds: backup.video_position_seconds || 0,
                    is_completed: backup.is_completed || false
                  }, {
                    onConflict: 'user_id,lesson_id'
                  }).then(() => {
                    localStorage.removeItem(backupKey);
                  });
                }
              } else {
                localStorage.removeItem(backupKey);
              }
            } catch (e) {
              localStorage.removeItem(backupKey);
            }
          }
          
          setSavedVideoPosition(savedPos);
          setVideoPosition(savedPos);
          videoPositionRef.current = savedPos;
          setTextLessonTime(progressMap[lessonId]?.time_spent_seconds || 0);
          
          // Mark position as loaded so SecureMedia receives correct initialTime
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

    return () => {
      mounted = false;
    };
  }, [moduleId, user, toast]);

  // Update currentLessonIdRef when lesson changes
  useEffect(() => {
    const currentLesson = lessons[currentLessonIndex];
    currentLessonIdRef.current = currentLesson?.id || null;
  }, [lessons, currentLessonIndex]);

  // NOTE: Removed the useEffect that updated savedVideoPosition when lesson changes.
  // This was causing issues because it ran whenever currentLessonIndex changed,
  // but the lesson navigation functions (goToNextLesson, goToPreviousLesson, jumpToLesson)
  // already handle setting the correct video position directly.
  // Having this useEffect caused race conditions where the old lesson's state
  // could overwrite the new lesson's state.

  // Timer only for text lessons (no video)
  useEffect(() => {
    const currentLesson = lessons[currentLessonIndex];
    const hasVideo = currentLesson?.media_type === 'video' && currentLesson?.media_url;
    const isLessonCompleted = progress[currentLesson?.id]?.is_completed;
    
    // Only run timer for non-video lessons that are not completed
    if (hasVideo || isLessonCompleted) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTextLessonTime(prev => prev + 1);
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentLessonIndex, lessons, progress]);

  // Save progress before unload with localStorage backup and proper auth
  useEffect(() => {
    const handleBeforeUnload = async () => {
      const currentLesson = lessons[currentLessonIndex];
      if (!user || !currentLesson) return;

    const hasVideo = currentLesson?.media_type === 'video' && currentLesson?.media_url;
    const currentVideoPos = videoPositionRef.current;
    const currentVideoDuration = videoDurationRef.current;
    const effectiveTime = hasVideo ? Math.floor(currentVideoPos) : textLessonTime;
    // For video lessons, use video duration; for text lessons, use min_time_seconds
    const requiredTime = hasVideo && currentVideoDuration > 0 
      ? Math.floor(currentVideoDuration) 
      : (currentLesson.min_time_seconds || 0);
    const isCompleted = effectiveTime >= requiredTime;

      // 1. Always save to localStorage as backup
      const backupData = {
        lesson_id: currentLesson.id,
        video_position_seconds: hasVideo ? currentVideoPos : 0,
        time_spent_seconds: effectiveTime,
        is_completed: isCompleted,
        timestamp: Date.now()
      };
      localStorage.setItem(`lesson_progress_${currentLesson.id}`, JSON.stringify(backupData));

      // 2. Try to save via fetch with keepalive (proper auth headers)
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        
        if (token) {
          const payload = {
            user_id: user.id,
            lesson_id: currentLesson.id,
            time_spent_seconds: effectiveTime,
            video_position_seconds: hasVideo ? currentVideoPos : 0,
            is_completed: isCompleted
          };

          fetch(
            `https://xzlhssqqbajqhnsmbucf.supabase.co/rest/v1/training_progress?on_conflict=user_id,lesson_id`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify(payload),
              keepalive: true
            }
          );
        }
      } catch (e) {
        console.warn('[TrainingModule] beforeunload save failed, backup in localStorage');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, lessons, currentLessonIndex, textLessonTime]);

  // Ref to hold latest saveProgressWithPosition function (for stable callbacks)
  const saveProgressRef = useRef<() => Promise<void>>();
  const progressRef = useRef<Record<string, LessonProgress>>({});
  
  // Keep progressRef in sync
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const saveProgressWithPosition = useCallback(async () => {
    if (!user || lessons.length === 0) return;

    const currentLesson = lessons[currentLessonIndex];
    if (!currentLesson) return;
    
    // Prevent saving during lesson transition (race condition prevention)
    if (isTransitioningRef.current) {
      console.log('[TrainingModule] Skipping save during transition');
      return;
    }
    
    // Check if lesson changed (race condition prevention)
    if (currentLessonIdRef.current !== currentLesson.id) {
      console.log('[TrainingModule] Lesson changed, skipping save for old lesson');
      return;
    }

    // Check if was already completed using ref (avoid stale state)
    const wasAlreadyCompleted = progressRef.current[currentLesson.id]?.is_completed;
    
    // KLUCZOWA ZMIANA: Nie zapisuj postępu dla ukończonych lekcji (tryb przeglądania)
    // Użytkownik może swobodnie przewijać bez wpływu na status ukończenia
    if (wasAlreadyCompleted) {
      console.log('[TrainingModule] Skipping save for completed lesson (review mode)');
      return;
    }

    const hasVideo = currentLesson?.media_type === 'video' && currentLesson?.media_url;
    // Use ref for accurate position (state might be stale in callbacks)
    const currentVideoPos = videoPositionRef.current;
    const currentVideoDuration = videoDurationRef.current;
    const effectiveTime = hasVideo ? Math.floor(currentVideoPos) : textLessonTime;
    // For video lessons, use video duration; for text lessons, use min_time_seconds
    const requiredTime = hasVideo && currentVideoDuration > 0 
      ? Math.floor(currentVideoDuration) 
      : (currentLesson.min_time_seconds || 0);
    const isCompleted = effectiveTime >= requiredTime;

    try {
      const { error } = await supabase
        .from('training_progress')
        .upsert({
          user_id: user.id,
          lesson_id: currentLesson.id,
          time_spent_seconds: effectiveTime,
          video_position_seconds: hasVideo ? currentVideoPos : 0,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        }, { 
          onConflict: 'user_id,lesson_id'
        });

      if (error) throw error;

      setProgress(prev => ({
        ...prev,
        [currentLesson.id]: {
          ...prev[currentLesson.id],
          lesson_id: currentLesson.id,
          time_spent_seconds: effectiveTime,
          video_position_seconds: hasVideo ? currentVideoPos : 0,
          is_completed: isCompleted,
          started_at: prev[currentLesson.id]?.started_at || new Date().toISOString(),
          completed_at: isCompleted ? new Date().toISOString() : null
        }
      }));

      // Show toast when lesson is completed
      if (isCompleted) {
        toast({
          title: "Lekcja ukończona!",
          description: `Pomyślnie ukończyłeś lekcję "${currentLesson.title}"`,
        });
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [user, lessons, currentLessonIndex, textLessonTime, toast]);
  
  // Update saveProgressRef whenever saveProgressWithPosition changes
  useEffect(() => {
    saveProgressRef.current = saveProgressWithPosition;
  }, [saveProgressWithPosition]);

  // Stable callback for video time updates (uses refs to avoid dependency cycles)
  const handleVideoTimeUpdate = useCallback((newTime: number) => {
    setVideoPosition(newTime);
    videoPositionRef.current = newTime; // Always keep ref in sync
    
    // Save immediately after first 3 seconds (initial save)
    if (newTime > 3 && !hasInitialSaveRef.current) {
      hasInitialSaveRef.current = true;
      saveProgressRef.current?.();
      return;
    }
    
    // Debounce save - save every 5 seconds
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveProgressRef.current?.();
    }, 5000);
  }, []); // Empty deps - uses refs for stability

  // Handle video duration change from SecureMedia
  const handleDurationChange = useCallback((duration: number) => {
    setVideoDuration(duration);
    videoDurationRef.current = duration;
  }, []);

  // Stable callback for play state changes (uses refs to avoid dependency cycles)
  const handlePlayStateChange = useCallback((playing: boolean) => {
    // Save immediately when pausing
    if (!playing) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveProgressRef.current?.();
    }
  }, []); // Empty deps - uses refs for stability

  // Visibility API - save progress when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveProgressWithPosition();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [saveProgressWithPosition]);

  // Cleanup on unmount - clear timeouts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = undefined;
      }
    };
  }, []);

  // Save to localStorage on unmount (separate effect to capture latest values)
  useEffect(() => {
    const currentLesson = lessons[currentLessonIndex];
    const lessonId = currentLesson?.id;
    
    return () => {
      if (lessonId && user) {
        const hasVideo = currentLesson?.media_type === 'video' && currentLesson?.media_url;
        const currentVideoDuration = videoDurationRef.current;
        const effectiveTime = hasVideo ? Math.floor(videoPositionRef.current) : textLessonTime;
        
        // Don't save if position is 0 - prevents overwriting with zero during transitions
        if (hasVideo && videoPositionRef.current <= 0) return;
        if (!hasVideo && effectiveTime <= 0) return;
        
        const requiredTime = hasVideo && currentVideoDuration > 0 
          ? Math.floor(currentVideoDuration) 
          : (currentLesson?.min_time_seconds || 0);
        const isCompleted = effectiveTime >= requiredTime;
        
        const backupData = {
          lesson_id: lessonId,
          video_position_seconds: hasVideo ? videoPositionRef.current : 0,
          time_spent_seconds: effectiveTime,
          is_completed: isCompleted,
          timestamp: Date.now()
        };
        localStorage.setItem(`lesson_progress_${lessonId}`, JSON.stringify(backupData));
      }
    };
  }, [lessons, currentLessonIndex, user, textLessonTime]);

  const goToNextLesson = async () => {
    if (isNavigating) return;
    setIsNavigating(true);
    isTransitioningRef.current = true; // Block saves during transition
    
    // Cancel pending save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    
    try {
      const currentLesson = lessons[currentLessonIndex];
      const hasVideo = currentLesson?.media_type === 'video' && currentLesson?.media_url;
      
      // ALWAYS mark current lesson as completed when navigating to next
      if (user && currentLesson) {
        const effectiveTime = hasVideo ? Math.floor(videoPositionRef.current) : textLessonTime;
        
        await supabase
          .from('training_progress')
          .upsert({
            user_id: user.id,
            lesson_id: currentLesson.id,
            time_spent_seconds: effectiveTime,
            video_position_seconds: hasVideo ? videoPositionRef.current : 0,
            is_completed: true,  // Always mark as completed when moving to next
            completed_at: new Date().toISOString()
          }, { 
            onConflict: 'user_id,lesson_id'
          });
        
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
      }
      
      if (currentLessonIndex < lessons.length - 1) {
        const nextIndex = currentLessonIndex + 1;
        const nextLessonId = lessons[nextIndex].id;
        const nextProgress = progress[nextLessonId];
        const nextVideoPosition = nextProgress?.video_position_seconds || 0;
        const nextTimeSpent = nextProgress?.time_spent_seconds || 0;
        
        setCurrentLessonIndex(nextIndex);
        setVideoPosition(nextVideoPosition);
        setSavedVideoPosition(nextVideoPosition);
        setTextLessonTime(nextTimeSpent);
        hasInitialSaveRef.current = false;
        videoPositionRef.current = nextVideoPosition;
      } else {
        // Last lesson - check if all completed
        const allPreviousCompleted = lessons.slice(0, -1).every(lesson => {
          return progress[lesson.id]?.is_completed === true;
        });
        
        // Current lesson is now completed (we just marked it above)
        const allCompleted = allPreviousCompleted;

        if (allCompleted && user && moduleId) {
          try {
            const { error: assignmentError } = await supabase
              .from('training_assignments')
              .update({
                is_completed: true,
                completed_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .eq('module_id', moduleId);

            if (assignmentError) {
              console.warn('Training assignment update failed:', assignmentError);
            }

            toast({
              title: "Moduł ukończony!",
              description: "Gratulacje! Ukończyłeś szkolenie. Możesz teraz wygenerować certyfikat na stronie Akademii.",
            });
          } catch (error) {
            console.error('Error updating training assignment:', error);
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
    } finally {
      setIsNavigating(false);
      // Delay resetting transition flag to allow state to stabilize
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 100);
    }
  };

  const goToPreviousLesson = async () => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    // Cancel pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    
    try {
      // FIRST save progress of current lesson BEFORE setting transition flag
      await saveProgressWithPosition();
      
      // THEN block subsequent saves during transition
      isTransitioningRef.current = true;
      
      if (currentLessonIndex > 0) {
        const prevIndex = currentLessonIndex - 1;
        const prevLessonId = lessons[prevIndex].id;
        const prevProgress = progress[prevLessonId];
        const prevVideoPosition = prevProgress?.video_position_seconds || 0;
        const prevTimeSpent = prevProgress?.time_spent_seconds || 0;
        
        setCurrentLessonIndex(prevIndex);
        setVideoPosition(prevVideoPosition);
        setSavedVideoPosition(prevVideoPosition);
        setTextLessonTime(prevTimeSpent);
        hasInitialSaveRef.current = false;
        videoPositionRef.current = prevVideoPosition;
      }
    } finally {
      setIsNavigating(false);
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 100);
    }
  };

  const jumpToLesson = async (index: number) => {
    if (isNavigating) return;
    
    if (index > 0) {
      const previousLesson = lessons[index - 1];
      const targetLessonProgress = progress[lessons[index]?.id];
      const hasProgressInTargetLesson = targetLessonProgress && (
        targetLessonProgress.time_spent_seconds > 0 || 
        (targetLessonProgress.video_position_seconds && targetLessonProgress.video_position_seconds > 0)
      );
      
      // Block only if previous lesson is NOT completed AND user has NO progress in target lesson
      if (previousLesson && !progress[previousLesson.id]?.is_completed && !hasProgressInTargetLesson) {
        toast({
          title: "Dostęp zablokowany",
          description: "Musisz ukończyć poprzednią lekcję, aby przejść dalej.",
          variant: "destructive"
        });
        return;
      }
    }

    setIsNavigating(true);
    
    // Cancel pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    
    try {
      // FIRST save progress of current lesson BEFORE setting transition flag
      await saveProgressWithPosition();
      
      // THEN block subsequent saves during transition
      isTransitioningRef.current = true;
      
      const targetLessonId = lessons[index].id;
      const targetProgress = progress[targetLessonId];
      const targetVideoPosition = targetProgress?.video_position_seconds || 0;
      const targetTimeSpent = targetProgress?.time_spent_seconds || 0;
      
      setCurrentLessonIndex(index);
      setVideoPosition(targetVideoPosition);
      setSavedVideoPosition(targetVideoPosition);
      setTextLessonTime(targetTimeSpent);
      hasInitialSaveRef.current = false;
      videoPositionRef.current = targetVideoPosition;
    } finally {
      setIsNavigating(false);
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 100);
    }
  };

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
        const { data } = await supabase.storage
          .from('training-media')
          .createSignedUrl(button.file_url, 3600);
        if (data?.signedUrl) {
          const link = document.createElement('a');
          link.href = data.signedUrl;
          link.download = button.file_name || 'file';
          link.click();
          return;
        }
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
  
  // Determine effective time based on lesson type
  const hasVideo = currentLesson?.media_type === 'video' && currentLesson?.media_url;
  const effectiveTimeSpent = hasVideo ? Math.floor(videoPosition) : textLessonTime;
  // Use video_duration_seconds from DB if available, otherwise fallback to live videoDuration or min_time_seconds
  const requiredTime = currentLesson?.video_duration_seconds 
    || (hasVideo && videoDuration > 0 ? Math.floor(videoDuration) : 0)
    || (currentLesson?.min_time_seconds || 0);
  const canProceed = effectiveTimeSpent >= requiredTime;
  
  const progressPercentage = requiredTime > 0
    ? Math.min(100, (effectiveTimeSpent / requiredTime) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-background">
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
        <div className="grid lg:grid-cols-4 gap-6">
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
                  const hasProgressInLesson = lessonProgress && (
                    lessonProgress.time_spent_seconds > 0 || 
                    (lessonProgress.video_position_seconds && lessonProgress.video_position_seconds > 0)
                  );
                  const isLocked = index > 0 && 
                    !progress[lessons[index - 1].id]?.is_completed && 
                    !hasProgressInLesson;

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
                      {(lesson.video_duration_seconds || lesson.min_time_seconds) > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(lesson.video_duration_seconds || lesson.min_time_seconds)}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{currentLesson.title}</CardTitle>
                  <Badge variant={isLessonCompleted ? "default" : "secondary"}>
                    {isLessonCompleted ? "Ukończone" : "W trakcie"}
                  </Badge>
                </div>
                
                {(currentLesson.min_time_seconds > 0 || hasVideo) && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Postęp</span>
                      <span>
                        {formatTime(effectiveTimeSpent)} / {formatTime(requiredTime)}
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
                      className="w-full max-h-96 object-contain"
                    />
                    {isLessonCompleted && currentLesson.media_type === 'video' && (
                      <div className="bg-green-50 dark:bg-green-950/30 border-t border-green-200 dark:border-green-800 px-4 py-2 text-sm text-green-700 dark:text-green-300">
                        ✓ Lekcja ukończona - możesz obejrzeć ponownie z pełnymi kontrolkami
                      </div>
                    )}
                  </div>
                )}

                {currentLesson.content && (
                  <div className="prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: currentLesson.content }} />
                  </div>
                )}

                {currentLesson.action_buttons && currentLesson.action_buttons.length > 0 && (
                  <div className="flex flex-wrap gap-2 py-4">
                    {currentLesson.action_buttons.map((btn) => (
                      <ActionButton key={btn.id} button={btn} />
                    ))}
                  </div>
                )}

                <Separator />

                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={goToPreviousLesson}
                    disabled={currentLessonIndex === 0 || isNavigating}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Poprzednia
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    {currentLessonIndex + 1} z {lessons.length}
                  </div>

                  <Button
                    onClick={goToNextLesson}
                    disabled={isNavigating || (!canProceed && requiredTime > 0 && !isLessonCompleted)}
                  >
                    {currentLessonIndex === lessons.length - 1 ? "Zakończ" : "Następna"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                {!canProceed && requiredTime > 0 && !isLessonCompleted && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Musisz spędzić co najmniej {formatTime(requiredTime)} na tej lekcji, 
                      aby przejść do następnej.
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Pozostało: {formatTime(Math.max(0, requiredTime - effectiveTimeSpent))}
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
