import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { UserNotification } from '@/components/team-contacts/types';
import type { Json } from '@/integrations/supabase/types';

export const useRoleNotifications = () => {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const userRole = profile?.role || 'client';

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch notifications for this user, filtered by role if target_role is set
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .or(`target_role.is.null,target_role.eq.${userRole}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifs = (data || []) as UserNotification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching role notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

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

  const sendRoleNotification = async (
    recipientUserId: string,
    targetRole: string,
    notification: {
      notification_type: string;
      source_module: string;
      title: string;
      message: string;
      link?: string;
      metadata?: Json;
    }
  ) => {
    if (!user) return false;

    try {
      const insertData: {
        user_id: string;
        sender_id: string;
        target_role: string;
        notification_type: string;
        source_module: string;
        title: string;
        message: string;
        link: string | null;
        metadata: Json;
      } = {
        user_id: recipientUserId,
        sender_id: user.id,
        target_role: targetRole,
        notification_type: notification.notification_type,
        source_module: notification.source_module,
        title: notification.title,
        message: notification.message,
        link: notification.link || null,
        metadata: (notification.metadata || {}) as Json,
      };

      const { error } = await supabase
        .from('user_notifications')
        .insert([insertData]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending role notification:', error);
      return false;
    }
  };

  // Setup realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel('role-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as UserNotification & { target_role?: string };
          // Only add if no target_role or matches user's role
          if (!newNotification.target_role || newNotification.target_role === userRole) {
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    userRole,
    markAsRead,
    markAllAsRead,
    sendRoleNotification,
    refetch: fetchNotifications,
  };
};
