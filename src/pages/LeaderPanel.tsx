import React, { lazy, Suspense } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderPermissions } from '@/hooks/useLeaderPermissions';
import { useToast } from '@/hooks/use-toast';
import { UnifiedMeetingSettingsForm } from '@/components/events/UnifiedMeetingSettingsForm';
import { TeamTrainingProgressView } from '@/components/training/TeamTrainingProgressView';
import { CalendarDays, GraduationCap, Crown, Loader2, Calculator, UserRound, TreePine } from 'lucide-react';
import { CommissionCalculator } from '@/components/calculator';
import { SpecialistCalculator } from '@/components/specialist-calculator';

const LeaderOrgTreeView = lazy(() => import('@/components/leader/LeaderOrgTreeView'));

const LeaderPanel: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const {
    hasMeetings,
    hasTeamProgress,
    hasInfluencerCalc,
    hasSpecialistCalc,
    hasOrgTree,
    isAnyLeaderFeatureEnabled,
    loading: permLoading,
  } = useLeaderPermissions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);
  const defaultTab = urlParams.get('tab') || '';

  const isLoading = authLoading || permLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAnyLeaderFeatureEnabled) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <div className="flex items-center gap-3 mb-6">
            <Crown className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Panel Lidera</h1>
              <p className="text-muted-foreground text-sm">Narzędzia i statystyki Twojej struktury</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            Brak aktywnych uprawnień. Skontaktuj się z administratorem.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Build available tabs dynamically
  const availableTabs = [
    ...(hasMeetings ? [{ id: 'meetings', label: 'Spotkania indywidualne', icon: CalendarDays }] : []),
    ...(hasTeamProgress ? [{ id: 'training', label: 'Szkolenia zespołu', icon: GraduationCap }] : []),
    ...(hasInfluencerCalc ? [{ id: 'calc-inf', label: 'Kalkulator Influencerów', icon: Calculator }] : []),
    ...(hasSpecialistCalc ? [{ id: 'calc-spec', label: 'Kalkulator Specjalistów', icon: UserRound }] : []),
    ...(hasOrgTree ? [{ id: 'org-tree', label: 'Moja struktura', icon: TreePine }] : []),
  ];

  const resolvedDefaultTab = availableTabs.find(t => t.id === defaultTab)?.id ?? availableTabs[0]?.id ?? '';

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Crown className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Panel Lidera</h1>
            <p className="text-muted-foreground text-sm">Narzędzia i statystyki Twojej struktury</p>
          </div>
        </div>

        {availableTabs.length === 1 ? (
          // Single tab — render content directly
          <>
            {hasMeetings && <UnifiedMeetingSettingsForm />}
            {hasTeamProgress && <TeamTrainingProgressView />}
            {hasInfluencerCalc && <CommissionCalculator />}
            {hasSpecialistCalc && <SpecialistCalculator />}
            {hasOrgTree && (
              <Suspense fallback={<div className="flex justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <LeaderOrgTreeView />
              </Suspense>
            )}
          </>
        ) : (
          <Tabs defaultValue={resolvedDefaultTab}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              {availableTabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {hasMeetings && (
              <TabsContent value="meetings">
                <UnifiedMeetingSettingsForm />
              </TabsContent>
            )}

            {hasTeamProgress && (
              <TabsContent value="training">
                <TeamTrainingProgressView />
              </TabsContent>
            )}

            {hasInfluencerCalc && (
              <TabsContent value="calc-inf">
                <CommissionCalculator />
              </TabsContent>
            )}

            {hasSpecialistCalc && (
              <TabsContent value="calc-spec">
                <SpecialistCalculator />
              </TabsContent>
            )}

            {hasOrgTree && (
              <TabsContent value="org-tree">
                <Suspense fallback={<div className="flex justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <LeaderOrgTreeView />
                </Suspense>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LeaderPanel;
