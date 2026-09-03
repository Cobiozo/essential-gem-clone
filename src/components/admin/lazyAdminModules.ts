import { lazy } from 'react';

/**
 * Leniwe ładowanie modułów panelu administratora.
 * Komponenty są pogrupowane w kilka paczek (chunków) — dzięki temu wejście
 * na /admin nie pobiera kodu modułów, których administrator nie otworzył.
 */

const contentGroup = () => import('./groups/contentGroup');
const usersGroup = () => import('./groups/usersGroup');
const trainingGroup = () => import('./groups/trainingGroup');
const eventsGroup = () => import('./groups/eventsGroup');
const commsGroup = () => import('./groups/commsGroup');
const systemGroup = () => import('./groups/systemGroup');
const toolsGroup = () => import('./groups/toolsGroup');

// Ciężkie moduły (recharts, mapa Leaflet, jsPDF/fabric, DnD) mają WŁASNY chunk —
// nie są częścią chunku grupy, więc otwarcie innego modułu tej grupy ich nie pobiera.
const pick = <G extends Record<string, any>, K extends keyof G>(
  loader: () => Promise<G>,
  key: K,
) => lazy(async () => ({ default: (await loader())[key] }));

// --- content / CMS ---
export const HtmlPagesManagement = pick(contentGroup, 'HtmlPagesManagement');
export const AdminMediaLibrary = pick(contentGroup, 'AdminMediaLibrary');
export const ImportantInfoManagement = pick(contentGroup, 'ImportantInfoManagement');
export const NewsTickerManagement = pick(contentGroup, 'NewsTickerManagement');
export const DashboardFooterManagement = pick(contentGroup, 'DashboardFooterManagement');
export const AppBannersManager = pick(contentGroup, 'AppBannersManager');
export const IntroVideoSettingsPanel = pick(contentGroup, 'IntroVideoSettingsPanel');
export const SidebarFooterIconsManagement = pick(contentGroup, 'SidebarFooterIconsManagement');
export const SidebarOrderEditor = pick(contentGroup, 'SidebarOrderEditor');
export const MobileBottomNavSettings = pick(contentGroup, 'MobileBottomNavSettings');
export const CookieConsentManagement = pick(contentGroup, 'CookieConsentManagement');

// --- users / structure ---
export const UserStatistics = lazy(() => import('@/components/admin/UserStatistics'));
export const PlatformStructureView = lazy(() => import('@/components/admin/PlatformStructureView'));
export const OrganizationTreeManagement = lazy(() => import('@/components/admin/OrganizationTreeManagement'));
export const ModeratorsManagement = pick(usersGroup, 'ModeratorsManagement');
export const GuestsManagement = pick(usersGroup, 'GuestsManagement');
export const DeletedAccountsManagement = pick(usersGroup, 'DeletedAccountsManagement');
export const AdminGuestDashboard = pick(usersGroup, 'AdminGuestDashboard');
export const PlatformTeamsManagement = pick(usersGroup, 'PlatformTeamsManagement');
export const LeaderPanelManagement = pick(usersGroup, 'LeaderPanelManagement');

// --- training / knowledge ---
export const TrainingManagement = pick(trainingGroup, 'TrainingManagement');
export const CertificateEditor = lazy(() => import('@/components/admin/CertificateEditor'));
export const KnowledgeResourcesManagement = pick(trainingGroup, 'KnowledgeResourcesManagement');
export const HealthyKnowledgeManagement = pick(trainingGroup, 'HealthyKnowledgeManagement');
export const PureBoxManagement = pick(trainingGroup, 'PureBoxManagement');

// --- events ---
export const EventsManagement = pick(eventsGroup, 'EventsManagement');
export const EventRegistrationsManagement = lazy(() => import('@/components/admin/EventRegistrationsManagement'));
export const PaidEventsManagement = lazy(async () => ({ default: (await import('@/components/admin/paid-events/PaidEventsManagement')).PaidEventsManagement }));
export const PartnerPagesManagement = lazy(async () => ({ default: (await import('@/components/admin/PartnerPagesManagement')).PartnerPagesManagement }));

// --- communication ---
export const TranslationsManagement = pick(commsGroup, 'TranslationsManagement');
export const TeamContactsManagement = pick(commsGroup, 'TeamContactsManagement');
export const NotificationSystemManagement = pick(commsGroup, 'NotificationSystemManagement');
export const PushNotificationsManagement = pick(commsGroup, 'PushNotificationsManagement');
export const ChatPermissionsManagement = pick(commsGroup, 'ChatPermissionsManagement');
export const EmailTemplatesManagement = pick(commsGroup, 'EmailTemplatesManagement');
export const EmailDeliveryDashboard = pick(commsGroup, 'EmailDeliveryDashboard');
export const SupportSettingsManagement = pick(commsGroup, 'SupportSettingsManagement');
export const SupportTicketsManagement = pick(commsGroup, 'SupportTicketsManagement');

// --- system ---
export const MaintenanceModeManagement = pick(systemGroup, 'MaintenanceModeManagement');
export const CronJobsManagement = pick(systemGroup, 'CronJobsManagement');
export const GoogleCalendarManagement = lazy(() => import('@/components/admin/GoogleCalendarManagement'));
export const DataCleanupManagement = pick(systemGroup, 'DataCleanupManagement');
export const SecurityModule = lazy(async () => ({ default: (await import('@/components/admin/SecurityModule')).SecurityModule }));
export const AdminActivityLog = pick(systemGroup, 'AdminActivityLog');
export const SystemHealthAlertsPanel = pick(systemGroup, 'SystemHealthAlertsPanel');
export const ApiIntegrationsPanel = pick(systemGroup, 'ApiIntegrationsPanel');
export const AiProviderManagement = pick(systemGroup, 'AiProviderManagement');
export const ReflinksManagement = pick(systemGroup, 'ReflinksManagement');

// --- tools ---
export const CalculatorManagement = pick(toolsGroup, 'CalculatorManagement');
export const SpecialistCalculatorManagement = pick(toolsGroup, 'SpecialistCalculatorManagement');
export const AiCompassManagement = pick(toolsGroup, 'AiCompassManagement');
export const DailySignalManagement = pick(toolsGroup, 'DailySignalManagement');
