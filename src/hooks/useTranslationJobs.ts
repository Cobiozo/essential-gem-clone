import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TranslationJob {
  id: string;
  source_language: string;
  target_language: string;
  mode: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_keys: number;
  processed_keys: number;
  errors: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  job_type: 'i18n' | 'cms';
  page_id: string | null;
}

export const useTranslationJobs = () => {
  const [activeJob, setActiveJob] = useState<TranslationJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Check for active jobs on mount
  useEffect(() => {
    const checkActiveJobs = async () => {
      const { data, error } = await supabase
        .from('translation_jobs')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setActiveJob(data as TranslationJob);
      }
    };

    checkActiveJobs();
  }, []);

  // Poll for job status updates when there's an active job
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed' || activeJob.status === 'cancelled') {
      return;
    }

    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('translation_jobs')
        .select('*')
        .eq('id', activeJob.id)
        .single();

      if (!error && data) {
        const updatedJob = data as TranslationJob;
        setActiveJob(updatedJob);

        // Show toast on completion
        if (updatedJob.status === 'completed') {
          toast({
            title: 'Tłumaczenie zakończone',
            description: `Przetłumaczono ${updatedJob.processed_keys} ${updatedJob.job_type === 'cms' ? 'elementów CMS' : 'kluczy'}${updatedJob.errors > 0 ? ` (${updatedJob.errors} błędów)` : ''}`,
          });
        } else if (updatedJob.status === 'failed') {
          toast({
            title: 'Błąd tłumaczenia',
            description: updatedJob.error_message || 'Wystąpił nieznany błąd',
            variant: 'destructive',
          });
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status, toast]);

  const startJob = useCallback(async (
    sourceLanguage: string,
    targetLanguage: string,
    mode: 'all' | 'missing' = 'missing',
    jobType: 'i18n' | 'cms' = 'i18n',
    pageId?: string | null
  ) => {
    setIsLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create job in database
      const { data: job, error: createError } = await supabase
        .from('translation_jobs')
        .insert({
          source_language: sourceLanguage,
          target_language: targetLanguage,
          mode,
          status: 'pending',
          created_by: user?.id,
          job_type: jobType,
          page_id: pageId || null
        })
        .select()
        .single();

      if (createError || !job) {
        throw new Error(createError?.message || 'Failed to create job');
      }

      setActiveJob(job as TranslationJob);

      // Invoke edge function to start background processing
      const { error: invokeError } = await supabase.functions.invoke('background-translate', {
        body: { jobId: job.id }
      });

      if (invokeError) {
        // Update job status to failed
        await supabase
          .from('translation_jobs')
          .update({ status: 'failed', error_message: invokeError.message })
          .eq('id', job.id);

        throw invokeError;
      }

      toast({
        title: jobType === 'cms' ? 'Tłumaczenie CMS rozpoczęte' : 'Tłumaczenie rozpoczęte',
        description: 'Proces działa w tle. Możesz zamknąć okno.',
      });

      return job;
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się rozpocząć tłumaczenia',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const cancelJob = useCallback(async () => {
    if (!activeJob) return;

    try {
      await supabase
        .from('translation_jobs')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', activeJob.id);

      setActiveJob(prev => prev ? { ...prev, status: 'cancelled' } : null);

      toast({
        title: 'Anulowano',
        description: 'Zadanie tłumaczenia zostało anulowane',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się anulować zadania',
        variant: 'destructive',
      });
    }
  }, [activeJob, toast]);

  const clearJob = useCallback(() => {
    setActiveJob(null);
  }, []);

  const refreshJob = useCallback(async () => {
    if (!activeJob) return;
    
    const { data, error } = await supabase
      .from('translation_jobs')
      .select('*')
      .eq('id', activeJob.id)
      .single();

    if (!error && data) {
      setActiveJob(data as TranslationJob);
    }
  }, [activeJob]);

  const progress = activeJob ? 
    (activeJob.total_keys > 0 ? Math.round((activeJob.processed_keys / activeJob.total_keys) * 100) : 0) 
    : 0;

  return {
    activeJob,
    isLoading,
    progress,
    startJob,
    cancelJob,
    clearJob,
    refreshJob,
  };
};
