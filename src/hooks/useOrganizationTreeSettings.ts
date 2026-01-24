import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OrganizationTreeSettings {
  id: string;
  is_enabled: boolean;
  max_depth: number;
  default_view: 'list' | 'graph';
  
  // Widoczność funkcji per rola
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  
  // Widoczność danych w węzłach
  show_eq_id: boolean;
  show_email: boolean;
  show_phone: boolean;
  show_role_badge: boolean;
  show_avatar: boolean;
  show_upline: boolean;
  show_statistics: boolean;
  
  // Ustawienia grafu
  graph_node_size: 'small' | 'medium' | 'large';
  graph_show_lines: boolean;
  graph_expandable: boolean;
  
  // Limity głębokości per rola
  client_max_depth: number;
  partner_max_depth: number;
  specjalista_max_depth: number;
  
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<OrganizationTreeSettings, 'id' | 'created_at' | 'updated_at'> = {
  is_enabled: true,
  max_depth: 10,
  default_view: 'list',
  visible_to_clients: false,
  visible_to_partners: true,
  visible_to_specjalista: true,
  show_eq_id: false,
  show_email: false,
  show_phone: false,
  show_role_badge: true,
  show_avatar: true,
  show_upline: true,
  show_statistics: true,
  graph_node_size: 'medium',
  graph_show_lines: true,
  graph_expandable: true,
  client_max_depth: 0,
  partner_max_depth: 10,
  specjalista_max_depth: 5,
};

export const useOrganizationTreeSettings = () => {
  const [settings, setSettings] = useState<OrganizationTreeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userRole } = useAuth();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('organization_tree_settings')
        .select('*')
        .limit(1)
        .single();

      if (fetchError) {
        console.error('Error fetching organization tree settings:', fetchError);
        setError(fetchError.message);
        return;
      }

      setSettings(data as OrganizationTreeSettings);
    } catch (err) {
      console.error('Error:', err);
      setError('Nie udało się pobrać ustawień');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<OrganizationTreeSettings>) => {
    if (!settings) return { success: false, error: 'Brak ustawień' };
    
    try {
      const { error: updateError } = await supabase
        .from('organization_tree_settings')
        .update(updates)
        .eq('id', settings.id);

      if (updateError) {
        console.error('Error updating settings:', updateError);
        return { success: false, error: updateError.message };
      }

      setSettings({ ...settings, ...updates });
      return { success: true, error: null };
    } catch (err) {
      console.error('Error:', err);
      return { success: false, error: 'Nie udało się zapisać ustawień' };
    }
  };

  // Check if user can access the organization tree
  const canAccessTree = (): boolean => {
    if (!settings || !settings.is_enabled) return false;
    
    const role = userRole?.role;
    if (!role) return false;
    
    if (role === 'admin') return true;
    if (role === 'partner' && settings.visible_to_partners) return true;
    if (role === 'specjalista' && settings.visible_to_specjalista) return true;
    if (role === 'client' && settings.visible_to_clients) return true;
    
    return false;
  };

  // Get max depth for current user's role
  const getMaxDepthForRole = (): number => {
    if (!settings) return 0;
    
    const role = userRole?.role;
    if (!role) return 0;
    
    if (role === 'admin') return settings.max_depth;
    if (role === 'partner') return settings.partner_max_depth;
    if (role === 'specjalista') return settings.specjalista_max_depth;
    if (role === 'client') return settings.client_max_depth;
    
    return 0;
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings,
    canAccessTree,
    getMaxDepthForRole,
  };
};
