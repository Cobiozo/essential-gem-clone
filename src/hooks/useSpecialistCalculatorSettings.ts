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
