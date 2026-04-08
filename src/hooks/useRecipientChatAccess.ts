import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RecipientChatAccess {
  hasAccess: boolean;
  loading: boolean;
}

export const useRecipientChatAccess = (recipientUserId: string | null): RecipientChatAccess => {
  const { user } = useAuth();
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
        const result = await checkRecipientChatAccess(recipientUserId, user?.id);
        if (!cancelled) setHasAccess(result);
      } catch {
        if (!cancelled) setHasAccess(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [recipientUserId, user?.id]);

  return { hasAccess, loading };
};

/** Reusable helper – also used inside sendDirectMessage */
export const checkRecipientChatAccess = async (
  recipientUserId: string,
  senderUserId?: string
): Promise<boolean> => {
  // 0. If there's an active admin conversation between sender and recipient, always allow
  if (senderUserId) {
    const { data: adminConv } = await supabase
      .from('admin_conversations')
      .select('status')
      .or(
        `and(admin_user_id.eq.${recipientUserId},target_user_id.eq.${senderUserId}),and(admin_user_id.eq.${senderUserId},target_user_id.eq.${recipientUserId})`
      )
      .eq('status', 'open')
      .maybeSingle();

    if (adminConv) return true;
  }

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
