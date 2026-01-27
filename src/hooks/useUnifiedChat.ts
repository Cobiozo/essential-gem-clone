import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS, ROLE_HIERARCHY } from '@/types/roleChat';

export interface UnifiedChannel {
  id: string;
  type: 'role' | 'broadcast' | 'private' | 'direct';
  name: string;
  targetRole: string | null;
  targetUserId?: string | null;
  icon: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
  canSend: boolean;
  canReceive: boolean;
  isIncoming: boolean;
  isUpline?: boolean;
}

export interface TeamMemberChannel {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  eqId: string | null;
  avatarUrl: string | null;
  isUpline: boolean;
  level: number;
}

export interface UnifiedMessage {
  id: string;
  channelId: string | null;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderInitials: string;
  senderRole: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
  isRead: boolean;
}

interface UseUnifiedChatOptions {
  enableRealtime?: boolean;
}

export const useUnifiedChat = (options?: UseUnifiedChatOptions) => {
  const { user, userRole, profile } = useAuth();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedDirectUserId, setSelectedDirectUserId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [teamMembers, setTeamMembers] = useState<TeamMemberChannel[]>([]);
  const [upline, setUpline] = useState<TeamMemberChannel | null>(null);

  const enableRealtime = options?.enableRealtime ?? false;
  const currentRole = userRole?.role?.toLowerCase() || 'client';
  const currentLevel = ROLE_HIERARCHY[currentRole] || 25;

  // Fetch team members (upline + downline)
  const fetchTeamMembers = useCallback(async () => {
    if (!user || !profile) return;

    try {
      // Fetch upline (guardian)
      if (profile.upline_eq_id) {
        const { data: uplineData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, eq_id, role, avatar_url')
          .eq('eq_id', profile.upline_eq_id)
          .eq('is_active', true)
          .single();

        if (uplineData) {
          setUpline({
            userId: uplineData.user_id,
            firstName: uplineData.first_name || '',
            lastName: uplineData.last_name || '',
            role: uplineData.role || 'partner',
            eqId: uplineData.eq_id,
            avatarUrl: uplineData.avatar_url,
            isUpline: true,
            level: -1,
          });
        }
      }

      // Fetch downline (structure) - only for users with eq_id
      if (profile.eq_id) {
        const { data: treeData } = await supabase.rpc('get_organization_tree', {
          p_root_eq_id: profile.eq_id,
          p_max_depth: 10,
        });

        if (treeData && Array.isArray(treeData)) {
          // Filter only members below root (level > 0)
          const downlineMembers: TeamMemberChannel[] = treeData
            .filter((m: any) => m.level > 0)
            .map((m: any) => ({
              userId: m.id,
              firstName: m.first_name || '',
              lastName: m.last_name || '',
              role: m.role || 'client',
              eqId: m.eq_id,
              avatarUrl: m.avatar_url,
              isUpline: false,
              level: m.level,
            }));

          setTeamMembers(downlineMembers);
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  }, [user, profile]);

  // Fetch direct messages for 1:1 chat
  const fetchDirectMessages = useCallback(async (otherUserId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_chat_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedMessages: UnifiedMessage[] = (data || []).map(m => {
        const senderProfile = profileMap.get(m.sender_id);
        const firstName = senderProfile?.first_name || '';
        const lastName = senderProfile?.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Nieznany';
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '??';

        return {
          id: m.id,
          channelId: m.channel_id,
          senderId: m.sender_id,
          senderName: fullName,
          senderAvatar: senderProfile?.avatar_url,
          senderInitials: initials,
          senderRole: m.sender_role,
          content: m.content,
          createdAt: m.created_at,
          isOwn: m.sender_id === user.id,
          isRead: m.is_read,
        };
      });

      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error fetching direct messages:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Send direct message to specific user
  const sendDirectMessage = useCallback(async (recipientId: string, content: string): Promise<boolean> => {
    if (!user || !profile) return false;

    try {
      // Get recipient's profile for role
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('user_id', recipientId)
        .single();

      if (!recipientProfile) return false;

      const { error: msgError } = await supabase
        .from('role_chat_messages')
        .insert({
          sender_id: user.id,
          sender_role: currentRole,
          recipient_role: recipientProfile.role || 'client',
          recipient_id: recipientId,
          content,
          channel_id: null,
        });

      if (msgError) throw msgError;

      // Send notification
      const senderName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Użytkownik';
      await supabase.from('user_notifications').insert({
        user_id: recipientId,
        sender_id: user.id,
        notification_type: 'direct_message',
        source_module: 'role_chat',
        title: `Wiadomość od ${senderName}`,
        message: content.length > 100 ? content.substring(0, 100) + '...' : content,
        link: '/messages',
        metadata: {
          sender_name: senderName,
          sender_role: currentRole,
        },
      });

      // Refresh messages
      await fetchDirectMessages(recipientId);
      return true;
    } catch (error) {
      console.error('Error sending direct message:', error);
      return false;
    }
  }, [user, profile, currentRole, fetchDirectMessages]);

  // Select direct message user
  const selectDirectMember = useCallback((userId: string) => {
    setSelectedChannelId(null);
    setSelectedDirectUserId(userId);
    fetchDirectMessages(userId);
  }, [fetchDirectMessages]);

  // Generate virtual channels based on user role
  const channels = useMemo((): UnifiedChannel[] => {
    const result: UnifiedChannel[] = [];
    
    // Admin can send to all roles
    if (currentRole === 'admin') {
      result.push({
        id: 'broadcast-all',
        type: 'broadcast',
        name: 'Wszyscy',
        targetRole: null,
        icon: 'Users',
        unreadCount: unreadCounts.get('broadcast-all') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
      
      result.push({
        id: 'role-partner',
        type: 'role',
        name: 'Partnerzy',
        targetRole: 'partner',
        icon: 'Users',
        unreadCount: unreadCounts.get('role-partner') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
      
      result.push({
        id: 'role-specjalista',
        type: 'role',
        name: 'Specjaliści',
        targetRole: 'specjalista',
        icon: 'UserCheck',
        unreadCount: unreadCounts.get('role-specjalista') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
      
      result.push({
        id: 'role-client',
        type: 'role',
        name: 'Klienci',
        targetRole: 'client',
        icon: 'User',
        unreadCount: unreadCounts.get('role-client') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
    }
    
    // Partner can send to specjalista and client
    if (currentRole === 'partner') {
      result.push({
        id: 'role-specjalista',
        type: 'role',
        name: 'Specjaliści',
        targetRole: 'specjalista',
        icon: 'UserCheck',
        unreadCount: unreadCounts.get('role-specjalista') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
      
      result.push({
        id: 'role-client',
        type: 'role',
        name: 'Klienci',
        targetRole: 'client',
        icon: 'User',
        unreadCount: unreadCounts.get('role-client') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
      
      // Partner receives from admin
      result.push({
        id: 'incoming-admin',
        type: 'role',
        name: 'Od Administratorów',
        targetRole: 'admin',
        icon: 'Shield',
        unreadCount: unreadCounts.get('incoming-admin') || 0,
        canSend: false,
        canReceive: true,
        isIncoming: true,
      });
    }
    
    // Specjalista can send to client only
    if (currentRole === 'specjalista') {
      result.push({
        id: 'role-client',
        type: 'role',
        name: 'Klienci',
        targetRole: 'client',
        icon: 'User',
        unreadCount: unreadCounts.get('role-client') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
      
      // Specjalista receives from admin and partner
      result.push({
        id: 'incoming-admin',
        type: 'role',
        name: 'Od Administratorów',
        targetRole: 'admin',
        icon: 'Shield',
        unreadCount: unreadCounts.get('incoming-admin') || 0,
        canSend: false,
        canReceive: true,
        isIncoming: true,
      });
      
      result.push({
        id: 'incoming-partner',
        type: 'role',
        name: 'Od Partnerów',
        targetRole: 'partner',
        icon: 'Users',
        unreadCount: unreadCounts.get('incoming-partner') || 0,
        canSend: false,
        canReceive: true,
        isIncoming: true,
      });
    }
    
    // Client can only receive
    if (currentRole === 'client') {
      result.push({
        id: 'incoming-admin',
        type: 'role',
        name: 'Od Administratorów',
        targetRole: 'admin',
        icon: 'Shield',
        unreadCount: unreadCounts.get('incoming-admin') || 0,
        canSend: false,
        canReceive: true,
        isIncoming: true,
      });
      
      result.push({
        id: 'incoming-partner',
        type: 'role',
        name: 'Od Partnerów',
        targetRole: 'partner',
        icon: 'Users',
        unreadCount: unreadCounts.get('incoming-partner') || 0,
        canSend: false,
        canReceive: true,
        isIncoming: true,
      });
      
      result.push({
        id: 'incoming-specjalista',
        type: 'role',
        name: 'Od Specjalistów',
        targetRole: 'specjalista',
        icon: 'UserCheck',
        unreadCount: unreadCounts.get('incoming-specjalista') || 0,
        canSend: false,
        canReceive: true,
        isIncoming: true,
      });
    }
    
    return result;
  }, [currentRole, unreadCounts]);

  const selectedChannel = useMemo(() => 
    channels.find(c => c.id === selectedChannelId) || null,
    [channels, selectedChannelId]
  );

  // Fetch messages for selected channel
  const fetchMessages = useCallback(async (channelId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const channel = channels.find(c => c.id === channelId);
      if (!channel) return;

      let query = supabase
        .from('role_chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      // Filter based on channel type
      if (channel.isIncoming) {
        // Incoming messages from a specific role TO current role
        query = query
          .eq('sender_role', channel.targetRole)
          .eq('recipient_role', currentRole);
      } else if (channel.targetRole) {
        // Outgoing messages from current role TO target role
        query = query
          .eq('sender_role', currentRole)
          .eq('recipient_role', channel.targetRole);
      } else {
        // Broadcast to all - show all messages sent by current user
        query = query.eq('sender_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedMessages: UnifiedMessage[] = (data || []).map(m => {
        const senderProfile = profileMap.get(m.sender_id);
        const firstName = senderProfile?.first_name || '';
        const lastName = senderProfile?.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Nieznany';
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '??';

        return {
          id: m.id,
          channelId: m.channel_id,
          senderId: m.sender_id,
          senderName: fullName,
          senderAvatar: senderProfile?.avatar_url,
          senderInitials: initials,
          senderRole: m.sender_role,
          content: m.content,
          createdAt: m.created_at,
          isOwn: m.sender_id === user.id,
          isRead: m.is_read,
        };
      });

      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [user, channels, currentRole]);

  // Fetch unread counts
  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;

    try {
      // Get unread messages where current user is recipient
      const { data, error } = await supabase
        .from('role_chat_messages')
        .select('sender_role')
        .eq('recipient_role', currentRole)
        .eq('is_read', false)
        .or(`recipient_id.eq.${user.id},recipient_id.is.null`);

      if (error) throw error;

      const counts = new Map<string, number>();
      (data || []).forEach(m => {
        const key = `incoming-${m.sender_role}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }, [user, currentRole]);

  // Send message to channel
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!user || !profile || !selectedChannel || !selectedChannel.canSend) return false;

    try {
      const targetRole = selectedChannel.targetRole;
      
      // Insert message
      const { error: msgError } = await supabase
        .from('role_chat_messages')
        .insert({
          sender_id: user.id,
          sender_role: currentRole,
          recipient_role: targetRole || 'all',
          recipient_id: null, // Broadcast to role
          content,
          channel_id: null,
        });

      if (msgError) throw msgError;

      // Send notification to all users of target role
      if (targetRole) {
        const senderName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Użytkownik';
        
        await supabase.from('user_notifications').insert({
          user_id: null, // Broadcast - will use target_role
          target_role: targetRole,
          sender_id: user.id,
          notification_type: 'role_chat_message',
          source_module: 'role_chat',
          title: `Nowa wiadomość od ${ROLE_LABELS[currentRole] || currentRole}`,
          message: content.length > 100 ? content.substring(0, 100) + '...' : content,
          link: '/my-account?tab=communication',
          metadata: {
            sender_name: senderName,
            sender_role: currentRole,
          },
        });
      }

      // Refresh messages
      await fetchMessages(selectedChannel.id);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, [user, profile, selectedChannel, currentRole, fetchMessages]);

  // Mark channel messages as read
  const markChannelAsRead = useCallback(async (channelId: string) => {
    if (!user) return;

    const channel = channels.find(c => c.id === channelId);
    if (!channel || !channel.isIncoming) return;

    try {
      await supabase
        .from('role_chat_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('sender_role', channel.targetRole)
        .eq('recipient_role', currentRole)
        .eq('is_read', false)
        .or(`recipient_id.eq.${user.id},recipient_id.is.null`);

      // Update local unread count
      setUnreadCounts(prev => {
        const next = new Map(prev);
        next.set(channelId, 0);
        return next;
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [user, channels, currentRole]);

  // Select channel
  const selectChannel = useCallback((channelId: string) => {
    setSelectedChannelId(channelId);
    fetchMessages(channelId);
    
    const channel = channels.find(c => c.id === channelId);
    if (channel?.isIncoming) {
      markChannelAsRead(channelId);
    }
  }, [fetchMessages, channels, markChannelAsRead]);

  // Initial fetch
  useEffect(() => {
    if (!user) return;
    fetchUnreadCounts();
    fetchTeamMembers();
  }, [user, fetchUnreadCounts, fetchTeamMembers]);

  // Real-time subscription
  useEffect(() => {
    if (!user || !enableRealtime) return;

    const channel = supabase
      .channel(`unified-chat-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'role_chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Check if message is for current user
          const isForMe = 
            newMessage.recipient_role === currentRole &&
            (newMessage.recipient_id === user.id || newMessage.recipient_id === null);
          
          if (isForMe || newMessage.sender_id === user.id) {
            // Refresh current channel if it matches
            if (selectedChannelId) {
              fetchMessages(selectedChannelId);
            }
            fetchUnreadCounts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, enableRealtime, currentRole, selectedChannelId, fetchMessages, fetchUnreadCounts]);

  // Calculate total unread
  const totalUnread = useMemo(() => {
    let total = 0;
    unreadCounts.forEach(count => total += count);
    return total;
  }, [unreadCounts]);

  // Get selected direct member info
  const selectedDirectMember = useMemo(() => {
    if (!selectedDirectUserId) return null;
    if (upline?.userId === selectedDirectUserId) return upline;
    return teamMembers.find(m => m.userId === selectedDirectUserId) || null;
  }, [selectedDirectUserId, upline, teamMembers]);

  return {
    channels,
    selectedChannel,
    messages,
    loading,
    totalUnread,
    selectChannel,
    sendMessage,
    markChannelAsRead,
    // Team members
    teamMembers,
    upline,
    selectedDirectUserId,
    selectedDirectMember,
    selectDirectMember,
    sendDirectMessage,
    refetch: () => {
      fetchUnreadCounts();
      fetchTeamMembers();
      if (selectedChannelId) {
        fetchMessages(selectedChannelId);
      }
      if (selectedDirectUserId) {
        fetchDirectMessages(selectedDirectUserId);
      }
    },
  };
};
