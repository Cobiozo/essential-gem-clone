import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SecureMedia } from '@/components/SecureMedia';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Eye, Loader2, Heart, RotateCcw } from 'lucide-react';
import { HealthyKnowledge, CONTENT_TYPE_LABELS } from '@/types/healthyKnowledge';

const HealthyKnowledgePlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [material, setMaterial] = useState<HealthyKnowledge | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedPosition, setSavedPosition] = useState(0);
  
  const currentTimeRef = useRef(0);
  const hasIncrementedViewRef = useRef(false);

  // Load material and saved progress
  useEffect(() => {
    if (!id) return;
    
    const fetchMaterial = async () => {
      try {
        const { data, error } = await supabase
          .from('healthy_knowledge')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        setMaterial(data as HealthyKnowledge);
        
        // Load saved progress
        const saved = localStorage.getItem(`hk_progress_${id}`);
        if (saved) {
          try {
            const progress = JSON.parse(saved);
            // Check if not older than 7 days and position > 5 seconds
            if (Date.now() - progress.updatedAt < 7 * 24 * 60 * 60 * 1000 && progress.position > 5) {
              setSavedPosition(progress.position);
              setInitialTime(progress.position); // Set initial time immediately for video preview
              setShowResumePrompt(true);
            }
          } catch (e) {
            console.error('Error parsing saved progress:', e);
          }
        }
        
        // Increment view count once
        if (!hasIncrementedViewRef.current) {
          hasIncrementedViewRef.current = true;
          await supabase
            .from('healthy_knowledge')
            .update({ view_count: (data as HealthyKnowledge).view_count + 1 })
            .eq('id', id);
        }
      } catch (error) {
        console.error('Error fetching material:', error);
        toast.error('Nie udało się pobrać materiału');
        navigate('/zdrowa-wiedza');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMaterial();
  }, [id, navigate]);

  // Save progress to localStorage
  const saveProgress = useCallback((position: number) => {
    if (!id || position <= 0) return;
    localStorage.setItem(`hk_progress_${id}`, JSON.stringify({
      position,
      updatedAt: Date.now()
    }));
  }, [id]);

  // Update ref when time changes
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Save on visibility change (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [saveProgress]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveProgress]);

  // Periodic save every 5 seconds during playback
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      if (currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPlaying, saveProgress]);

  // Handle time update from SecureMedia
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Handle play state change
  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  // Resume from saved position (initialTime already set)
  const handleResume = () => {
    setShowResumePrompt(false);
  };

  // Start from beginning
  const handleStartOver = () => {
    setInitialTime(0); // Reset to beginning
    setShowResumePrompt(false);
    // Clear saved progress
    if (id) {
      localStorage.removeItem(`hk_progress_${id}`);
    }
  };

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auth check
  if (!user) {
    navigate('/auth');
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout title="Zdrowa Wiedza">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!material) {
    return (
      <DashboardLayout title="Zdrowa Wiedza">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Materiał nie został znaleziony</p>
          <Button onClick={() => navigate('/zdrowa-wiedza')} className="mt-4">
            Wróć do listy
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Zdrowa Wiedza">
      <div className="space-y-4 max-w-5xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Save progress before leaving
            if (currentTimeRef.current > 0) {
              saveProgress(currentTimeRef.current);
            }
            navigate('/zdrowa-wiedza');
          }}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Powrót do listy
        </Button>

        {/* Title */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">{material.title}</h1>
            {material.description && (
              <p className="text-muted-foreground text-sm mt-1">{material.description}</p>
            )}
          </div>
        </div>

        {/* Video Player - always visible */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 relative">
            <SecureMedia
              mediaUrl={material.media_url!}
              mediaType={material.content_type as 'video' | 'audio'}
              className="w-full aspect-video"
              onTimeUpdate={handleTimeUpdate}
              onPlayStateChange={handlePlayStateChange}
              initialTime={initialTime}
            />
            
            {/* Resume Overlay - on top of video */}
            {showResumePrompt && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                <div className="bg-card border border-primary/50 rounded-xl p-6 max-w-sm mx-4 text-center shadow-xl">
                  <RotateCcw className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="text-lg font-medium mb-1">
                    Kontynuować od <span className="text-primary font-bold">{formatTime(savedPosition)}</span>?
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ostatnio oglądałeś to wideo
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={handleStartOver}>
                      Od początku
                    </Button>
                    <Button onClick={handleResume}>
                      Kontynuuj
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground">
          <Badge variant="outline">
            {CONTENT_TYPE_LABELS[material.content_type as keyof typeof CONTENT_TYPE_LABELS]}
          </Badge>
          {material.category && (
            <Badge variant="secondary">{material.category}</Badge>
          )}
          {material.duration_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.floor(material.duration_seconds / 60)} min
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {material.view_count} wyświetleń
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HealthyKnowledgePlayerPage;
