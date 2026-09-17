import React, { lazy, Suspense, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  TreePine, UserCheck, Users, Pencil,
  CalendarPlus, ClipboardList, BookOpenCheck, Library,
  Bell, Mail, Smartphone, Contact, Sun, Info, Link, BarChart3, Award, Globe, Radio, Trophy, Video,
  ChevronRight,
  type LucideIcon,
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
const LeaderAutoWebinarAccessView = lazy(() => import('@/components/leader/LeaderAutoWebinarAccessView'));
const LeaderChallengeAccessView = lazy(() => import('@/components/leader/LeaderChallengeAccessView'));
const LeaderZoomLinks = lazy(() => import('@/components/leader/LeaderZoomLinks'));


const LazyFallback = () => (
  <div className="flex justify-center h-40">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

type LeaderNavGroupId = 'team' | 'growth' | 'events' | 'communication' | 'tools';

type LeaderTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  badge: number;
  group: LeaderNavGroupId;
};

const LEADER_NAV_GROUPS: Array<{ id: LeaderNavGroupId; label: string }> = [
  { id: 'team', label: 'Mój zespół' },
  { id: 'growth', label: 'Rozwój zespołu' },
  { id: 'events', label: 'Wydarzenia zespołu' },
  { id: 'communication', label: 'Komunikacja zespołu' },
  { id: 'tools', label: 'Narzędzia lidera' },
];

type LeaderNavigationProps = {
  groupedTabs: Array<{ id: LeaderNavGroupId; label: string; tabs: LeaderTab[] }>;
  availableTabs: LeaderTab[];
  initialTab: string;
  renderTabContent: (tabId: string) => React.ReactNode;
};

const LeaderNavigation: React.FC<LeaderNavigationProps> = ({
  groupedTabs,
  availableTabs,
  initialTab,
  renderTabContent,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const initialGroup = availableTabs.find(tab => tab.id === initialTab)?.group ?? groupedTabs[0]?.id ?? '';
  const [openGroup, setOpenGroup] = useState(initialGroup);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start xl:gap-8">
        <nav aria-label="Funkcje Panelu Lidera" className="min-w-0 lg:sticky lg:top-4">
          <Accordion
            type="single"
            collapsible
            value={openGroup}
            onValueChange={setOpenGroup}
            className="overflow-hidden rounded-md border bg-card/50"
          >
            {groupedTabs.map(group => {
              const groupIsActive = group.tabs.some(tab => tab.id === activeTab);

              return (
                <AccordionItem key={group.id} value={group.id} className="border-border/70 last:border-b-0">
                  <AccordionTrigger
                    className={`min-h-14 gap-3 px-4 py-3 text-left hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[state=open]:bg-muted/60 [&>svg]:h-5 [&>svg]:w-5 ${groupIsActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="min-w-0 flex-1 text-sm leading-5">{group.label}</span>
                      <Badge
                        variant={groupIsActive ? 'default' : 'secondary'}
                        className="h-6 min-w-6 justify-center px-1.5"
                        aria-label={`${group.tabs.length} ${group.tabs.length === 1 ? 'pozycja' : 'pozycji'}`}
                      >
                        {group.tabs.length}
                      </Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2 pt-1">
                    <div className="flex flex-col gap-1">
                      {group.tabs.map(tab => (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          onClick={() => setOpenGroup(group.id)}
                          className="group relative min-h-12 w-full justify-start gap-3 whitespace-normal rounded-md px-3 py-2.5 text-left data-[state=active]:bg-primary data-[state=active]:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        >
                          <tab.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1 text-sm font-medium leading-5">{tab.label}</span>
                          {tab.badge > 0 && (
                            <Badge
                              variant="secondary"
                              className="ml-auto h-5 min-w-5 justify-center px-1 text-xs"
                              aria-label={`${tab.badge} oczekujących`}
                            >
                              {tab.badge}
                            </Badge>
                          )}
                          <ChevronRight
                            className="h-4 w-4 shrink-0 opacity-60 transition-transform group-data-[state=active]:translate-x-0.5 motion-reduce:transition-none"
                            aria-hidden="true"
                          />
                        </TabsTrigger>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </nav>

        <div className="min-w-0">
          {availableTabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0 min-w-0 focus-visible:outline-none">
              {renderTabContent(tab.id)}
            </TabsContent>
          ))}
        </div>
      </div>
    </Tabs>
  );
};

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
    hasAutoWebinarAccess,
    hasChallengeAccessMgmt,
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
      <DashboardLayout backTo={{ label: "Strona główna", path: "/dashboard" }}>
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
      <DashboardLayout backTo={{ label: "Strona główna", path: "/dashboard" }}>
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

  // Build available tabs dynamically. IDs are existing activeTab values and must stay stable.
  const availableTabs: LeaderTab[] = [
    ...(hasOrgTree ? [{ id: 'org-tree', label: 'Moja struktura', icon: TreePine, badge: 0, group: 'team' as const }] : []),
    ...((hasTeamContacts || hasTeamContactsMgmt) ? [{ id: 'contacts', label: 'Kontakty', icon: Contact, badge: 0, group: 'team' as const }] : []),
    ...(hasApprovalPermission ? [{ id: 'approvals', label: 'Zatwierdzenia', icon: UserCheck, badge: pendingCount, group: 'team' as const }] : []),
    ...(hasTeamReports ? [{ id: 'reports', label: 'Raporty', icon: BarChart3, badge: 0, group: 'team' as const }] : []),

    ...(hasTeamProgress ? [{ id: 'training', label: 'Szkolenia zespołu', icon: GraduationCap, badge: 0, group: 'growth' as const }] : []),
    ...(hasTeamTrainingMgmt ? [{ id: 'training-mgmt', label: 'Zarz. szkoleniami', icon: BookOpenCheck, badge: 0, group: 'growth' as const }] : []),
    ...(hasKnowledgeBase ? [{ id: 'knowledge', label: 'Baza wiedzy', icon: Library, badge: 0, group: 'growth' as const }] : []),
    ...(hasCertificates ? [{ id: 'certificates', label: 'Certyfikaty', icon: Award, badge: 0, group: 'growth' as const }] : []),
    ...(hasAutoWebinarAccess ? [{ id: 'auto-webinar', label: 'Auto-Webinary', icon: Radio, badge: 0, group: 'growth' as const }] : []),
    ...(hasChallengeAccessMgmt ? [{ id: 'challenge-access', label: 'Wyzwanie 90', icon: Trophy, badge: 0, group: 'growth' as const }] : []),

    ...(hasMeetings ? [{ id: 'meetings', label: 'Spotkania indywidualne', icon: CalendarDays, badge: 0, group: 'events' as const }] : []),
    ...(hasTeamEvents ? [{ id: 'team-events', label: 'Wydarzenia', icon: CalendarPlus, badge: 0, group: 'events' as const }] : []),
    ...(hasEventRegistrations ? [{ id: 'event-regs', label: 'Rejestracje', icon: ClipboardList, badge: 0, group: 'events' as const }] : []),
    { id: 'zoom-links', label: 'Linki Zoom', icon: Video, badge: 0, group: 'events' as const },

    ...(hasTeamNotifications ? [{ id: 'notifications', label: 'Powiadomienia', icon: Bell, badge: 0, group: 'communication' as const }] : []),
    ...(hasTeamEmails ? [{ id: 'emails', label: 'Emaile', icon: Mail, badge: 0, group: 'communication' as const }] : []),
    ...(hasTeamPush ? [{ id: 'push', label: 'Push', icon: Smartphone, badge: 0, group: 'communication' as const }] : []),
    ...(hasDailySignal ? [{ id: 'daily-signal', label: 'Sygnał Dnia', icon: Sun, badge: 0, group: 'communication' as const }] : []),
    ...(hasImportantInfo ? [{ id: 'important-info', label: 'Ważne info', icon: Info, badge: 0, group: 'communication' as const }] : []),

    ...(hasInfluencerCalc ? [{ id: 'calc-inf', label: 'Kalk. Influencerów', icon: Calculator, badge: 0, group: 'tools' as const }] : []),
    ...(hasSpecialistCalc ? [{ id: 'calc-spec', label: 'Kalk. Specjalistów', icon: UserRound, badge: 0, group: 'tools' as const }] : []),
    ...(hasTeamReflinks ? [{ id: 'reflinks', label: 'Reflinki', icon: Link, badge: 0, group: 'tools' as const }] : []),
    ...(hasLandingPage ? [{ id: 'landing-page', label: 'Moja strona', icon: Globe, badge: 0, group: 'tools' as const }] : []),
  ];

  const groupedTabs = LEADER_NAV_GROUPS
    .map(group => ({
      ...group,
      tabs: availableTabs.filter(tab => tab.group === group.id),
    }))
    .filter(group => group.tabs.length > 0);

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
      case 'auto-webinar':
        return <Suspense fallback={<LazyFallback />}><LeaderAutoWebinarAccessView /></Suspense>;
      case 'challenge-access':
        return <Suspense fallback={<LazyFallback />}><LeaderChallengeAccessView /></Suspense>;
      case 'zoom-links':
        return <Suspense fallback={<LazyFallback />}><LeaderZoomLinks /></Suspense>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout backTo={{ label: "Strona główna", path: "/dashboard" }}>
      <div className="container mx-auto max-w-6xl px-0 py-2 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-2 sm:py-4 lg:px-4 lg:py-6 lg:pb-8">
        {/* Header */}
        <div className="mb-5 flex items-start gap-3 sm:mb-6">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Crown className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Panel Lidera</h1>
            <p className="mt-1 max-w-xl text-sm leading-5 text-muted-foreground">
              Zarządzaj zespołem, rozwojem i komunikacją w jednym miejscu.
            </p>
          </div>
        </div>

        {/* My Team Card */}
        {teamData && (
          <Card className="mb-5 sm:mb-6">
            <CardContent className="flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
              <Users className="h-5 w-5 text-primary" aria-hidden="true" />
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
                <Pencil className="mr-1 h-3 w-3" />
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
          <LeaderNavigation
            groupedTabs={groupedTabs}
            availableTabs={availableTabs}
            initialTab={resolvedDefaultTab}
            renderTabContent={renderTabContent}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default LeaderPanel;
