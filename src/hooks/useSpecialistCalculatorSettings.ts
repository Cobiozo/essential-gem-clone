import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SpecialistCalculatorSettings {
  id: string;
  is_enabled: boolean | null;
  enabled_for_partners: boolean | null;
  enabled_for_clients: boolean | null;
  enabled_for_specjalista: boolean | null;
  enabled_for_admins: boolean | null;
  base_commission_eur: number | null;
  passive_per_month_eur: number | null;
  passive_months: number | null;
  retention_bonus_eur: number | null;
  retention_months_count: number | null;
  eur_to_pln_rate: number | null;
  min_clients: number | null;
  max_clients: number | null;
  default_clients: number | null;
  updated_at: string | null;
}

export interface SpecialistVolumeThreshold {
  id: string;
  threshold_clients: number;
  bonus_amount: number;
  is_active: boolean | null;
  position: number | null;
}

export function useSpecialistCalculatorSettings() {
  return useQuery({
    queryKey: ['specialist-calculator-settings'],
    queryFn: async () => {
      const { data: settings, error: settingsError } = await supabase
        .from('specialist_calculator_settings')
        .select('*')
        .limit(1)
        .single();

      if (settingsError) throw settingsError;

      const { data: thresholds, error: thresholdsError } = await supabase
        .from('specialist_volume_thresholds')
        .select('*')
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (thresholdsError) throw thresholdsError;

      return {
        settings: settings as SpecialistCalculatorSettings,
        thresholds: (thresholds || []) as SpecialistVolumeThreshold[]
      };
    }
  });
}

export interface SpecialistCalculatorUserAccess {
  id: string;
  user_id: string;
  has_access: boolean;
  granted_by: string | null;
  granted_at: string;
  profiles?: {
    id: string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export function useSpecialistCalculatorAccess() {
  const { user, userRole } = useAuth();

  return useQuery({
    queryKey: ['specialist-calculator-access', user?.id],
    queryFn: async () => {
      if (!user) return { hasAccess: false, reason: 'not_authenticated' };

      const { data: settings, error: settingsError } = await supabase
        .from('specialist_calculator_settings')
        .select('is_enabled, enabled_for_partners, enabled_for_clients, enabled_for_specjalista, enabled_for_admins')
        .limit(1)
        .single();

      if (settingsError) {
        console.error('Error fetching specialist calculator settings:', settingsError);
        return { hasAccess: false, reason: 'settings_error' };
      }

      if (!settings.is_enabled) {
        return { hasAccess: false, reason: 'disabled' };
      }

      // Check individual user access first
      const { data: userAccess } = await supabase
        .from('specialist_calculator_user_access')
        .select('has_access')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userAccess !== null) {
        return { 
          hasAccess: userAccess.has_access, 
          reason: userAccess.has_access ? 'user_granted' : 'user_revoked' 
        };
      }

      const role = userRole?.role;

      if (role === 'admin' && settings.enabled_for_admins) {
        return { hasAccess: true, reason: 'admin' };
      }
      if (role === 'partner' && settings.enabled_for_partners) {
        return { hasAccess: true, reason: 'role_partner' };
      }
      if (role === 'client' && settings.enabled_for_clients) {
        return { hasAccess: true, reason: 'role_client' };
      }
      if (role === 'specjalista' && settings.enabled_for_specjalista) {
        return { hasAccess: true, reason: 'role_specjalista' };
      }

      return { hasAccess: false, reason: 'no_access' };
    },
    enabled: !!user
  });
}

export function useSpecialistCalculatorUserAccess() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) throw error;
    // Map user_id to id for component compatibility
    return (data || []).map(user => ({
      id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email
    }));
  };

  const getUserAccess = async (): Promise<SpecialistCalculatorUserAccess[]> => {
    const { data, error } = await supabase
      .from('specialist_calculator_user_access')
      .select(`
        id,
        user_id,
        has_access,
        granted_by,
        granted_at
      `)
      .order('granted_at', { ascending: false });

    if (error) throw error;
    
    // Fetch profiles separately to avoid RLS issues
    const userIds = (data || []).map(d => d.user_id);
    if (userIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    
    return (data || []).map(access => {
      const profile = profileMap.get(access.user_id);
      return {
        ...access,
        profiles: profile ? {
          id: profile.user_id, // Map user_id to id for compatibility
          user_id: profile.user_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email
        } : undefined
      };
    });
  };

  const grantAccess = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from('specialist_calculator_user_access')
        .upsert({
          user_id: userId,
          has_access: true,
          granted_by: user?.id
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialist-calculator-user-access'] });
      queryClient.invalidateQueries({ queryKey: ['specialist-calculator-access'] });
    }
  });

  const revokeAccess = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('specialist_calculator_user_access')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialist-calculator-user-access'] });
      queryClient.invalidateQueries({ queryKey: ['specialist-calculator-access'] });
    }
  });

  return { searchUsers, getUserAccess, grantAccess, revokeAccess };
}

export function useUpdateSpecialistCalculatorSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<SpecialistCalculatorSettings>) => {
      // Get the settings ID - either from updates or fetch it
      let settingsId = updates.id;
      
      if (!settingsId) {
        const { data: existing } = await supabase
          .from('specialist_calculator_settings')
          .select('id')
          .limit(1)
          .single();
        
        if (!existing?.id) throw new Error('No settings found');
        settingsId = existing.id;
      }

      const { data, error } = await supabase
        .from('specialist_calculator_settings')
        .update(updates)
        .eq('id', settingsId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialist-calculator-settings'] });
      queryClient.invalidateQueries({ queryKey: ['specialist-calculator-access'] });
    }
  });
}

export function useUpdateSpecialistVolumeThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SpecialistVolumeThreshold> & { id: string }) => {
      const { data, error } = await supabase
        .from('specialist_volume_thresholds')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialist-calculator-settings'] });
    }
  });
}

export function useCreateSpecialistVolumeThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threshold: { threshold_clients: number; bonus_amount: number; position: number }) => {
      const { data, error } = await supabase
        .from('specialist_volume_thresholds')
        .insert({ ...threshold, is_active: true })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialist-calculator-settings'] });
    }
  });
}

export function useDeleteSpecialistVolumeThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('specialist_volume_thresholds')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialist-calculator-settings'] });
    }
  });
}
