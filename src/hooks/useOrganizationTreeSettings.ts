import { useState, useEffect, useCallback, useRef } from 'react';
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
  const userRoleStr = userRole?.role ?? null; // prymityw string — stabilna referencja

  // Ref przechowujący aktualne settings — pozwala unikać settings w tablicach deps
  const settingsRef = useRef<OrganizationTreeSettings | null>(null);
  // Blokuje równoległe wywołania fetchSettings
  const isFetchingRef = useRef(false);

  const fetchSettings = useCallback(async (force = false) => {
    if (isFetchingRef.current && !force) return;
    isFetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('organization_tree_settings')
        .select('*')
        .limit(1)
        .single();

      if (fetchError || !data) {
        console.warn('Organization tree settings not found, using defaults:', fetchError?.message);
        const defaults = {
          id: 'default',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...DEFAULT_SETTINGS,
        } as OrganizationTreeSettings;
        settingsRef.current = defaults;
        setSettings(defaults);
        return;
      }

      settingsRef.current = data as OrganizationTreeSettings;
      setSettings(data as OrganizationTreeSettings);
    } catch (err) {
      console.error('Error:', err);
      setError('Nie udało się pobrać ustawień');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []); // Puste deps — fetchSettings ma stabilną referencję

  const updateSettings = async (updates: Partial<OrganizationTreeSettings>) => {
    const current = settingsRef.current;
    if (!current) return { success: false, error: 'Brak ustawień' };
    
    try {
      const { error: updateError } = await supabase
        .from('organization_tree_settings')
        .update(updates)
        .eq('id', current.id);

      if (updateError) {
        console.error('Error updating settings:', updateError);
        return { success: false, error: updateError.message };
      }

      const updated = { ...current, ...updates };
      settingsRef.current = updated;
      setSettings(updated);
      return { success: true, error: null };
    } catch (err) {
      console.error('Error:', err);
      return { success: false, error: 'Nie udało się zapisać ustawień' };
    }
  };

  // Check if user can access the organization tree
  // Zależy tylko od userRoleStr (prymityw) — settings czyta z ref (nie state)
  const canAccessTree = useCallback((): boolean => {
    const s = settingsRef.current;
    if (!s || !s.is_enabled) return false;
    if (!userRoleStr) return false;
    
    if (userRoleStr === 'admin') return true;
    if (userRoleStr === 'partner' && s.visible_to_partners) return true;
    if (userRoleStr === 'specjalista' && s.visible_to_specjalista) return true;
    if (userRoleStr === 'client' && s.visible_to_clients) return true;
    
    return false;
  }, [userRoleStr]); // Tylko userRoleStr — settings jest w settingsRef (stabilny)

  // Get max depth for current user's role
  const getMaxDepthForRole = useCallback((): number => {
    const s = settingsRef.current;
    if (!s) return 0;
    if (!userRoleStr) return 0;
    
    if (userRoleStr === 'admin') return s.max_depth;
    if (userRoleStr === 'partner') return s.partner_max_depth;
    if (userRoleStr === 'specjalista') return s.specjalista_max_depth;
    if (userRoleStr === 'client') return s.client_max_depth;
    
    return 0;
  }, [userRoleStr]); // Tylko userRoleStr — settings jest w settingsRef (stabilny)

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]); // fetchSettings jest stabilna (useCallback([]))

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: () => fetchSettings(true), // force=true omija blokadę isFetchingRef
    canAccessTree,
    getMaxDepthForRole,
  };
};
