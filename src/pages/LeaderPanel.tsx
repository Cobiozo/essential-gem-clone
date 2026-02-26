import React, { lazy, Suspense, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderPermissions } from '@/hooks/useLeaderPermissions';
import { useLeaderApprovals } from '@/hooks/useLeaderApprovals';
import { useLeaderTeam } from '@/hooks/useLeaderTeam';
import { useToast } from '@/hooks/use-toast';
import { UnifiedMeetingSettingsForm } from '@/components/events/UnifiedMeetingSettingsForm';
import { TeamTrainingProgressView } from '@/components/training/TeamTrainingProgressView';
import { CalendarDays, GraduationCap, Crown, Loader2, Calculator, UserRound, TreePine, UserCheck, Users, Pencil } from 'lucide-react';
import { CommissionCalculator } from '@/components/calculator';
import { SpecialistCalculator } from '@/components/specialist-calculator';
import { LeaderApprovalView } from '@/components/leader/LeaderApprovalView';

const LeaderOrgTreeView = lazy(() => import('@/components/leader/LeaderOrgTreeView'));

const LeaderPanel: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const {
    hasMeetings,
    hasTeamProgress,
    hasInfluencerCalc,
    hasSpecialistCalc,
    hasOrgTree,
    hasApprovalPermission,
    isAnyLeaderFeatureEnabled,
    loading: permLoading,
  } = useLeaderPermissions();
  const { pendingCount } = useLeaderApprovals(hasApprovalPermission);
  const { teamData, loading: teamLoading, defaultName, updateTeamName } = useLeaderTeam();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

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

  // Build available tabs dynamically — ordered as requested
  const availableTabs = [
    ...(hasOrgTree ? [{ id: 'org-tree', label: 'Moja struktura', icon: TreePine, badge: 0 }] : []),
    ...(hasTeamProgress ? [{ id: 'training', label: 'Szkolenia zespołu', icon: GraduationCap, badge: 0 }] : []),
    ...(hasMeetings ? [{ id: 'meetings', label: 'Spotkania indywidualne', icon: CalendarDays, badge: 0 }] : []),
    ...(hasApprovalPermission ? [{ id: 'approvals', label: 'Zatwierdzenia', icon: UserCheck, badge: pendingCount }] : []),
    ...(hasInfluencerCalc ? [{ id: 'calc-inf', label: 'Kalkulator Influencerów', icon: Calculator, badge: 0 }] : []),
    ...(hasSpecialistCalc ? [{ id: 'calc-spec', label: 'Kalkulator Specjalistów', icon: UserRound, badge: 0 }] : []),
  ];

  const resolvedDefaultTab = availableTabs.find(t => t.id === defaultTab)?.id ?? availableTabs[0]?.id ?? '';

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Crown className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Panel Lidera</h1>
            <p className="text-muted-foreground text-sm">Narzędzia i statystyki Twojej struktury</p>
          </div>
        </div>

        {/* My Team Card */}
        {teamData && (
          <Card className="mb-6">
            <CardContent className="py-4 flex items-center gap-4 flex-wrap">
              <Users className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Mój zespół:</span>
                  <span className="text-sm">{teamData.teamName}</span>
                </div>
                <p className="text-xs text-muted-foreground">{teamData.memberCount} członków w strukturze</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditNameValue(teamData.customName || '');
                  setEditNameOpen(true);
                }}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edytuj nazwę
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit team name dialog */}
        <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edytuj nazwę zespołu</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder={defaultName}
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Zostaw puste, aby użyć domyślnej nazwy: {defaultName}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditNameOpen(false)}>Anuluj</Button>
              <Button onClick={async () => {
                await updateTeamName(editNameValue.trim() || null);
                setEditNameOpen(false);
              }}>Zapisz</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2 relative">
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.badge > 0 && (
                    <Badge variant="default" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                      {tab.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {hasOrgTree && (
              <TabsContent value="org-tree">
                <Suspense fallback={<div className="flex justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <LeaderOrgTreeView />
                </Suspense>
              </TabsContent>
            )}

            {hasTeamProgress && (
              <TabsContent value="training">
                <TeamTrainingProgressView />
              </TabsContent>
            )}

            {hasMeetings && (
              <TabsContent value="meetings">
                <UnifiedMeetingSettingsForm />
              </TabsContent>
            )}

            {hasApprovalPermission && (
              <TabsContent value="approvals">
                <LeaderApprovalView />
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
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LeaderPanel;
