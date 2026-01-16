import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPresence {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  currentPage: string;
  lastActivity: string;
  isActive: boolean;
}

export interface UserPresenceStats {
  total: number;
  byRole: {
    admin: number;
    partner: number;
    specjalista: number;
    client: number;
  };
}

export const useUserPresence = (currentPage: string = 'dashboard') => {
  const { user, profile, userRole } = useAuth();
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [currentUserPresence, setCurrentUserPresence] = useState<UserPresence | null>(null);
  const [stats, setStats] = useState<UserPresenceStats>({
    total: 0,
    byRole: { admin: 0, partner: 0, specjalista: 0, client: 0 }
  });
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;
    
    mountedRef.current = true;

    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Shared channel for ALL users
    const channel = supabase.channel('user-presence-shared', {
      config: { presence: { key: user.id } }
    });
    channelRef.current = channel;

    const updateUserList = () => {
      if (!mountedRef.current) return;
      
      // Throttle updates to max once per second
      const now = Date.now();
      if (now - lastUpdateRef.current < 1000) return;
      lastUpdateRef.current = now;
      
      const state = channel.presenceState();
      
      const userList = Object.entries(state).map(([key, presences]) => {
        // Sort by lastActivity descending to get the newest session first
        const sortedPresences = (presences as any[]).sort((a, b) => {
          const timeA = new Date(a.lastActivity || 0).getTime();
          const timeB = new Date(b.lastActivity || 0).getTime();
          return timeB - timeA;
        });
        const p = sortedPresences[0];
        const lastActivityTime = new Date(p?.lastActivity || Date.now()).getTime();
        return {
          userId: key,
          firstName: p?.firstName || '',
          lastName: p?.lastName || '',
          email: p?.email || '',
          role: p?.role || 'client',
          currentPage: p?.currentPage || 'unknown',
          lastActivity: p?.lastActivity || new Date().toISOString(),
          isActive: Date.now() - lastActivityTime < 60000 // 1 minute threshold
        };
      });
      
      // Separate current user from other users
      const myPresence = userList.find(u => u.userId === user.id);
      const otherUsers = userList.filter(u => u.userId !== user.id);
      
      setCurrentUserPresence(myPresence || null);
      setUsers(otherUsers);
      
      // Calculate stats
      const allUsers = userList.filter(u => u.isActive);
      const newStats: UserPresenceStats = {
        total: allUsers.length,
        byRole: {
          admin: allUsers.filter(u => u.role === 'admin').length,
          partner: allUsers.filter(u => u.role === 'partner').length,
          specjalista: allUsers.filter(u => u.role === 'specjalista').length,
          client: allUsers.filter(u => u.role === 'client').length,
        }
      };
      setStats(newStats);
    };

    channel
      .on('presence', { event: 'sync' }, updateUserList)
      .on('presence', { event: 'join' }, updateUserList)
      .on('presence', { event: 'leave' }, updateUserList);

    channel.subscribe(async (status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('❌ User presence channel error, retrying...');
        setIsConnected(false);
        setTimeout(() => {
          if (mountedRef.current && channelRef.current) {
            channel.subscribe();
          }
        }, 3000);
        return;
      }
      
      if (status === 'SUBSCRIBED' && mountedRef.current) {
        setIsConnected(true);
        await channel.track({
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          email: profile?.email || '',
          role: userRole?.role || 'client',
          currentPage,
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
  }, [user?.id, profile?.first_name, userRole?.role]);

  const updateActivity = useCallback(async (page: string) => {
    if (!channelRef.current || !profile || !mountedRef.current) return;
    
    try {
      await channelRef.current.track({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email || '',
        role: userRole?.role || 'client',
        currentPage: page,
        lastActivity: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating user presence:', error);
    }
  }, [profile, userRole?.role]);

  return { users, currentUserPresence, stats, isConnected, updateActivity };
};
