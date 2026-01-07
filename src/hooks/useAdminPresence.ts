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

    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // FIXED: Use SHARED channel name for all admins
    const channel = supabase.channel('admin-presence-shared', {
      config: { presence: { key: user.id } }
    });
    channelRef.current = channel;

    const updateAdminList = () => {
      if (!mountedRef.current) return;
      
      const state = channel.presenceState();
      console.log('📡 Presence state:', state);
      
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
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        console.log('📡 Presence sync');
        updateAdminList();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('🟢 Admin joined:', key);
        updateAdminList();
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('🔴 Admin left:', key);
        updateAdminList();
      });

    channel.subscribe(async (status) => {
      console.log('📡 Admin presence status:', status);
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
  }, [user?.id, isAdmin, profile?.first_name]);

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
