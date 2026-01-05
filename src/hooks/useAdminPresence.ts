import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminPresence {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  activeTab: string;
  lastActivity: string;
  isActive: boolean;
}

export const useAdminPresence = (currentTab: string) => {
  const { user, profile, isAdmin } = useAuth();
  const [admins, setAdmins] = useState<AdminPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!isAdmin || !user) return;
    
    mountedRef.current = true;

    // Cleanup previous channel first to prevent leaks
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Use dynamic channel name to prevent collisions on remount
    const channel = supabase.channel(`admin-presence-${user.id}-${Date.now()}`, {
      config: { presence: { key: user.id } }
    });
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      if (!mountedRef.current) return;
      
      const state = channel.presenceState();
      const adminList = Object.entries(state).map(([key, presences]) => {
        const p = (presences as any[])[0];
        const lastActivityTime = new Date(p?.lastActivity || Date.now()).getTime();
        return {
          userId: key,
          firstName: p?.firstName || 'Admin',
          lastName: p?.lastName || '',
          email: p?.email || '',
          activeTab: p?.activeTab || 'unknown',
          lastActivity: p?.lastActivity || new Date().toISOString(),
          isActive: Date.now() - lastActivityTime < 30000
        };
      }).filter(a => a.userId !== user.id);
      
      setAdmins(adminList);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && mountedRef.current) {
        setIsConnected(true);
        await channel.track({
          firstName: profile?.first_name || 'Admin',
          lastName: profile?.last_name || '',
          email: profile?.email || '',
          activeTab: currentTab,
          lastActivity: new Date().toISOString()
        });
      }
    });

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [user?.id, isAdmin]);

  const updateActivity = useCallback(async (tab: string) => {
    if (!channelRef.current || !profile || !mountedRef.current) return;
    
    try {
      await channelRef.current.track({
        firstName: profile.first_name || 'Admin',
        lastName: profile.last_name || '',
        email: profile.email || '',
        activeTab: tab,
        lastActivity: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating admin presence:', error);
    }
  }, [profile]);

  return { admins, isConnected, updateActivity };
};
