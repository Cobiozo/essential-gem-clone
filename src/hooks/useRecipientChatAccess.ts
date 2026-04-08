import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecipientChatAccess {
  hasAccess: boolean;
  loading: boolean;
}

export const useRecipientChatAccess = (recipientUserId: string | null): RecipientChatAccess => {
  const [hasAccess, setHasAccess] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!recipientUserId) {
      setHasAccess(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const check = async () => {
      setLoading(true);
      try {
        const result = await checkRecipientChatAccess(recipientUserId);
        if (!cancelled) setHasAccess(result);
      } catch {
        if (!cancelled) setHasAccess(true); // default allow on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [recipientUserId]);

  return { hasAccess, loading };
};

/** Reusable helper – also used inside sendDirectMessage */
export const checkRecipientChatAccess = async (recipientUserId: string): Promise<boolean> => {
  // 1. Per-user override
  const { data: userOverride } = await supabase
    .from('chat_user_visibility')
    .select('is_visible')
    .eq('user_id', recipientUserId)
    .maybeSingle();

  if (userOverride !== null && userOverride !== undefined) {
    return userOverride.is_visible;
  }

  // 2. Global role-based settings
  const { data: recipientProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', recipientUserId)
    .single();

  if (!recipientProfile) return true;

  const { data: visibility } = await supabase
    .from('chat_sidebar_visibility')
    .select('*')
    .limit(1)
    .single();

  if (!visibility) return true;

  const role = (recipientProfile.role || '').toLowerCase();
  switch (role) {
    case 'admin': return visibility.visible_to_admin;
    case 'partner': return visibility.visible_to_partner;
    case 'specjalista': return visibility.visible_to_specjalista;
    case 'client':
    case 'user': return visibility.visible_to_client;
    default: return true;
  }
};
