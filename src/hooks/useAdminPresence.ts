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

  useEffect(() => {
    if (!isAdmin || !user) return;

    const channel = supabase.channel('admin-presence', {
      config: { presence: { key: user.id } }
    });
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
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
      if (status === 'SUBSCRIBED') {
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
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [user?.id, isAdmin]);

  const updateActivity = useCallback(async (tab: string) => {
    if (!channelRef.current || !profile) return;
    
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
