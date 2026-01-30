import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ChatSidebarVisibility {
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_specjalista: boolean;
  visible_to_client: boolean;
}

export const useChatSidebarVisibility = () => {
  return useQuery({
    queryKey: ['chat-sidebar-visibility'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_sidebar_visibility')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching chat sidebar visibility:', error);
        // Default to all visible if fetch fails
        return {
          visible_to_admin: true,
          visible_to_partner: true,
          visible_to_specjalista: true,
          visible_to_client: true,
        } as ChatSidebarVisibility;
      }

      return data as ChatSidebarVisibility;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const isRoleVisibleForChat = (
  visibility: ChatSidebarVisibility | undefined,
  role: string | undefined
): boolean => {
  if (!visibility || !role) return true; // Default visible
  
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
