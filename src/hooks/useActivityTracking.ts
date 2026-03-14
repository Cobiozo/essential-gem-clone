import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ActivityType = 
  | 'page_view'
  | 'download'
  | 'share'
  | 'certificate_download'
  | 'resource_view'
  | 'training_lesson_complete'
  | 'training_module_start'
  | 'file_upload'
  | 'profile_update'
  | 'meeting_join'
  | 'chat_message';

export function useActivityTracking() {
  const trackActivity = useCallback(async (
    actionType: ActivityType,
    actionData: Record<string, unknown> = {},
    pagePath?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase.from('user_activity_log') as any).insert({
        user_id: user.id,
        action_type: actionType,
        action_data: actionData,
        page_path: pagePath || window.location.pathname,
      });
    } catch (error) {
      // Silent fail — tracking should never block UX
      console.warn('[ActivityTracking] Failed:', error);
    }
  }, []);

  return { trackActivity };
}
