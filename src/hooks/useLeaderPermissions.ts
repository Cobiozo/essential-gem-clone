import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LeaderPermissionsResult {
  hasMeetings: boolean;
  hasTeamProgress: boolean;
  hasInfluencerCalc: boolean;
  hasSpecialistCalc: boolean;
  hasOrgTree: boolean;
  hasApprovalPermission: boolean;
  isAnyLeaderFeatureEnabled: boolean;
  leaderPermission: {
    individual_meetings_enabled?: boolean | null;
    tripartite_meeting_enabled?: boolean | null;
    partner_consultation_enabled?: boolean | null;
    can_view_team_progress?: boolean | null;
    can_view_org_tree?: boolean | null;
    can_host_private_meetings?: boolean | null;
    can_approve_registrations?: boolean | null;
    zoom_link?: string | null;
  } | null;
  loading: boolean;
}

export function useLeaderPermissions(): LeaderPermissionsResult {
  const { user, isPartner, isAdmin } = useAuth();

  const isPartnerBool = Boolean(isPartner);
  const isAdminBool = Boolean(isAdmin);

  const { data, isLoading } = useQuery({
    queryKey: ['leader-permissions-full', user?.id, isPartnerBool, isAdminBool],
    queryFn: async () => {
      if (!user) return null;

      // Fetch all three sources in parallel
      const [leaderPermResult, calcAccessResult, specialistAccessResult] = await Promise.all([
        supabase
          .from('leader_permissions')
          .select('individual_meetings_enabled, tripartite_meeting_enabled, partner_consultation_enabled, can_view_team_progress, can_view_org_tree, can_host_private_meetings, can_approve_registrations, zoom_link')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('calculator_user_access')
          .select('has_access')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('specialist_calculator_user_access')
          .select('has_access')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      // Check calculator settings (if calculators are globally enabled)
      const [calcSettingsResult, specialistSettingsResult] = await Promise.all([
        supabase
          .from('calculator_settings')
          .select('is_enabled, enabled_for_partners, enabled_for_admins')
          .limit(1)
          .maybeSingle(),
        supabase
          .from('specialist_calculator_settings')
          .select('is_enabled, enabled_for_partners, enabled_for_admins')
          .limit(1)
          .maybeSingle(),
      ]);

      const leaderPerm = leaderPermResult.data;
      const calcAccess = calcAccessResult.data;
      const specialistAccess = specialistAccessResult.data;
      const calcSettings = calcSettingsResult.data;
      const specialistSettings = specialistSettingsResult.data;

      const hasMeetings = leaderPerm?.individual_meetings_enabled === true;
      const hasTeamProgress = leaderPerm?.can_view_team_progress === true;
      const hasOrgTree = leaderPerm?.can_view_org_tree === true;
      const hasApprovalPermission = leaderPerm?.can_approve_registrations === true;

      // Influencer calc: enabled globally for partners AND user has access
      const calcGloballyEnabled = calcSettings?.is_enabled && 
        (isAdminBool ? calcSettings.enabled_for_admins : calcSettings.enabled_for_partners);
      const hasInfluencerCalc = !!(calcGloballyEnabled && calcAccess?.has_access === true);

      // Specialist calc: enabled globally for partners AND user has access
      const specialistGloballyEnabled = specialistSettings?.is_enabled && 
        (isAdminBool ? specialistSettings.enabled_for_admins : specialistSettings.enabled_for_partners);
      const hasSpecialistCalc = !!(specialistGloballyEnabled && specialistAccess?.has_access === true);

      return {
        leaderPermission: leaderPerm,
        hasMeetings,
        hasTeamProgress,
        hasInfluencerCalc,
        hasSpecialistCalc,
        hasOrgTree,
        hasApprovalPermission,
      };
    },
    enabled: !!user?.id && (isPartnerBool || isAdminBool),
    staleTime: 2 * 60 * 1000,
  });

  const hasMeetings = data?.hasMeetings ?? false;
  const hasTeamProgress = data?.hasTeamProgress ?? false;
  const hasInfluencerCalc = data?.hasInfluencerCalc ?? false;
  const hasSpecialistCalc = data?.hasSpecialistCalc ?? false;
  const hasOrgTree = data?.hasOrgTree ?? false;
  const hasApprovalPermission = data?.hasApprovalPermission ?? false;

  return {
    hasMeetings,
    hasTeamProgress,
    hasInfluencerCalc,
    hasSpecialistCalc,
    hasOrgTree,
    hasApprovalPermission,
    isAnyLeaderFeatureEnabled: hasMeetings || hasTeamProgress || hasInfluencerCalc || hasSpecialistCalc || hasOrgTree || hasApprovalPermission,
    leaderPermission: data?.leaderPermission ?? null,
    loading: isLoading,
  };
}
