import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { globalEditingStateRef } from '@/contexts/EditingContext';
import type { UserNotification } from '@/components/team-contacts/types';


interface UseNotificationsOptions {
  enableRealtime?: boolean;
  enableBrowserNotifications?: boolean;
}

export const useNotifications = (options?: UseNotificationsOptions) => {
  const { user, userRole } = useAuth();
  const currentRole = userRole?.role || 'client';
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const enableRealtime = options?.enableRealtime ?? false;
  const enableBrowserNotifications = options?.enableBrowserNotifications ?? false;
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Browser notifications hook
  const { showNotification, permission } = useBrowserNotifications();
  const { playNotificationSound } = useNotificationSound();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      // Include target_role filtering (consolidated from useRoleNotifications)
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .or(`target_role.is.null,target_role.eq.${currentRole}`)
        .neq('notification_type', 'direct_message')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const notifs = (data || []) as UserNotification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentRole]);

  // Lightweight fetch for just unread count (used in polling)
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const { count, error } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .or(`target_role.is.null,target_role.eq.${currentRole}`)
        .neq('notification_type', 'direct_message');

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user, currentRole]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const sendNotification = async (
    recipientUserId: string,
    notification: {
      notification_type: string;
      source_module: string;
      title: string;
      message: string;
      link?: string;
      metadata?: Record<string, any>;
      related_contact_id?: string;
    }
  ) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: recipientUserId,
          sender_id: user.id,
          ...notification,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [user, fetchNotifications]);

  // Polling for unread count (activity-aware, pauses when tab is hidden).
  // Cadence bez zmian; nie jest już wyłączany przez `enableRealtime`, bo kanał realtime
  // dla tej tabeli był martwy (brak publikacji).
  useEffect(() => {
    if (!user) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }


    // Etap 3: polling jest activity-aware — przy braku realnej aktywności
    // użytkownika przez 15 min przestajemy odpytywać (idle = brak ruchu w sieci).
    const POLL_INTERVAL_MS = 3 * 60 * 1000;
    const ACTIVITY_WINDOW_MS = 15 * 60 * 1000;
    let lastActivity = Date.now();
    const markActivity = () => { lastActivity = Date.now(); };
    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll'];
    activityEvents.forEach(evt =>
      window.addEventListener(evt, markActivity, { passive: true } as AddEventListenerOptions),
    );

    const startPolling = () => {
      // Guard: Don't create duplicate intervals
      if (pollingIntervalRef.current) return;
      
      pollingIntervalRef.current = setInterval(() => {
        if (document.hidden) return;
        if (Date.now() - lastActivity > ACTIVITY_WINDOW_MS) return;
        fetchUnreadCount();
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        markActivity();
        // Skip updates when user is actively editing forms
        if (globalEditingStateRef.current) return;
        
        // Delay fetch when tab becomes visible to avoid disrupting UI during editing
        setTimeout(() => {
          if (!document.hidden && !globalEditingStateRef.current) {
            fetchUnreadCount();
            startPolling();
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start polling only if tab is visible
    if (!document.hidden) {
      startPolling();
    }

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activityEvents.forEach(evt => window.removeEventListener(evt, markActivity));
    };
  }, [user, fetchUnreadCount]);

  // NOTE (Recovery 3A): usunięto martwą subskrypcję realtime na `user_notifications` —
  // tabela nie należy do publikacji `supabase_realtime`, więc kanał nigdy nie otrzymywał
  // zdarzeń. Świeżość zapewnia polling + odświeżenie przy otwarciu listy powiadomień.
  useEffect(() => {
    if (!user || !enableRealtime) return;
    fetchNotifications();
  }, [user, enableRealtime, fetchNotifications]);



  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    sendNotification,
    refetch: fetchNotifications,
  };
};
