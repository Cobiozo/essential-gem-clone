import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AdminConversation {
  id: string;
  admin_user_id: string;
  target_user_id: string;
  status: string;
  created_at: string;
  closed_at: string | null;
}

export interface AdminConversationUser {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string | null;
  avatarUrl: string | null;
  conversationStatus: string;
}

export const useAdminConversations = () => {
  const { user, userRole } = useAuth();
  const isAdmin = userRole?.role?.toLowerCase() === 'admin';
  const [conversations, setConversations] = useState<AdminConversationUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all admin conversations with user profiles
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setConversations([]);
        return;
      }

      // Get unique user IDs (target for admin, admin for user)
      const userIds = isAdmin
        ? data.map(c => c.target_user_id)
        : data.map(c => c.admin_user_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, role, email, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enriched: AdminConversationUser[] = data.map(conv => {
        const targetId = isAdmin ? conv.target_user_id : conv.admin_user_id;
        const profile = profileMap.get(targetId);
        return {
          userId: targetId,
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          role: profile?.role || 'client',
          email: profile?.email || null,
          avatarUrl: profile?.avatar_url || null,
          conversationStatus: conv.status,
        };
      });

      setConversations(enriched);
    } catch (error) {
      console.error('Error fetching admin conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  // Open/create conversation (admin only)
  const openConversation = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user || !isAdmin) return false;

    try {
      // Upsert: if exists and closed, reopen; if not exists, create
      const { data: existing } = await supabase
        .from('admin_conversations')
        .select('id, status')
        .eq('admin_user_id', user.id)
        .eq('target_user_id', targetUserId)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'closed') {
          const { error } = await supabase
            .from('admin_conversations')
            .update({ status: 'open', closed_at: null })
            .eq('id', existing.id);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from('admin_conversations')
          .insert({
            admin_user_id: user.id,
            target_user_id: targetUserId,
            status: 'open',
          });
        if (error) throw error;
      }

      await fetchConversations();
      return true;
    } catch (error) {
      console.error('Error opening admin conversation:', error);
      return false;
    }
  }, [user, isAdmin, fetchConversations]);

  // Close conversation (admin only)
  const closeConversation = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user || !isAdmin) return false;

    try {
      const { error } = await supabase
        .from('admin_conversations')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('admin_user_id', user.id)
        .eq('target_user_id', targetUserId);

      if (error) throw error;

      toast.success('Konwersacja została zamknięta');
      await fetchConversations();
      return true;
    } catch (error) {
      console.error('Error closing admin conversation:', error);
      toast.error('Błąd zamykania konwersacji');
      return false;
    }
  }, [user, isAdmin, fetchConversations]);

  // Check conversation status for a specific user
  const getConversationStatus = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Check if there's an admin conversation involving current user and the other user
      const { data, error } = await supabase
        .from('admin_conversations')
        .select('status')
        .or(
          `and(admin_user_id.eq.${user.id},target_user_id.eq.${otherUserId}),and(admin_user_id.eq.${otherUserId},target_user_id.eq.${user.id})`
        )
        .maybeSingle();

      if (error) throw error;
      return data?.status || null;
    } catch (error) {
      console.error('Error checking conversation status:', error);
      return null;
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchConversations();

    const channel = supabase
      .channel('admin-conversations-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_conversations',
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    loading,
    isAdmin,
    openConversation,
    closeConversation,
    getConversationStatus,
    refetch: fetchConversations,
  };
};
