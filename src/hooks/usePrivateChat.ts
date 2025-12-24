import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PrivateChatThread, PrivateChatMessage, CreateThreadData } from '@/types/privateChat';
import { useToast } from '@/hooks/use-toast';

export const usePrivateChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<PrivateChatThread[]>([]);
  const [messages, setMessages] = useState<PrivateChatMessage[]>([]);
  const [selectedThread, setSelectedThread] = useState<PrivateChatThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch all threads for current user
  const fetchThreads = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch threads where user is initiator or participant
      const { data: threadsData, error } = await supabase
        .from('private_chat_threads')
        .select('*')
        .or(`initiator_id.eq.${user.id},participant_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Fetch profile data for all participants
      const userIds = new Set<string>();
      threadsData?.forEach(t => {
        userIds.add(t.initiator_id);
        userIds.add(t.participant_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, specialization')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch unread counts
      const threadIds = threadsData?.map(t => t.id) || [];
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

      const enrichedThreads: PrivateChatThread[] = (threadsData || []).map(t => ({
        ...t,
        status: t.status as 'active' | 'closed' | 'archived',
        initiator: profileMap.get(t.initiator_id),
        participant: profileMap.get(t.participant_id),
        unread_count: unreadCounts.get(t.id) || 0,
      }));

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

  // Create new thread or get existing one
  const createOrGetThread = useCallback(async (data: CreateThreadData): Promise<PrivateChatThread | null> => {
    if (!user) return null;

    try {
      // Check if thread already exists between these two users
      const { data: existingThread } = await supabase
        .from('private_chat_threads')
        .select('*')
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

      // Find thread to get recipient id
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        const recipientId = thread.initiator_id === user.id 
          ? thread.participant_id 
          : thread.initiator_id;

        // Send notification to recipient about new message
        await supabase.from('user_notifications').insert({
          user_id: recipientId,
          notification_type: 'private_chat_message',
          source_module: 'private_chat',
          title: 'Nowa wiadomość w czacie',
          message: content.length > 100 ? content.substring(0, 100) + '...' : content,
          link: '/my-account?tab=private-chats',
          sender_id: user.id,
        });
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

  // Get the other participant (not the current user)
  const getOtherParticipant = useCallback((thread: PrivateChatThread) => {
    if (!user) return thread.participant;
    return thread.initiator_id === user.id ? thread.participant : thread.initiator;
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('private-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_chat_messages',
        },
        async (payload) => {
          const newMessage = payload.new as PrivateChatMessage;
          
          // If message is in currently selected thread, add it
          if (selectedThread && newMessage.thread_id === selectedThread.id) {
            // Fetch sender profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, first_name, last_name, email')
              .eq('user_id', newMessage.sender_id)
              .single();

            setMessages(prev => [...prev, { ...newMessage, sender: profile || undefined }]);
            
            // Mark as read if not from current user
            if (newMessage.sender_id !== user.id) {
              await markAsRead(newMessage.thread_id);
            }
          }
          
          // Refresh threads to update last_message_at and unread counts
          await fetchThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedThread, markAsRead, fetchThreads]);

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
    sendMessage,
    markAsRead,
    updateThreadStatus,
    deleteThread,
    selectThread,
    getOtherParticipant,
  };
};
