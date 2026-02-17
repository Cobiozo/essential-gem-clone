import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AutoTranslateType = 'training_module' | 'training_lesson' | 'knowledge_resource' | 'healthy_knowledge' | 'new_language';

/**
 * Fire-and-forget auto-translation trigger.
 * Call after creating new content or adding a new language.
 */
export async function triggerAutoTranslate(
  type: AutoTranslateType,
  options?: { item_id?: string; language_code?: string }
) {
  try {
    const response = await supabase.functions.invoke('auto-translate-content', {
      body: { type, item_id: options?.item_id, language_code: options?.language_code },
    });

    if (response.error) {
      console.error('[autoTranslate] Error:', response.error);
      return;
    }

    const data = response.data;
    if (data?.jobs_created > 0) {
      toast.info(`Automatyczne tłumaczenie w tle rozpoczęte (${data.jobs_created} zadań)`);
    }
  } catch (error) {
    console.error('[autoTranslate] Failed to trigger:', error);
    // Silent fail — don't block the main action
  }
}
