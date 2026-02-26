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
  // New delegated permissions
  hasTeamEvents: boolean;
  hasEventRegistrations: boolean;
  hasTeamTrainingMgmt: boolean;
  hasKnowledgeBase: boolean;
  hasTeamNotifications: boolean;
  hasTeamEmails: boolean;
  hasTeamPush: boolean;
  hasTeamContacts: boolean;
  hasTeamContactsMgmt: boolean;
  hasDailySignal: boolean;
  hasImportantInfo: boolean;
  hasTeamReflinks: boolean;
  hasTeamReports: boolean;
  hasCertificates: boolean;
  isAnyLeaderFeatureEnabled: boolean;
  leaderPermission: {
    individual_meetings_enabled?: boolean | null;
    tripartite_meeting_enabled?: boolean | null;
    partner_consultation_enabled?: boolean | null;
    can_view_team_progress?: boolean | null;
    can_view_org_tree?: boolean | null;
    can_host_private_meetings?: boolean | null;
    can_approve_registrations?: boolean | null;
    can_create_team_events?: boolean | null;
    can_manage_event_registrations?: boolean | null;
    can_manage_team_training?: boolean | null;
    can_manage_knowledge_base?: boolean | null;
    can_send_team_notifications?: boolean | null;
    can_send_team_emails?: boolean | null;
    can_send_team_push?: boolean | null;
    can_view_team_contacts?: boolean | null;
    can_manage_team_contacts?: boolean | null;
    can_manage_daily_signal?: boolean | null;
    can_manage_important_info?: boolean | null;
    can_manage_team_reflinks?: boolean | null;
    can_view_team_reports?: boolean | null;
    can_manage_certificates?: boolean | null;
    zoom_link?: string | null;
  } | null;
  loading: boolean;
}

export function useLeaderPermissions(): LeaderPermissionsResult {
  const { user, isPartner, isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['leader-permissions-full', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [leaderPermResult, calcAccessResult, specialistAccessResult] = await Promise.all([
        supabase
          .from('leader_permissions')
          .select('*')
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

      const calcGloballyEnabled = calcSettings?.is_enabled && 
        (isAdmin ? calcSettings.enabled_for_admins : calcSettings.enabled_for_partners);
      const hasInfluencerCalc = !!(calcGloballyEnabled && calcAccess?.has_access === true);

      const specialistGloballyEnabled = specialistSettings?.is_enabled && 
        (isAdmin ? specialistSettings.enabled_for_admins : specialistSettings.enabled_for_partners);
      const hasSpecialistCalc = !!(specialistGloballyEnabled && specialistAccess?.has_access === true);

      // New delegated permissions
      const hasTeamEvents = leaderPerm?.can_create_team_events === true;
      const hasEventRegistrations = leaderPerm?.can_manage_event_registrations === true;
      const hasTeamTrainingMgmt = leaderPerm?.can_manage_team_training === true;
      const hasKnowledgeBase = leaderPerm?.can_manage_knowledge_base === true;
      const hasTeamNotifications = leaderPerm?.can_send_team_notifications === true;
      const hasTeamEmails = leaderPerm?.can_send_team_emails === true;
      const hasTeamPush = leaderPerm?.can_send_team_push === true;
      const hasTeamContacts = leaderPerm?.can_view_team_contacts === true;
      const hasTeamContactsMgmt = leaderPerm?.can_manage_team_contacts === true;
      const hasDailySignal = leaderPerm?.can_manage_daily_signal === true;
      const hasImportantInfo = leaderPerm?.can_manage_important_info === true;
      const hasTeamReflinks = leaderPerm?.can_manage_team_reflinks === true;
      const hasTeamReports = leaderPerm?.can_view_team_reports === true;
      const hasCertificates = leaderPerm?.can_manage_certificates === true;

      return {
        leaderPermission: leaderPerm,
        hasMeetings,
        hasTeamProgress,
        hasInfluencerCalc,
        hasSpecialistCalc,
        hasOrgTree,
        hasApprovalPermission,
        hasTeamEvents,
        hasEventRegistrations,
        hasTeamTrainingMgmt,
        hasKnowledgeBase,
        hasTeamNotifications,
        hasTeamEmails,
        hasTeamPush,
        hasTeamContacts,
        hasTeamContactsMgmt,
        hasDailySignal,
        hasImportantInfo,
        hasTeamReflinks,
        hasTeamReports,
        hasCertificates,
      };
    },
    enabled: !!user && (isPartner || isAdmin),
    staleTime: 2 * 60 * 1000,
  });

  const hasMeetings = data?.hasMeetings ?? false;
  const hasTeamProgress = data?.hasTeamProgress ?? false;
  const hasInfluencerCalc = data?.hasInfluencerCalc ?? false;
  const hasSpecialistCalc = data?.hasSpecialistCalc ?? false;
  const hasOrgTree = data?.hasOrgTree ?? false;
  const hasApprovalPermission = data?.hasApprovalPermission ?? false;
  const hasTeamEvents = data?.hasTeamEvents ?? false;
  const hasEventRegistrations = data?.hasEventRegistrations ?? false;
  const hasTeamTrainingMgmt = data?.hasTeamTrainingMgmt ?? false;
  const hasKnowledgeBase = data?.hasKnowledgeBase ?? false;
  const hasTeamNotifications = data?.hasTeamNotifications ?? false;
  const hasTeamEmails = data?.hasTeamEmails ?? false;
  const hasTeamPush = data?.hasTeamPush ?? false;
  const hasTeamContacts = data?.hasTeamContacts ?? false;
  const hasTeamContactsMgmt = data?.hasTeamContactsMgmt ?? false;
  const hasDailySignal = data?.hasDailySignal ?? false;
  const hasImportantInfo = data?.hasImportantInfo ?? false;
  const hasTeamReflinks = data?.hasTeamReflinks ?? false;
  const hasTeamReports = data?.hasTeamReports ?? false;
  const hasCertificates = data?.hasCertificates ?? false;

  return {
    hasMeetings,
    hasTeamProgress,
    hasInfluencerCalc,
    hasSpecialistCalc,
    hasOrgTree,
    hasApprovalPermission,
    hasTeamEvents,
    hasEventRegistrations,
    hasTeamTrainingMgmt,
    hasKnowledgeBase,
    hasTeamNotifications,
    hasTeamEmails,
    hasTeamPush,
    hasTeamContacts,
    hasTeamContactsMgmt,
    hasDailySignal,
    hasImportantInfo,
    hasTeamReflinks,
    hasTeamReports,
    hasCertificates,
    isAnyLeaderFeatureEnabled:
      hasMeetings || hasTeamProgress || hasInfluencerCalc || hasSpecialistCalc ||
      hasOrgTree || hasApprovalPermission || hasTeamEvents || hasEventRegistrations ||
      hasTeamTrainingMgmt || hasKnowledgeBase || hasTeamNotifications || hasTeamEmails ||
      hasTeamPush || hasTeamContacts || hasTeamContactsMgmt || hasDailySignal ||
      hasImportantInfo || hasTeamReflinks || hasTeamReports || hasCertificates,
    leaderPermission: data?.leaderPermission ?? null,
    loading: isLoading,
  };
}
