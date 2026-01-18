import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types matching exact database schema
export interface CalculatorSettings {
  id: string;
  is_enabled: boolean | null;
  enabled_for_partners: boolean | null;
  enabled_for_clients: boolean | null;
  enabled_for_specjalista: boolean | null;
  enabled_for_admins: boolean | null;
  base_commission_per_client: number | null;
  passive_rate_percentage: number | null;
  passive_months: number | null;
  extension_bonus_per_client: number | null;
  extension_months_count: number | null;
  eur_to_pln_rate: number | null;
  min_followers: number | null;
  max_followers: number | null;
  default_followers: number | null;
  min_conversion: number | null;
  max_conversion: number | null;
  default_conversion: number | null;
  updated_at: string | null;
}

export interface VolumeThreshold {
  id: string;
  threshold_clients: number;
  bonus_amount: number;
  is_active: boolean | null;
  position: number | null;
}

export interface CalculatorUserAccess {
  id: string;
  user_id: string;
  has_access: boolean | null;
  granted_by: string | null;
  granted_at: string | null;
}

export function useCalculatorSettings() {
  return useQuery({
    queryKey: ['calculator-settings'],
    queryFn: async () => {
      const { data: settings, error: settingsError } = await supabase
        .from('calculator_settings')
        .select('*')
        .limit(1)
        .single();

      if (settingsError) throw settingsError;

      const { data: thresholds, error: thresholdsError } = await supabase
        .from('calculator_volume_thresholds')
        .select('*')
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (thresholdsError) throw thresholdsError;

      return {
        settings: settings as CalculatorSettings,
        thresholds: (thresholds || []) as VolumeThreshold[]
      };
    }
  });
}

export function useCalculatorAccess() {
  const { user, userRole } = useAuth();

  return useQuery({
    queryKey: ['calculator-access', user?.id],
    queryFn: async () => {
      if (!user) return { hasAccess: false, reason: 'not_authenticated' };

      const { data: settings, error: settingsError } = await supabase
        .from('calculator_settings')
        .select('is_enabled, enabled_for_partners, enabled_for_clients, enabled_for_specjalista, enabled_for_admins')
        .limit(1)
        .single();

      if (settingsError) {
        console.error('Error fetching calculator settings:', settingsError);
        return { hasAccess: false, reason: 'settings_error' };
      }

      if (!settings.is_enabled) {
        return { hasAccess: false, reason: 'disabled' };
      }

      const role = userRole?.role;

      if (role === 'admin' && settings.enabled_for_admins) {
        return { hasAccess: true, reason: 'admin' };
      }

      const { data: userAccess } = await supabase
        .from('calculator_user_access')
        .select('has_access')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userAccess !== null) {
        return { 
          hasAccess: userAccess.has_access, 
          reason: userAccess.has_access ? 'user_granted' : 'user_revoked' 
        };
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

export function useUpdateCalculatorSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<CalculatorSettings>) => {
      // Get the settings ID - either from updates or fetch it
      let settingsId = updates.id;
      
      if (!settingsId) {
        const { data: existing } = await supabase
          .from('calculator_settings')
          .select('id')
          .limit(1)
          .single();
        
        if (!existing?.id) throw new Error('No settings found');
        settingsId = existing.id;
      }

      const { data, error } = await supabase
        .from('calculator_settings')
        .update(updates)
        .eq('id', settingsId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculator-settings'] });
      queryClient.invalidateQueries({ queryKey: ['calculator-access'] });
    }
  });
}

export function useUpdateVolumeThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VolumeThreshold> & { id: string }) => {
      const { data, error } = await supabase
        .from('calculator_volume_thresholds')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculator-settings'] });
    }
  });
}

export function useCreateVolumeThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threshold: { threshold_clients: number; bonus_amount: number; position: number }) => {
      const { data, error } = await supabase
        .from('calculator_volume_thresholds')
        .insert({ ...threshold, is_active: true })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculator-settings'] });
    }
  });
}

export function useDeleteVolumeThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('calculator_volume_thresholds')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculator-settings'] });
    }
  });
}

export function useCalculatorUserAccess() {
  const queryClient = useQueryClient();

  const searchUsers = async (searchTerm: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) throw error;
    return data;
  };

  const getUserAccess = async () => {
    const { data, error } = await supabase
      .from('calculator_user_access')
      .select(`*, profiles:user_id (id, first_name, last_name, email)`)
      .order('granted_at', { ascending: false });

    if (error) throw error;
    return data;
  };

  const grantAccess = useMutation({
    mutationFn: async ({ userId, grantedBy }: { userId: string; grantedBy: string }) => {
      const { data, error } = await supabase
        .from('calculator_user_access')
        .upsert({ user_id: userId, has_access: true, granted_by: grantedBy }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculator-user-access'] });
    }
  });

  const revokeAccess = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('calculator_user_access')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculator-user-access'] });
    }
  });

  return { searchUsers, getUserAccess, grantAccess, revokeAccess };
}
