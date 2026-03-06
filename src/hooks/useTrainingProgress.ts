import { supabase } from '@/integrations/supabase/client';

/**
 * Shared utility for calculating training module progress.
 * Used by both Training.tsx (main page) and TrainingProgressWidget.tsx (dashboard).
 * Ensures consistent progress calculation across the application.
 */

interface ModuleProgressResult {
  moduleId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  isCompleted: boolean;
}

/**
 * Batch-fetch progress for multiple modules in 2 queries (no N+1).
 */
export async function fetchBatchModuleProgress(
  userId: string,
  moduleIds: string[]
): Promise<Map<string, ModuleProgressResult>> {
  if (moduleIds.length === 0) return new Map();

  const [lessonsRes, progressRes] = await Promise.all([
    supabase
      .from('training_lessons')
      .select('id, module_id')
      .in('module_id', moduleIds)
      .eq('is_active', true),
    supabase
      .from('training_progress')
      .select('lesson_id, is_completed, training_lessons!inner(module_id)')
      .eq('user_id', userId)
      .eq('is_completed', true),
  ]);

  // Group lessons by module
  const lessonsByModule = new Map<string, string[]>();
  (lessonsRes.data || []).forEach((l: any) => {
    const arr = lessonsByModule.get(l.module_id) || [];
    arr.push(l.id);
    lessonsByModule.set(l.module_id, arr);
  });

  // Count completed lessons by module
  const completedByModule = new Map<string, number>();
  (progressRes.data || []).forEach((p: any) => {
    const mid = p.training_lessons?.module_id;
    if (mid) completedByModule.set(mid, (completedByModule.get(mid) || 0) + 1);
  });

  const result = new Map<string, ModuleProgressResult>();
  for (const moduleId of moduleIds) {
    const totalLessons = (lessonsByModule.get(moduleId) || []).length;
    const completedLessons = completedByModule.get(moduleId) || 0;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    result.set(moduleId, {
      moduleId,
      totalLessons,
      completedLessons,
      progressPercent,
      isCompleted: progressPercent === 100,
    });
  }

  return result;
}
