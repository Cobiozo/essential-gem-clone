import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderAvailability } from '@/hooks/useLeaderAvailability';
import { useToast } from '@/hooks/use-toast';
import { UnifiedMeetingSettingsForm } from '@/components/events/UnifiedMeetingSettingsForm';
import { TeamTrainingProgressView } from '@/components/training/TeamTrainingProgressView';
import { CalendarDays, GraduationCap, Crown, Loader2 } from 'lucide-react';

const LeaderPanel: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { isLeader, leaderPermission, loading: leaderLoading } = useLeaderAvailability();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Read initial tab from URL
  const urlParams = new URLSearchParams(location.search);
  const defaultTab = urlParams.get('tab') || 'meetings';

  // Redirect if not a leader after loading
  useEffect(() => {
    if (!leaderLoading && !authLoading && user && !isLeader) {
      toast({
        title: 'Brak dostępu',
        description: 'Panel Lidera jest dostępny tylko dla liderów z odpowiednimi uprawnieniami.',
        variant: 'destructive',
      });
      navigate('/dashboard', { replace: true });
    }
  }, [isLeader, leaderLoading, authLoading, user, navigate, toast]);

  if (authLoading || leaderLoading) {
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

  if (!isLeader) {
    return null; // Will redirect via useEffect
  }

  const hasMeetings = leaderPermission?.individual_meetings_enabled || false;
  const hasTeamProgress = leaderPermission?.can_view_team_progress || false;

  // Determine active tabs
  const availableTabs = [
    ...(hasMeetings ? ['meetings'] : []),
    ...(hasTeamProgress ? ['team-training'] : []),
  ];

  // If no tabs available, show empty state (shouldn't happen since isLeader would be false)
  if (availableTabs.length === 0) {
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
            Brak aktywnych uprawnień lidera. Skontaktuj się z administratorem.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Find valid default tab
  const resolvedDefaultTab = availableTabs.includes(defaultTab) ? defaultTab : availableTabs[0];

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
          // Single tab — render content directly without tabs
          <>
            {hasMeetings && <UnifiedMeetingSettingsForm />}
            {hasTeamProgress && <TeamTrainingProgressView />}
          </>
        ) : (
          <Tabs defaultValue={resolvedDefaultTab}>
            <TabsList className="mb-6">
              {hasMeetings && (
                <TabsTrigger value="meetings" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Spotkania indywidualne
                </TabsTrigger>
              )}
              {hasTeamProgress && (
                <TabsTrigger value="team-training" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Szkolenia zespołu
                </TabsTrigger>
              )}
            </TabsList>

            {hasMeetings && (
              <TabsContent value="meetings">
                <UnifiedMeetingSettingsForm />
              </TabsContent>
            )}

            {hasTeamProgress && (
              <TabsContent value="team-training">
                <TeamTrainingProgressView />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LeaderPanel;
