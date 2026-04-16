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
  eqId: string | null;
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
      // Only fetch conversations involving the current user (either as admin or as target)
      const { data, error } = await supabase
        .from('admin_conversations')
        .select('*')
        .or(`admin_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setConversations([]);
        return;
      }

      // The "other party" is whichever side is NOT the current user
      const userIds = Array.from(new Set(
        data.map(c => c.admin_user_id === user.id ? c.target_user_id : c.admin_user_id)
      ));

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, role, email, avatar_url, eq_id')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Deduplicate by other-user id (a single user might appear in multiple conversation rows
      // if both admin->user and user->admin entries exist). Keep the most recent (data is already
      // ordered DESC by created_at, so first occurrence wins).
      const dedupMap = new Map<string, AdminConversationUser>();
      for (const conv of data) {
        const otherId = conv.admin_user_id === user.id ? conv.target_user_id : conv.admin_user_id;
        if (dedupMap.has(otherId)) continue;
        const profile = profileMap.get(otherId);
        dedupMap.set(otherId, {
          userId: otherId,
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          role: profile?.role || 'client',
          email: profile?.email || null,
          avatarUrl: profile?.avatar_url || null,
          eqId: profile?.eq_id || null,
          conversationStatus: conv.status,
        });
      }

      setConversations(Array.from(dedupMap.values()));
    } catch (error) {
      console.error('Error fetching admin conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  // Open/create conversation (admin only)
  const openConversation = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user || !isAdmin) return false;

    // Block self-conversation
    if (targetUserId === user.id) {
      toast.error('Nie można rozpocząć konwersacji z samym sobą');
      return false;
    }

    try {
      // Bidirectional lookup: existing conversation may have either party as admin
      const { data: existing } = await supabase
        .from('admin_conversations')
        .select('id, status, admin_user_id, target_user_id')
        .or(
          `and(admin_user_id.eq.${user.id},target_user_id.eq.${targetUserId}),and(admin_user_id.eq.${targetUserId},target_user_id.eq.${user.id})`
        )
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
