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
import {
  CalendarDays, GraduationCap, Crown, Loader2, Calculator, UserRound,
  TreePine, UserCheck, Users, Pencil, ShieldX,
  CalendarPlus, ClipboardList, BookOpenCheck, Library,
  Bell, Mail, Smartphone, Contact, Sun, Info, Link, BarChart3, Award, Globe,
} from 'lucide-react';
import { CommissionCalculator } from '@/components/calculator';
import { SpecialistCalculator } from '@/components/specialist-calculator';
import { LeaderApprovalView } from '@/components/leader/LeaderApprovalView';

// Lazy-loaded leader views
const LeaderOrgTreeView = lazy(() => import('@/components/leader/LeaderOrgTreeView'));
const LeaderEventsView = lazy(() => import('@/components/leader/LeaderEventsView'));
const LeaderEventRegistrationsView = lazy(() => import('@/components/leader/LeaderEventRegistrationsView'));
const LeaderTrainingMgmtView = lazy(() => import('@/components/leader/LeaderTrainingMgmtView'));
const LeaderKnowledgeView = lazy(() => import('@/components/leader/LeaderKnowledgeView'));
const LeaderNotificationsView = lazy(() => import('@/components/leader/LeaderNotificationsView'));
const LeaderEmailView = lazy(() => import('@/components/leader/LeaderEmailView'));
const LeaderPushView = lazy(() => import('@/components/leader/LeaderPushView'));
const LeaderTeamContactsView = lazy(() => import('@/components/leader/LeaderTeamContactsView'));
const LeaderDailySignalView = lazy(() => import('@/components/leader/LeaderDailySignalView'));
const LeaderImportantInfoView = lazy(() => import('@/components/leader/LeaderImportantInfoView'));
const LeaderReflinksView = lazy(() => import('@/components/leader/LeaderReflinksView'));
const LeaderReportsView = lazy(() => import('@/components/leader/LeaderReportsView'));
const LeaderCertificatesView = lazy(() => import('@/components/leader/LeaderCertificatesView'));
const LeaderLandingEditorView = lazy(() => import('@/components/leader/LeaderLandingEditorView'));


