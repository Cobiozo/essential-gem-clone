import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatPermission {
  id: string;
  sender_role: string;
  target_role: string;
  is_enabled: boolean;
  allow_individual: boolean;
  allow_group: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const useChatPermissions = () => {
  const { user, userRole } = useAuth();
  const [permissions, setPermissions] = useState<ChatPermission[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentRole = userRole?.role?.toLowerCase() || 'client';

  const fetchPermissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_permissions')
        .select('*')
        .order('sender_role', { ascending: true });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching chat permissions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Check if current user can message a target role
  const canMessageRole = useCallback((targetRole: string): boolean => {
    if (currentRole === 'admin') return true;
    
    const permission = permissions.find(
      p => p.sender_role === currentRole && p.target_role === targetRole
    );
    return permission?.is_enabled ?? false;
  }, [currentRole, permissions]);

  // Get all roles that current user can message
  const getTargetRoles = useCallback((): string[] => {
    if (currentRole === 'admin') {
      return ['admin', 'partner', 'specjalista', 'client'];
    }
    
    return permissions
      .filter(p => p.sender_role === currentRole && p.is_enabled)
      .map(p => p.target_role);
  }, [currentRole, permissions]);

  // Check if user can send individual messages to a role
  const canSendIndividual = useCallback((targetRole: string): boolean => {
    if (currentRole === 'admin') return true;
    
    const permission = permissions.find(
      p => p.sender_role === currentRole && p.target_role === targetRole
    );
    return permission?.is_enabled && permission?.allow_individual;
  }, [currentRole, permissions]);

  // Check if user can send group messages to a role
  const canSendGroup = useCallback((targetRole: string): boolean => {
    if (currentRole === 'admin') return true;
    
    const permission = permissions.find(
      p => p.sender_role === currentRole && p.target_role === targetRole
    );
    return permission?.is_enabled && permission?.allow_group;
  }, [currentRole, permissions]);

  // Update a permission (admin only)
  const updatePermission = async (id: string, updates: Partial<ChatPermission>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chat_permissions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchPermissions();
      return true;
    } catch (error) {
      console.error('Error updating permission:', error);
      return false;
    }
  };

  return {
    permissions,
    loading,
    currentRole,
    canMessageRole,
    getTargetRoles,
    canSendIndividual,
    canSendGroup,
    updatePermission,
    refetch: fetchPermissions,
  };
};
