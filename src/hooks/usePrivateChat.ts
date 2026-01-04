import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PrivateChatThread, PrivateChatMessage, CreateThreadData, CreateGroupThreadData, PrivateChatParticipant } from '@/types/privateChat';
import { useToast } from '@/hooks/use-toast';

interface UsePrivateChatOptions {
  enableRealtime?: boolean;
}

export const usePrivateChat = (options?: UsePrivateChatOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<PrivateChatThread[]>([]);
  const [messages, setMessages] = useState<PrivateChatMessage[]>([]);
  const [selectedThread, setSelectedThread] = useState<PrivateChatThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const enableRealtime = options?.enableRealtime ?? false;

  // Fetch all threads for current user
  const fetchThreads = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch threads where user is initiator, participant, or in participants table
      const { data: threadsData, error } = await supabase
        .from('private_chat_threads')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Filter threads where user is involved
      const userThreadIds = new Set<string>();
      
      // Check participant table for group memberships
      const { data: participantData } = await supabase
        .from('private_chat_participants')
        .select('thread_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      participantData?.forEach(p => userThreadIds.add(p.thread_id));

      // Filter threads
      const filteredThreads = (threadsData || []).filter(t => 
        t.initiator_id === user.id || 
        t.participant_id === user.id ||
        userThreadIds.has(t.id)
      );

      // Fetch profile data for all participants
      const userIds = new Set<string>();
      filteredThreads.forEach(t => {
        userIds.add(t.initiator_id);
        if (t.participant_id) userIds.add(t.participant_id);
      });

      // Fetch group participants
      const groupThreadIds = filteredThreads.filter(t => t.is_group).map(t => t.id);
      let groupParticipants: PrivateChatParticipant[] = [];
      
      if (groupThreadIds.length > 0) {
        const { data: groupParticipantsData } = await supabase
          .from('private_chat_participants')
          .select('*')
          .in('thread_id', groupThreadIds)
          .eq('is_active', true);
        
        groupParticipantsData?.forEach(p => userIds.add(p.user_id));
        groupParticipants = groupParticipantsData || [];
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, specialization')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch unread counts
      const threadIds = filteredThreads.map(t => t.id);
      const { data: unreadData } = await supabase
        .from('private_chat_messages')
        .select('thread_id')
        .in('thread_id', threadIds)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      const unreadCounts = new Map<string, number>();
      unreadData?.forEach(m => {
        unreadCounts.set(m.thread_id, (unreadCounts.get(m.thread_id) || 0) + 1);
      });

      const enrichedThreads: PrivateChatThread[] = filteredThreads.map(t => {
        const threadParticipants = groupParticipants
          .filter(p => p.thread_id === t.id)
          .map(p => ({
            ...p,
            profile: profileMap.get(p.user_id),
          }));

        return {
          ...t,
          status: t.status as 'active' | 'closed' | 'archived',
          initiator: profileMap.get(t.initiator_id),
          participant: t.participant_id ? profileMap.get(t.participant_id) : undefined,
          participants: t.is_group ? threadParticipants : undefined,
          unread_count: unreadCounts.get(t.id) || 0,
        };
      });

      setThreads(enrichedThreads);
      setUnreadCount(unreadData?.length || 0);
    } catch (error) {
      console.error('Error fetching threads:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch messages for a specific thread
  const fetchMessages = useCallback(async (threadId: string) => {
    if (!user) return;

    try {
      setMessagesLoading(true);
      
      const { data, error } = await supabase
        .from('private_chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = new Set(data?.map(m => m.sender_id) || []);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', Array.from(senderIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedMessages: PrivateChatMessage[] = (data || []).map(m => ({
        ...m,
        sender: profileMap.get(m.sender_id),
      }));

      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, [user]);

  // Create new thread or get existing one (for 1:1 chats)
  const createOrGetThread = useCallback(async (data: CreateThreadData): Promise<PrivateChatThread | null> => {
    if (!user) return null;

    try {
      // Check if thread already exists between these two users
      const { data: existingThread } = await supabase
        .from('private_chat_threads')
        .select('*')
        .eq('is_group', false)
        .or(
          `and(initiator_id.eq.${user.id},participant_id.eq.${data.participant_id}),and(initiator_id.eq.${data.participant_id},participant_id.eq.${user.id})`
        )
        .neq('status', 'archived')
        .single();

      if (existingThread) {
        // If thread is closed, reopen it
        if (existingThread.status === 'closed') {
          await supabase
            .from('private_chat_threads')
            .update({ status: 'active', closed_at: null, updated_at: new Date().toISOString() })
            .eq('id', existingThread.id);
        }

        // Fetch enriched thread
        await fetchThreads();
        const thread = threads.find(t => t.id === existingThread.id) || {
          ...existingThread,
          status: existingThread.status as 'active' | 'closed' | 'archived',
        };
        
        // Send initial message if provided
        if (data.initial_message) {
          await sendMessage(existingThread.id, data.initial_message);
        }

        return thread;
      }

      // Create new thread
      const { data: newThread, error } = await supabase
        .from('private_chat_threads')
        .insert({
          initiator_id: user.id,
          participant_id: data.participant_id,
          subject: data.subject || null,
          is_group: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Send initial message if provided
      if (data.initial_message && newThread) {
        await sendMessage(newThread.id, data.initial_message);
      }

      // Send notification to the specialist about new thread
      await supabase.from('user_notifications').insert({
        user_id: data.participant_id,
        notification_type: 'private_chat',
        source_module: 'private_chat',
        title: 'Nowa wiadomość prywatna',
        message: data.subject ? `Administrator rozpoczął z Tobą czat: ${data.subject}` : 'Administrator rozpoczął z Tobą nowy czat',
        link: '/my-account?tab=private-chats',
        sender_id: user.id,
      });

      await fetchThreads();
      
      toast({
        title: 'Wątek utworzony',
        description: 'Nowy wątek czatu został utworzony.',
      });

      return {
        ...newThread,
        status: newThread.status as 'active' | 'closed' | 'archived',
      };
    } catch (error) {
      console.error('Error creating thread:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się utworzyć wątku.',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, fetchThreads, threads, toast]);

  // Create group thread with multiple participants
  const createGroupThread = useCallback(async (data: CreateGroupThreadData): Promise<PrivateChatThread | null> => {
    if (!user || data.participant_ids.length < 1) return null;

    try {
      // Create new group thread
      const { data: newThread, error: threadError } = await supabase
        .from('private_chat_threads')
        .insert({
          initiator_id: user.id,
          participant_id: null, // Group chats don't use this field
          subject: data.subject,
          is_group: true,
        })
        .select()
        .single();

      if (threadError) throw threadError;

      // Add all participants to the participants table
      const participantInserts = data.participant_ids.map(userId => ({
        thread_id: newThread.id,
        user_id: userId,
      }));

      const { error: participantsError } = await supabase
        .from('private_chat_participants')
        .insert(participantInserts);

      if (participantsError) throw participantsError;

      // Send initial message if provided
      if (data.initial_message) {
        await sendMessage(newThread.id, data.initial_message);
      }

      // Fetch sender profile for notification
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', user.id)
        .single();

      let senderName = 'Administrator';
      if (senderProfile) {
        const fullName = `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim();
        senderName = fullName || senderProfile.email || 'Administrator';
      }

      // Send notifications to all participants
      const notifications = data.participant_ids.map(participantId => ({
        user_id: participantId,
        notification_type: 'private_chat',
        source_module: 'private_chat',
        title: 'Nowy czat grupowy',
        message: `${senderName} dodał Cię do czatu grupowego: ${data.subject}`,
        link: '/my-account?tab=private-chats',
        sender_id: user.id,
        metadata: {
          thread_id: newThread.id,
          is_group: true,
          participant_count: data.participant_ids.length,
        }
      }));

      await supabase.from('user_notifications').insert(notifications);

      await fetchThreads();
      
      toast({
        title: 'Czat grupowy utworzony',
        description: `Utworzono czat z ${data.participant_ids.length} uczestnikami.`,
      });

      return {
        ...newThread,
        status: newThread.status as 'active' | 'closed' | 'archived',
        is_group: true,
      };
    } catch (error) {
      console.error('Error creating group thread:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się utworzyć czatu grupowego.',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, fetchThreads, toast]);

  // Send message
  const sendMessage = useCallback(async (threadId: string, content: string): Promise<boolean> => {
    if (!user || !content.trim()) return false;

    try {
      const { error } = await supabase
        .from('private_chat_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          content: content.trim(),
        });

      if (error) throw error;

      // Find thread to get recipients
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        // Fetch sender profile for notification title (with email fallback)
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('user_id', user.id)
          .single();

        let senderName = 'Nieznany użytkownik';
        if (senderProfile) {
          const fullName = `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim();
          senderName = fullName || senderProfile.email || 'Nieznany użytkownik';
        }

        // Get all recipients (different logic for group vs 1:1)
        const recipientIds: string[] = [];
        
        if (thread.is_group && thread.participants) {
          // Group chat: notify all participants except sender
          thread.participants
            .filter(p => p.user_id !== user.id)
            .forEach(p => recipientIds.push(p.user_id));
          
          // Also notify initiator if not sender
          if (thread.initiator_id !== user.id) {
            recipientIds.push(thread.initiator_id);
          }
        } else {
          // 1:1 chat: notify the other person
          const recipientId = thread.initiator_id === user.id 
            ? thread.participant_id 
            : thread.initiator_id;
          if (recipientId) recipientIds.push(recipientId);
        }

        // Send notifications to all recipients
        for (const recipientId of recipientIds) {
          // Check if recipient is admin to determine correct notification link
          const { data: recipientRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', recipientId)
            .single();

          const isRecipientAdmin = recipientRole?.role === 'admin';
          const notificationLink = isRecipientAdmin 
            ? '/admin?tab=pure-contacts'
            : '/my-account?tab=private-chats';

          await supabase.from('user_notifications').insert({
            user_id: recipientId,
            notification_type: 'private_chat_message',
            source_module: 'private_chat',
            title: thread.is_group 
              ? `Nowa wiadomość w grupie: ${thread.subject || 'Czat grupowy'}`
              : `Nowa wiadomość od: ${senderName}`,
            message: content.length > 100 ? content.substring(0, 100) + '...' : content,
            link: notificationLink,
            sender_id: user.id,
            metadata: {
              thread_id: threadId,
              sender_name: senderName,
              thread_subject: thread.subject,
              is_group: thread.is_group || false,
            }
          });
        }
      }

      await fetchMessages(threadId);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wysłać wiadomości.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, fetchMessages, threads, toast]);

  // Mark messages as read
  const markAsRead = useCallback(async (threadId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('private_chat_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      // Update local unread count
      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, unread_count: 0 } : t
      ));
      setUnreadCount(prev => Math.max(0, prev - (threads.find(t => t.id === threadId)?.unread_count || 0)));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user, threads]);

  // Update thread status
  const updateThreadStatus = useCallback(async (threadId: string, status: 'active' | 'closed' | 'archived'): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      } else if (status === 'active') {
        updateData.closed_at = null;
      }

      const { error } = await supabase
        .from('private_chat_threads')
        .update(updateData)
        .eq('id', threadId);

      if (error) throw error;

      await fetchThreads();
      
      const statusLabels = {
        active: 'wznowiony',
        closed: 'zamknięty',
        archived: 'zarchiwizowany',
      };
      
      toast({
        title: 'Status zmieniony',
        description: `Wątek został ${statusLabels[status]}.`,
      });

      return true;
    } catch (error) {
      console.error('Error updating thread status:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zmienić statusu wątku.',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchThreads, toast]);

  // Delete thread
  const deleteThread = useCallback(async (threadId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('private_chat_threads')
        .delete()
        .eq('id', threadId);

      if (error) throw error;

      setThreads(prev => prev.filter(t => t.id !== threadId));
      if (selectedThread?.id === threadId) {
        setSelectedThread(null);
        setMessages([]);
      }
      
      toast({
        title: 'Wątek usunięty',
        description: 'Wątek został trwale usunięty.',
      });

      return true;
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć wątku.',
        variant: 'destructive',
      });
      return false;
    }
  }, [selectedThread, toast]);

  // Select thread and fetch its messages
  const selectThread = useCallback(async (thread: PrivateChatThread | null) => {
    setSelectedThread(thread);
    if (thread) {
      await fetchMessages(thread.id);
      await markAsRead(thread.id);
    } else {
      setMessages([]);
    }
  }, [fetchMessages, markAsRead]);

  // Get the other participant (not the current user) - for 1:1 chats
  const getOtherParticipant = useCallback((thread: PrivateChatThread) => {
    if (!user) return thread.participant;
    return thread.initiator_id === user.id ? thread.participant : thread.initiator;
  }, [user]);

  // Get display name for thread (handles both 1:1 and group)
  const getThreadDisplayName = useCallback((thread: PrivateChatThread): string => {
    if (thread.is_group) {
      if (thread.participants && thread.participants.length > 0) {
        const names = thread.participants
          .slice(0, 3)
          .map(p => p.profile?.first_name || p.profile?.email || 'Uczestnik')
          .join(', ');
        if (thread.participants.length > 3) {
          return `${names} +${thread.participants.length - 3}`;
        }
        return names;
      }
      return thread.subject || 'Czat grupowy';
    }
    
    const other = getOtherParticipant(thread);
    return other 
      ? `${other.first_name || ''} ${other.last_name || ''}`.trim() || other.email 
      : 'Nieznany uczestnik';
  }, [getOtherParticipant]);

  // Initial fetch
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Realtime subscription for new messages - ONLY when enableRealtime is true
  useEffect(() => {
    if (!user || !enableRealtime) return;

    let mounted = true;

    const channel = supabase
      .channel(`private-chat-messages-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_chat_messages',
        },
        async (payload) => {
          if (!mounted) return;
          
          const newMessage = payload.new as PrivateChatMessage;
          
          // If message is in currently selected thread, add it
          if (selectedThread && newMessage.thread_id === selectedThread.id) {
            // Fetch sender profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, first_name, last_name, email')
              .eq('user_id', newMessage.sender_id)
              .single();

            if (!mounted) return;
            
            setMessages(prev => [...prev, { ...newMessage, sender: profile || undefined }]);
            
            // Mark as read if not from current user
            if (newMessage.sender_id !== user.id) {
              await markAsRead(newMessage.thread_id);
            }
          }
          
          if (!mounted) return;
          
          // Refresh threads to update last_message_at and unread counts
          await fetchThreads();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, selectedThread, markAsRead, fetchThreads, enableRealtime]);

  return {
    threads,
    messages,
    selectedThread,
    loading,
    messagesLoading,
    unreadCount,
    fetchThreads,
    fetchMessages,
    createOrGetThread,
    createGroupThread,
    sendMessage,
    markAsRead,
    updateThreadStatus,
    deleteThread,
    selectThread,
    getOtherParticipant,
    getThreadDisplayName,
  };
};
