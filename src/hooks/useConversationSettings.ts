import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ConversationSetting {
  id: string;
  user_id: string;
  other_user_id: string;
  is_deleted: boolean;
  deleted_at: string | null;
  is_archived: boolean;
  archived_at: string | null;
  is_blocked: boolean;
  blocked_at: string | null;
}

export const useConversationSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ConversationSetting[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversation_user_settings')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setSettings((data as ConversationSetting[]) || []);
    } catch (error) {
      console.error('Error fetching conversation settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchSettings();
  }, [user, fetchSettings]);

  const getSettingForUser = useCallback((otherUserId: string): ConversationSetting | undefined => {
    return settings.find(s => s.other_user_id === otherUserId);
  }, [settings]);

  const upsertSetting = useCallback(async (
    otherUserId: string,
    updates: Partial<Pick<ConversationSetting, 'is_deleted' | 'is_archived' | 'is_blocked'>>
  ) => {
    if (!user) return false;

    try {
      const existing = settings.find(s => s.other_user_id === otherUserId);
      const now = new Date().toISOString();

      const payload: Record<string, unknown> = { ...updates };
      if (updates.is_deleted !== undefined) payload.deleted_at = updates.is_deleted ? now : null;
      if (updates.is_archived !== undefined) payload.archived_at = updates.is_archived ? now : null;
      if (updates.is_blocked !== undefined) payload.blocked_at = updates.is_blocked ? now : null;

      if (existing) {
        const { error } = await supabase
          .from('conversation_user_settings')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('conversation_user_settings')
          .insert({
            user_id: user.id,
            other_user_id: otherUserId,
            ...payload,
          });
        if (error) throw error;
      }

      await fetchSettings();
      return true;
    } catch (error) {
      console.error('Error updating conversation setting:', error);
      return false;
    }
  }, [user, settings, fetchSettings]);

  const deleteConversation = useCallback(async (otherUserId: string) => {
    const success = await upsertSetting(otherUserId, { is_deleted: true });
    if (success) toast.success('Konwersacja usunięta');
    return success;
  }, [upsertSetting]);

  const archiveConversation = useCallback(async (otherUserId: string) => {
    const setting = getSettingForUser(otherUserId);
    const isCurrentlyArchived = setting?.is_archived || false;
    const success = await upsertSetting(otherUserId, { is_archived: !isCurrentlyArchived });
    if (success) {
      toast.success(isCurrentlyArchived ? 'Konwersacja przywrócona' : 'Konwersacja zarchiwizowana');
    }
    return success;
  }, [upsertSetting, getSettingForUser]);

  const blockUser = useCallback(async (otherUserId: string) => {
    const success = await upsertSetting(otherUserId, { is_blocked: true });
    if (success) toast.success('Użytkownik zablokowany');
    return success;
  }, [upsertSetting]);

  const unblockUser = useCallback(async (otherUserId: string) => {
    const success = await upsertSetting(otherUserId, { is_blocked: false });
    if (success) toast.success('Użytkownik odblokowany');
    return success;
  }, [upsertSetting]);

  const undeleteConversation = useCallback(async (otherUserId: string) => {
    return upsertSetting(otherUserId, { is_deleted: false });
  }, [upsertSetting]);

  // Check if a user is deleted/archived/blocked
  const isDeleted = useCallback((otherUserId: string) => {
    return getSettingForUser(otherUserId)?.is_deleted || false;
  }, [getSettingForUser]);

  const isArchived = useCallback((otherUserId: string) => {
    return getSettingForUser(otherUserId)?.is_archived || false;
  }, [getSettingForUser]);

  const isBlocked = useCallback((otherUserId: string) => {
    return getSettingForUser(otherUserId)?.is_blocked || false;
  }, [getSettingForUser]);

  return {
    settings,
    loading,
    deleteConversation,
    archiveConversation,
    blockUser,
    unblockUser,
    undeleteConversation,
    isDeleted,
    isArchived,
    isBlocked,
    getSettingForUser,
    refetch: fetchSettings,
  };
};
