import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ChatSidebarVisibility {
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_specjalista: boolean;
  visible_to_client: boolean;
}

export const useChatSidebarVisibility = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['chat-sidebar-visibility', user?.id],
    queryFn: async () => {
      if (!user) {
        return {
          visible_to_admin: true,
          visible_to_partner: true,
          visible_to_specjalista: true,
          visible_to_client: true,
        } as ChatSidebarVisibility;
      }

      // First check for per-user override
      const { data: userOverride } = await supabase
        .from('chat_user_visibility')
        .select('is_visible')
        .eq('user_id', user.id)
        .maybeSingle();

      // If user has an override, we'll use it - but still need the base settings structure
      const { data, error } = await supabase
        .from('chat_sidebar_visibility')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching chat sidebar visibility:', error);
        return {
          visible_to_admin: true,
          visible_to_partner: true,
          visible_to_specjalista: true,
          visible_to_client: true,
          _userOverride: userOverride?.is_visible,
        } as ChatSidebarVisibility & { _userOverride?: boolean };
      }

      return {
        ...data,
        _userOverride: userOverride?.is_visible,
      } as ChatSidebarVisibility & { _userOverride?: boolean };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!user,
  });
};

export const isRoleVisibleForChat = (
  visibility: (ChatSidebarVisibility & { _userOverride?: boolean }) | undefined,
  role: string | undefined
): boolean => {
  if (!visibility || !role) return true; // Default visible
  
  // Check per-user override first
  if (visibility._userOverride !== undefined) {
    return visibility._userOverride;
  }
  
  const normalizedRole = role.toLowerCase();
  
  switch (normalizedRole) {
    case 'admin':
      return visibility.visible_to_admin;
    case 'partner':
      return visibility.visible_to_partner;
    case 'specjalista':
      return visibility.visible_to_specjalista;
    case 'client':
    case 'user':
      return visibility.visible_to_client;
    default:
      return true;
  }
};
