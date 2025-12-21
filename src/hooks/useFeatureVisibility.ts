import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FeatureVisibility {
  id: string;
  feature_key: string;
  feature_name: string;
  feature_category: string;
  description: string | null;
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_client: boolean;
  visible_to_specjalista: boolean;
  is_system: boolean;
  position: number;
}

interface FeatureVisibilityHook {
  isVisible: (featureKey: string) => boolean;
  isLoading: boolean;
  features: FeatureVisibility[];
  refetch: () => Promise<void>;
}

// Cache for visibility settings to avoid repeated fetches
let cachedFeatures: FeatureVisibility[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

export const useFeatureVisibility = (): FeatureVisibilityHook => {
  const { userRole, user, isAdmin } = useAuth();
  const [features, setFeatures] = useState<FeatureVisibility[]>(cachedFeatures || []);
  const [isLoading, setIsLoading] = useState(!cachedFeatures);

  const fetchFeatures = useCallback(async () => {
    const now = Date.now();
    
    // Use cache if valid
    if (cachedFeatures && (now - cacheTimestamp) < CACHE_DURATION) {
      setFeatures(cachedFeatures);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('feature_visibility')
        .select('*')
        .order('position');

      if (error) throw error;

      cachedFeatures = data || [];
      cacheTimestamp = now;
      setFeatures(cachedFeatures);
    } catch (error) {
      console.error('Error fetching feature visibility:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();

    // Subscribe to realtime changes for immediate updates
    const channel = supabase
      .channel('feature_visibility_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_visibility' },
        () => {
          // Invalidate cache and refetch
          cachedFeatures = null;
          cacheTimestamp = 0;
          fetchFeatures();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFeatures]);

  const isVisible = useCallback((featureKey: string): boolean => {
    // If still loading, default to false (don't show anything)
    if (isLoading) return false;

    // If no user, check for anonymous visibility (not supported yet, default false)
    if (!user) return false;

    // Admin always sees everything
    if (isAdmin) return true;

    const feature = features.find(f => f.feature_key === featureKey);
    
    // If feature not found in settings, default to visible
    if (!feature) return true;

    // Check based on user role
    const role = userRole?.role?.toLowerCase();
    
    switch (role) {
      case 'admin':
        return feature.visible_to_admin;
      case 'partner':
        return feature.visible_to_partner;
      case 'client':
      case 'user':
        return feature.visible_to_client;
      case 'specjalista':
        return feature.visible_to_specjalista;
      default:
        return false;
    }
  }, [features, userRole, user, isAdmin, isLoading]);

  const refetch = useCallback(async () => {
    cachedFeatures = null;
    cacheTimestamp = 0;
    await fetchFeatures();
  }, [fetchFeatures]);

  return { isVisible, isLoading, features, refetch };
};

// Utility function for invalidating cache externally
export const invalidateFeatureVisibilityCache = () => {
  cachedFeatures = null;
  cacheTimestamp = 0;
};