const LazyFallback = () => (
  <div className="flex justify-center h-40">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const LeaderPanel: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const {
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
    hasLandingPage,
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

  // Build available tabs dynamically
  const availableTabs = [
    ...(hasOrgTree ? [{ id: 'org-tree', label: 'Moja struktura', icon: TreePine, badge: 0 }] : []),
    ...(hasTeamProgress ? [{ id: 'training', label: 'Szkolenia zespołu', icon: GraduationCap, badge: 0 }] : []),
    ...(hasMeetings ? [{ id: 'meetings', label: 'Spotkania indywidualne', icon: CalendarDays, badge: 0 }] : []),
    ...(hasApprovalPermission ? [{ id: 'approvals', label: 'Zatwierdzenia', icon: UserCheck, badge: pendingCount }] : []),
    ...(hasInfluencerCalc ? [{ id: 'calc-inf', label: 'Kalk. Influencerów', icon: Calculator, badge: 0 }] : []),
    ...(hasSpecialistCalc ? [{ id: 'calc-spec', label: 'Kalk. Specjalistów', icon: UserRound, badge: 0 }] : []),
    // New delegated tabs
    ...(hasTeamEvents ? [{ id: 'team-events', label: 'Wydarzenia', icon: CalendarPlus, badge: 0 }] : []),
    ...(hasEventRegistrations ? [{ id: 'event-regs', label: 'Rejestracje', icon: ClipboardList, badge: 0 }] : []),
    ...(hasTeamTrainingMgmt ? [{ id: 'training-mgmt', label: 'Zarz. szkoleniami', icon: BookOpenCheck, badge: 0 }] : []),
    ...(hasKnowledgeBase ? [{ id: 'knowledge', label: 'Baza wiedzy', icon: Library, badge: 0 }] : []),
    ...(hasTeamNotifications ? [{ id: 'notifications', label: 'Powiadomienia', icon: Bell, badge: 0 }] : []),
    ...(hasTeamEmails ? [{ id: 'emails', label: 'Emaile', icon: Mail, badge: 0 }] : []),
    ...(hasTeamPush ? [{ id: 'push', label: 'Push', icon: Smartphone, badge: 0 }] : []),
    ...((hasTeamContacts || hasTeamContactsMgmt) ? [{ id: 'contacts', label: 'Kontakty', icon: Contact, badge: 0 }] : []),
    ...(hasDailySignal ? [{ id: 'daily-signal', label: 'Sygnał Dnia', icon: Sun, badge: 0 }] : []),
    ...(hasImportantInfo ? [{ id: 'important-info', label: 'Ważne info', icon: Info, badge: 0 }] : []),
    ...(hasTeamReflinks ? [{ id: 'reflinks', label: 'Reflinki', icon: Link, badge: 0 }] : []),
    ...(hasTeamReports ? [{ id: 'reports', label: 'Raporty', icon: BarChart3, badge: 0 }] : []),
    ...(hasCertificates ? [{ id: 'certificates', label: 'Certyfikaty', icon: Award, badge: 0 }] : []),
    ...(hasLandingPage ? [{ id: 'landing-page', label: 'Moja strona', icon: Globe, badge: 0 }] : []),
    
  ];

  const resolvedDefaultTab = availableTabs.find(t => t.id === defaultTab)?.id ?? availableTabs[0]?.id ?? '';

  // Tab content mapping for new delegated views
  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      case 'org-tree':
        return <Suspense fallback={<LazyFallback />}><LeaderOrgTreeView /></Suspense>;
      case 'training':
        return <TeamTrainingProgressView />;
      case 'meetings':
        return <UnifiedMeetingSettingsForm />;
      case 'approvals':
        return <LeaderApprovalView />;
      case 'calc-inf':
        return <CommissionCalculator />;
      case 'calc-spec':
        return <SpecialistCalculator />;
      case 'team-events':
        return <Suspense fallback={<LazyFallback />}><LeaderEventsView /></Suspense>;
      case 'event-regs':
        return <Suspense fallback={<LazyFallback />}><LeaderEventRegistrationsView /></Suspense>;
      case 'training-mgmt':
        return <Suspense fallback={<LazyFallback />}><LeaderTrainingMgmtView /></Suspense>;
      case 'knowledge':
        return <Suspense fallback={<LazyFallback />}><LeaderKnowledgeView /></Suspense>;
      case 'notifications':
        return <Suspense fallback={<LazyFallback />}><LeaderNotificationsView /></Suspense>;
      case 'emails':
        return <Suspense fallback={<LazyFallback />}><LeaderEmailView /></Suspense>;
      case 'push':
        return <Suspense fallback={<LazyFallback />}><LeaderPushView /></Suspense>;
      case 'contacts':
        return <Suspense fallback={<LazyFallback />}><LeaderTeamContactsView /></Suspense>;
      case 'daily-signal':
        return <Suspense fallback={<LazyFallback />}><LeaderDailySignalView /></Suspense>;
      case 'important-info':
        return <Suspense fallback={<LazyFallback />}><LeaderImportantInfoView /></Suspense>;
      case 'reflinks':
        return <Suspense fallback={<LazyFallback />}><LeaderReflinksView /></Suspense>;
      case 'reports':
        return <Suspense fallback={<LazyFallback />}><LeaderReportsView /></Suspense>;
      case 'certificates':
        return <Suspense fallback={<LazyFallback />}><LeaderCertificatesView /></Suspense>;
      case 'landing-page':
        return <Suspense fallback={<LazyFallback />}><LeaderLandingEditorView /></Suspense>;
      default:
        return null;
    }
  };

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
          renderTabContent(availableTabs[0].id)
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

            {availableTabs.map(tab => (
              <TabsContent key={tab.id} value={tab.id}>
                {renderTabContent(tab.id)}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LeaderPanel;
