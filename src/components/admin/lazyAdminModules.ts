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
export const UserStatistics = pick(usersGroup, 'UserStatistics');
export const PlatformStructureView = pick(usersGroup, 'PlatformStructureView');
export const OrganizationTreeManagement = pick(usersGroup, 'OrganizationTreeManagement');
export const ModeratorsManagement = pick(usersGroup, 'ModeratorsManagement');
export const GuestsManagement = pick(usersGroup, 'GuestsManagement');
export const DeletedAccountsManagement = pick(usersGroup, 'DeletedAccountsManagement');
export const AdminGuestDashboard = pick(usersGroup, 'AdminGuestDashboard');
export const PlatformTeamsManagement = pick(usersGroup, 'PlatformTeamsManagement');
export const LeaderPanelManagement = pick(usersGroup, 'LeaderPanelManagement');

// --- training / knowledge ---
export const TrainingManagement = pick(trainingGroup, 'TrainingManagement');
export const CertificateEditor = pick(trainingGroup, 'CertificateEditor');
export const KnowledgeResourcesManagement = pick(trainingGroup, 'KnowledgeResourcesManagement');
export const HealthyKnowledgeManagement = pick(trainingGroup, 'HealthyKnowledgeManagement');
export const PureBoxManagement = pick(trainingGroup, 'PureBoxManagement');

// --- events ---
export const EventsManagement = pick(eventsGroup, 'EventsManagement');
export const EventRegistrationsManagement = pick(eventsGroup, 'EventRegistrationsManagement');
export const PaidEventsManagement = pick(eventsGroup, 'PaidEventsManagement');
export const PartnerPagesManagement = pick(eventsGroup, 'PartnerPagesManagement');

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
export const GoogleCalendarManagement = pick(systemGroup, 'GoogleCalendarManagement');
export const DataCleanupManagement = pick(systemGroup, 'DataCleanupManagement');
export const SecurityModule = pick(systemGroup, 'SecurityModule');
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
