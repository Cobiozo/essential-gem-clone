import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS, ROLE_HIERARCHY } from '@/types/roleChat';
import { toast } from 'sonner';
import { checkRecipientChatAccess } from '@/hooks/useRecipientChatAccess';

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
  isLeader?: boolean;
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
  isLeader?: boolean;
  content: string;
  createdAt: string;
  isOwn: boolean;
  isRead: boolean;
  isDeleted?: boolean;
  messageType?: string;
  attachmentUrl?: string;
  attachmentName?: string;
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
  const [canBroadcast, setCanBroadcast] = useState(false);
  const [adhocDirectMember, setAdhocDirectMember] = useState<TeamMemberChannel | null>(null);

  const enableRealtime = options?.enableRealtime ?? false;
  const currentRole = userRole?.role?.toLowerCase() || 'client';
  const currentLevel = ROLE_HIERARCHY[currentRole] || 25;

  // Check if current partner has broadcast permission
  const checkBroadcastPermission = useCallback(async () => {
    if (!user || currentRole !== 'partner') {
      setCanBroadcast(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('leader_permissions')
        .select('can_broadcast')
        .eq('user_id', user.id)
        .maybeSingle();
      setCanBroadcast(data?.can_broadcast || false);
    } catch (error) {
      console.error('Error checking broadcast permission:', error);
      setCanBroadcast(false);
    }
  }, [user, currentRole]);

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
          const downlineRaw = treeData.filter((m: any) => m.level > 0);
          
          // Fetch leader permissions for downline partners
          const partnerIds = downlineRaw
            .filter((m: any) => (m.role || 'client') === 'partner')
            .map((m: any) => m.id);

          let leaderSet = new Set<string>();
          if (partnerIds.length > 0) {
            const { data: leaderPerms } = await supabase
              .from('leader_permissions')
              .select('user_id, can_broadcast, tripartite_meeting_enabled, partner_consultation_enabled')
              .in('user_id', partnerIds)
              .or('can_broadcast.eq.true,tripartite_meeting_enabled.eq.true,partner_consultation_enabled.eq.true');
            leaderSet = new Set(leaderPerms?.map(lp => lp.user_id) || []);
          }

          const downlineMembers: TeamMemberChannel[] = downlineRaw
            .map((m: any) => ({
              userId: m.id,
              firstName: m.first_name || '',
              lastName: m.last_name || '',
              role: m.role || 'client',
              eqId: m.eq_id,
              avatarUrl: m.avatar_url,
              isUpline: false,
              isLeader: leaderSet.has(m.id),
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
  const fetchDirectMessages = useCallback(async (otherUserId: string, options?: { silent?: boolean }) => {
    if (!user) return;

    if (!options?.silent) {
      setLoading(true);
    }
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

      // Fetch leader permissions for senders
      const { data: leaderPerms } = await supabase
        .from('leader_permissions')
        .select('user_id, can_broadcast, tripartite_meeting_enabled, partner_consultation_enabled')
        .in('user_id', senderIds)
        .or('can_broadcast.eq.true,tripartite_meeting_enabled.eq.true,partner_consultation_enabled.eq.true');

      const leaderSet = new Set(leaderPerms?.map(lp => lp.user_id) || []);
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
          isLeader: leaderSet.has(m.sender_id),
          content: m.content,
          createdAt: m.created_at,
          isOwn: m.sender_id === user.id,
          isRead: m.is_read,
          isDeleted: (m as any).is_deleted || false,
          messageType: m.message_type,
          attachmentUrl: m.attachment_url,
          attachmentName: m.attachment_name,
        };
      });

      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error fetching direct messages:', error);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [user]);

  // Send direct message to specific user
  const sendDirectMessage = useCallback(async (
    recipientId: string, 
    content: string,
    messageType: string = 'text',
    attachmentUrl?: string,
    attachmentName?: string
  ): Promise<boolean> => {
    if (!user || !profile) return false;

    try {
      // Get recipient's profile for role
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('user_id', recipientId)
        .single();

      if (!recipientProfile) return false;

      // Check if recipient has chat access (pass sender to bypass for active admin conversations)
      const recipientHasAccess = await checkRecipientChatAccess(recipientId, user?.id);
      if (!recipientHasAccess) {
        toast.error('Ten użytkownik nie ma włączonego czatu. Wysyłanie wiadomości jest niemożliwe.');
        return false;
      }

      const { error: msgError } = await supabase
        .from('role_chat_messages')
        .insert({
          sender_id: user.id,
          sender_role: currentRole,
          recipient_role: recipientProfile.role || 'client',
          recipient_id: recipientId,
          content,
          channel_id: null,
          message_type: messageType,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
        });

      if (msgError) throw msgError;

      // Optimistic update - add message to local state immediately
      const optimisticMessage: UnifiedMessage = {
        id: `temp-${Date.now()}`,
        channelId: null,
        senderId: user.id,
        senderName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Użytkownik',
        senderAvatar: (profile as any).avatar_url || undefined,
        senderInitials: `${(profile.first_name || '?').charAt(0)}${(profile.last_name || '?').charAt(0)}`.toUpperCase(),
        senderRole: currentRole,
        content,
        createdAt: new Date().toISOString(),
        isOwn: true,
        isRead: false,
        messageType: messageType,
        attachmentUrl: attachmentUrl,
        attachmentName: attachmentName,
      };
      setMessages(prev => [...prev, optimisticMessage]);

      // Send notification
      const senderName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Użytkownik';
      const notificationMessage = messageType !== 'text' 
        ? `Wysłał(a) ${messageType === 'image' ? 'zdjęcie' : messageType === 'video' ? 'wideo' : messageType === 'audio' ? 'wiadomość głosową' : 'załącznik'}`
        : content.length > 100 ? content.substring(0, 100) + '...' : content;
        
      await supabase.from('user_notifications').insert({
        user_id: recipientId,
        sender_id: user.id,
        notification_type: 'direct_message',
        source_module: 'role_chat',
        title: `Wiadomość od ${senderName}`,
        message: notificationMessage,
        link: `/messages?user=${user.id}`,
        metadata: {
          sender_name: senderName,
          sender_role: currentRole,
          message_type: messageType,
        },
      });

      // Trigger email notification for offline users
      try {
        await supabase.functions.invoke('send-chat-notification-email', {
          body: {
            recipient_id: recipientId,
            sender_name: senderName,
            message_content: content,
            message_type: messageType,
          },
        });
      } catch (emailError) {
        console.warn('Email notification failed:', emailError);
      }

      // Silent background refresh to sync with DB (get real IDs)
      fetchDirectMessages(recipientId, { silent: true });
      return true;
    } catch (error) {
      console.error('Error sending direct message:', error);
      return false;
    }
  }, [user, profile, currentRole, fetchDirectMessages]);

  // Create group chat with multiple team members
  const createGroupChat = useCallback(async (
    participantIds: string[],
    subject: string,
    initialMessage: string
  ): Promise<boolean> => {
    if (!user || !profile || participantIds.length < 2) return false;

    try {
      const senderName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Użytkownik';

      // Send initial message to all participants
      for (const recipientId of participantIds) {
        const { data: recipientProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', recipientId)
          .single();

        await supabase.from('role_chat_messages').insert({
          sender_id: user.id,
          sender_role: currentRole,
          recipient_role: recipientProfile?.role || 'client',
          recipient_id: recipientId,
          content: `[Czat grupowy: ${subject}]\n\n${initialMessage}`,
          channel_id: null,
          message_type: 'text',
        });

        // Send notification
        await supabase.from('user_notifications').insert({
          user_id: recipientId,
          sender_id: user.id,
          notification_type: 'group_chat_invite',
          source_module: 'role_chat',
          title: `Nowy czat grupowy: ${subject}`,
          message: `${senderName} zaprosił(a) Cię do czatu grupowego`,
          link: `/messages`,
          metadata: {
            sender_name: senderName,
            group_subject: subject,
          },
        });

        // Trigger email notification
        try {
          await supabase.functions.invoke('send-chat-notification-email', {
            body: {
              recipient_id: recipientId,
              sender_name: senderName,
              message_content: `Zaproszenie do czatu grupowego: ${subject}\n\n${initialMessage}`,
              message_type: 'text',
            },
          });
        } catch (emailError) {
          console.warn('Email notification failed:', emailError);
        }
      }

      return true;
    } catch (error) {
      console.error('Error creating group chat:', error);
      return false;
    }
  }, [user, profile, currentRole]);

  // Mark all DM messages from a specific user as read
  const markDirectAsRead = useCallback(async (otherUserId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('role_chat_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('sender_id', otherUserId)
        .eq('is_read', false);

      if (error) throw error;

      // Update local unread counts
      setUnreadCounts(prev => {
        const next = new Map(prev);
        next.set(`dm-${otherUserId}`, 0);
        return next;
      });
    } catch (error) {
      console.error('Error marking direct messages as read:', error);
    }
  }, [user]);

  // Select direct message user (works for any user, not just team members)
  const selectDirectMember = useCallback(async (userId: string) => {
    setSelectedChannelId(null);
    setSelectedDirectUserId(userId);
    
    // Check if user is in team members or upline
    const inTeam = teamMembers.find(m => m.userId === userId);
    const isUplineUser = upline?.userId === userId;
    
    if (!inTeam && !isUplineUser) {
      // Fetch profile for unknown user (admin selecting any user)
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, role, eq_id, avatar_url')
          .eq('user_id', userId)
          .single();
        
        if (profileData) {
          setAdhocDirectMember({
            userId: profileData.user_id,
            firstName: profileData.first_name || '',
            lastName: profileData.last_name || '',
            role: profileData.role || 'client',
            eqId: profileData.eq_id,
            avatarUrl: profileData.avatar_url,
            isUpline: false,
            level: 0,
          });
        }
      } catch (err) {
        console.error('Error fetching profile for direct member:', err);
      }
    } else {
      setAdhocDirectMember(null);
    }
    
    await fetchDirectMessages(userId);
    markDirectAsRead(userId);
  }, [fetchDirectMessages, markDirectAsRead, teamMembers, upline]);

  // Generate virtual channels based on user role
  const channels = useMemo((): UnifiedChannel[] => {
    const result: UnifiedChannel[] = [];
    
    // ===== ADMIN BROADCAST CHANNELS (5 outgoing) =====
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
        id: 'broadcast-lider',
        type: 'broadcast',
        name: 'Liderzy',
        targetRole: 'lider',
        icon: 'Crown',
        unreadCount: unreadCounts.get('broadcast-lider') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
      
      result.push({
        id: 'broadcast-partner',
        type: 'broadcast',
        name: 'Partnerzy',
        targetRole: 'partner',
        icon: 'Users',
        unreadCount: unreadCounts.get('broadcast-partner') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
      
      result.push({
        id: 'broadcast-specjalista',
        type: 'broadcast',
        name: 'Specjaliści',
        targetRole: 'specjalista',
        icon: 'UserCheck',
        unreadCount: unreadCounts.get('broadcast-specjalista') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
      
      result.push({
        id: 'broadcast-client',
        type: 'broadcast',
        name: 'Klienci',
        targetRole: 'client',
        icon: 'User',
        unreadCount: unreadCounts.get('broadcast-client') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
    }
    
    // ===== LEADER BROADCAST CHANNELS (4 outgoing, filtered by downline) =====
    if (currentRole === 'partner' && canBroadcast) {
      // Check if there are sub-leaders in downline
      const hasSubLeaders = teamMembers.some(m => m.role === 'partner');
      if (hasSubLeaders) {
        result.push({
          id: 'leader-broadcast-lider',
          type: 'broadcast',
          name: 'Liderzy w strukturze',
          targetRole: 'lider',
          icon: 'Crown',
          unreadCount: unreadCounts.get('leader-broadcast-lider') || 0,
          canSend: true,
          canReceive: false,
          isIncoming: false,
        });
      }
      
      result.push({
        id: 'leader-broadcast-partner',
        type: 'broadcast',
        name: 'Partnerzy w strukturze',
        targetRole: 'partner',
        icon: 'Users',
        unreadCount: unreadCounts.get('leader-broadcast-partner') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
      
      result.push({
        id: 'leader-broadcast-specjalista',
        type: 'broadcast',
        name: 'Specjaliści w strukturze',
        targetRole: 'specjalista',
        icon: 'UserCheck',
        unreadCount: unreadCounts.get('leader-broadcast-specjalista') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
      
      result.push({
        id: 'leader-broadcast-client',
        type: 'broadcast',
        name: 'Klienci w strukturze',
        targetRole: 'client',
        icon: 'User',
        unreadCount: unreadCounts.get('leader-broadcast-client') || 0,
        canSend: true,
        canReceive: false,
        isIncoming: false,
      });
    }
    
    // ===== INCOMING CHANNELS (read-only) =====
    // Leader (partner with can_broadcast): receives "Od Admina"
    if (currentRole === 'partner' && canBroadcast) {
      result.push({
        id: 'incoming-admin',
        type: 'broadcast',
        name: 'Od Administratora',
        targetRole: 'admin',
        icon: 'Shield',
        unreadCount: unreadCounts.get('incoming-admin') || 0,
        canSend: false,
        canReceive: true,
        isIncoming: true,
      });
    }
    
    // Partner (without broadcast): receives "Od Admina" + "Od Lidera"
    if (currentRole === 'partner' && !canBroadcast) {
      result.push({
        id: 'incoming-admin',
        type: 'broadcast',
        name: 'Od Administratora',
        targetRole: 'admin',
        icon: 'Shield',
        unreadCount: unreadCounts.get('incoming-admin') || 0,
        canSend: false,
        canReceive: true,
        isIncoming: true,
      });
      
      result.push({
        id: 'incoming-lider',
        type: 'broadcast',
        name: 'Od Lidera',
        targetRole: 'lider',
        icon: 'Crown',
        unreadCount: unreadCounts.get('incoming-lider') || 0,
        canSend: false,
        canReceive: true,
        isIncoming: true,
      });
    }
    
    // Specjalista: receives "Od Admina" + "Od Lidera"
    if (currentRole === 'specjalista') {
      result.push({
        id: 'incoming-admin',
        type: 'broadcast',
        name: 'Od Administratora',
        targetRole: 'admin',
        icon: 'Shield',
        unreadCount: unreadCounts.get('incoming-admin') || 0,
        canSend: false,
        canReceive: true,
        isIncoming: true,
      });
      
      result.push({
        id: 'incoming-lider',
        type: 'broadcast',
        name: 'Od Lidera',
        targetRole: 'lider',
        icon: 'Crown',
        unreadCount: unreadCounts.get('incoming-lider') || 0,
        canSend: false,
        canReceive: true,
        isIncoming: true,
      });
    }
    
    // Client: receives "Od Admina" + "Od Lidera"
    if (currentRole === 'client') {
      result.push({
        id: 'incoming-admin',
        type: 'broadcast',
        name: 'Od Administratora',
        targetRole: 'admin',
        icon: 'Shield',
        unreadCount: unreadCounts.get('incoming-admin') || 0,
        canSend: false,
        canReceive: true,
        isIncoming: true,
      });
      
      result.push({
        id: 'incoming-lider',
        type: 'broadcast',
        name: 'Od Lidera',
        targetRole: 'lider',
        icon: 'Crown',
        unreadCount: unreadCounts.get('incoming-lider') || 0,
        canSend: false,
        canReceive: true,
        isIncoming: true,
      });
    }
    
    return result;
  }, [currentRole, unreadCounts, canBroadcast, teamMembers]);

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
        .eq('is_broadcast', true)
        .order('created_at', { ascending: true })
        .limit(100);

      if (channel.isIncoming) {
        // Incoming broadcast messages
        if (channel.targetRole === 'admin') {
          // "Od Administratora" - messages sent by admin to my role or 'all'
          query = query
            .eq('sender_role', 'admin')
            .or(`recipient_role.eq.${currentRole},recipient_role.eq.all`)
            .or(`recipient_id.eq.${user.id},recipient_id.is.null`);
        } else if (channel.targetRole === 'lider') {
          // "Od Lidera" - broadcast messages from leaders where I'm a recipient
          query = query
            .eq('sender_role', 'lider')
            .eq('recipient_id', user.id);
        }
      } else if (channelId === 'broadcast-all') {
        // Admin broadcast to all - show sent messages
        query = query
          .eq('sender_id', user.id)
          .eq('recipient_role', 'all');
      } else if (channelId.startsWith('broadcast-')) {
        // Admin broadcast to specific role
        const role = channelId.replace('broadcast-', '');
        query = query
          .eq('sender_id', user.id)
          .eq('sender_role', 'admin')
          .eq('recipient_role', role);
      } else if (channelId.startsWith('leader-broadcast-')) {
        // Leader broadcast to specific role in downline
        const role = channelId.replace('leader-broadcast-', '');
        query = query
          .eq('sender_id', user.id)
          .eq('sender_role', 'lider')
          .eq('recipient_role', role);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      if (senderIds.length === 0) {
        setMessages([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Deduplicate messages (admin sends one per recipient, but show once in outgoing view)
      const seenContent = new Map<string, boolean>();
      const enrichedMessages: UnifiedMessage[] = [];
      
      for (const m of (data || [])) {
        // For outgoing channels, deduplicate by content+timestamp
        if (!channel.isIncoming) {
          const key = `${m.content}-${m.created_at}`;
          if (seenContent.has(key)) continue;
          seenContent.set(key, true);
        }

        const senderProfile = profileMap.get(m.sender_id);
        const firstName = senderProfile?.first_name || '';
        const lastName = senderProfile?.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Nieznany';
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '??';

        enrichedMessages.push({
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
          isDeleted: (m as any).is_deleted || false,
          messageType: m.message_type,
          attachmentUrl: m.attachment_url,
          attachmentName: m.attachment_name,
        });
      }

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
      // Get unread broadcast messages where current user is recipient
      const { data: broadcastData, error: broadcastError } = await supabase
        .from('role_chat_messages')
        .select('sender_role')
        .eq('recipient_role', currentRole)
        .eq('is_read', false)
        .or(`recipient_id.eq.${user.id},recipient_id.is.null`);

      if (broadcastError) throw broadcastError;

      const counts = new Map<string, number>();
      (broadcastData || []).forEach(m => {
        const key = `incoming-${m.sender_role}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      // Get unread direct messages (DMs) where current user is recipient
      const { data: dmData, error: dmError } = await supabase
        .from('role_chat_messages')
        .select('sender_id')
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .not('sender_id', 'eq', user.id);

      if (!dmError && dmData) {
        dmData.forEach(m => {
          const key = `dm-${m.sender_id}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        });
      }

      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }, [user, currentRole]);

  // Send broadcast message to channel
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!user || !profile || !selectedChannel || !selectedChannel.canSend) return false;

    try {
      const channelId = selectedChannel.id;
      const senderName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Użytkownik';
      const isLeaderBroadcast = channelId.startsWith('leader-broadcast-');
      const senderRole = isLeaderBroadcast ? 'lider' : 'admin';

      if (channelId === 'broadcast-all') {
        // Admin broadcast to ALL - insert one message per role
        const roles = ['partner', 'specjalista', 'client'];
        for (const role of roles) {
          await supabase.from('role_chat_messages').insert({
            sender_id: user.id,
            sender_role: 'admin',
            recipient_role: 'all',
            recipient_id: null,
            content,
            channel_id: null,
            is_broadcast: true,
          });
        }
      } else if (channelId === 'broadcast-lider') {
        // Admin broadcast to leaders - find partners with can_broadcast
        const { data: leaders } = await supabase
          .from('leader_permissions')
          .select('user_id')
          .eq('can_broadcast', true);

        for (const leader of (leaders || [])) {
          await supabase.from('role_chat_messages').insert({
            sender_id: user.id,
            sender_role: 'admin',
            recipient_role: 'lider',
            recipient_id: leader.user_id,
            content,
            channel_id: null,
            is_broadcast: true,
          });
        }
      } else if (channelId.startsWith('broadcast-')) {
        // Admin broadcast to specific role
        const targetRole = channelId.replace('broadcast-', '');
        const { data: targetUsers } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('role', targetRole)
          .eq('is_active', true);

        for (const targetUser of (targetUsers || [])) {
          await supabase.from('role_chat_messages').insert({
            sender_id: user.id,
            sender_role: 'admin',
            recipient_role: targetRole,
            recipient_id: targetUser.user_id,
            content,
            channel_id: null,
            is_broadcast: true,
          });
        }
      } else if (isLeaderBroadcast) {
        // Leader broadcast to specific role in downline
        const targetRole = channelId.replace('leader-broadcast-', '');
        
        // Filter downline by target role
        let recipients = teamMembers;
        if (targetRole === 'lider') {
          // Sub-leaders: partners with can_broadcast in downline
          const downlineIds = teamMembers.filter(m => m.role === 'partner').map(m => m.userId);
          if (downlineIds.length > 0) {
            const { data: leaderPerms } = await supabase
              .from('leader_permissions')
              .select('user_id')
              .eq('can_broadcast', true)
              .in('user_id', downlineIds);
            const leaderIds = new Set((leaderPerms || []).map(l => l.user_id));
            recipients = teamMembers.filter(m => leaderIds.has(m.userId));
          } else {
            recipients = [];
          }
        } else {
          recipients = teamMembers.filter(m => m.role === targetRole);
        }

        for (const recipient of recipients) {
          await supabase.from('role_chat_messages').insert({
            sender_id: user.id,
            sender_role: 'lider',
            recipient_role: targetRole,
            recipient_id: recipient.userId,
            content,
            channel_id: null,
            is_broadcast: true,
          });
        }
      }

      

      // Refresh messages
      await fetchMessages(selectedChannel.id);
      return true;
    } catch (error) {
      console.error('Error sending broadcast message:', error);
      toast.error('Błąd wysyłania wiadomości');
      return false;
    }
  }, [user, profile, selectedChannel, currentRole, fetchMessages, teamMembers]);

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
    setSelectedDirectUserId(null);
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
    checkBroadcastPermission();
  }, [user, fetchUnreadCounts, fetchTeamMembers, checkBroadcastPermission]);

  // Refs for stable function references in realtime subscription
  const fetchMessagesRef = useRef(fetchMessages);
  const fetchUnreadCountsRef = useRef(fetchUnreadCounts);
  const fetchDirectMessagesRef = useRef(fetchDirectMessages);
  
  // Keep refs in sync
  useEffect(() => { fetchMessagesRef.current = fetchMessages; }, [fetchMessages]);
  useEffect(() => { fetchUnreadCountsRef.current = fetchUnreadCounts; }, [fetchUnreadCounts]);
  useEffect(() => { fetchDirectMessagesRef.current = fetchDirectMessages; }, [fetchDirectMessages]);

  // Ref for selectedDirectUserId to use in realtime handler
  const selectedDirectUserIdRef = useRef<string | null>(null);
  useEffect(() => { selectedDirectUserIdRef.current = selectedDirectUserId; }, [selectedDirectUserId]);
  const selectedChannelIdRef = useRef<string | null>(null);
  useEffect(() => { selectedChannelIdRef.current = selectedChannelId; }, [selectedChannelId]);
  const markDirectAsReadRef = useRef(markDirectAsRead);
  useEffect(() => { markDirectAsReadRef.current = markDirectAsRead; }, [markDirectAsRead]);

  // Real-time subscription - listens for ALL events (INSERT, UPDATE, DELETE)
  // No filter — receives all changes, then checks relevance in handler
  useEffect(() => {
    if (!user || !enableRealtime) return;

    const channel = supabase
      .channel(`unified-chat-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_chat_messages',
        },
        (payload) => {
          const record = (payload.new || payload.old) as any;
          if (!record) return;

          const isRelevant =
            record.sender_id === user.id ||
            record.recipient_id === user.id ||
            (record.recipient_id === null && record.recipient_role === currentRole);

          if (!isRelevant) return;

          // Handle DM realtime refresh
          if (selectedDirectUserIdRef.current) {
            const otherUserId = selectedDirectUserIdRef.current;
            const isDMForThisConversation =
              (record.sender_id === otherUserId && record.recipient_id === user.id) ||
              (record.sender_id === user.id && record.recipient_id === otherUserId);
            if (isDMForThisConversation) {
              fetchDirectMessagesRef.current?.(otherUserId, { silent: true });
              // Auto-mark as read if incoming message in open conversation
              if (record.sender_id === otherUserId && record.recipient_id === user.id) {
                markDirectAsReadRef.current?.(otherUserId);
              }
            }
          }
          // Handle channel realtime refresh
          if (selectedChannelIdRef.current) {
            fetchMessagesRef.current?.(selectedChannelIdRef.current);
          }
          fetchUnreadCountsRef.current?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, enableRealtime, currentRole]);

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
    const found = teamMembers.find(m => m.userId === selectedDirectUserId);
    if (found) return found;
    // Return adhoc member (fetched for admin conversations)
    return adhocDirectMember;
  }, [selectedDirectUserId, upline, teamMembers, adhocDirectMember]);

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
    createGroupChat,
    deleteMessage: async (messageId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        // Try role_chat_messages first
        const { error: roleErr } = await supabase
          .from('role_chat_messages')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() } as any)
          .eq('id', messageId)
          .eq('sender_id', user.id);

        if (roleErr) {
          // Try private_chat_messages
          const { error: privateErr } = await supabase
            .from('private_chat_messages')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() } as any)
            .eq('id', messageId)
            .eq('sender_id', user.id);
          if (privateErr) throw privateErr;
        }

        // Update local state
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, isDeleted: true, content: '' } : m
        ));
        return true;
      } catch (error) {
        console.error('Error deleting message:', error);
        toast.error('Nie udało się usunąć wiadomości');
        return false;
      }
    },
    unreadCounts,
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
