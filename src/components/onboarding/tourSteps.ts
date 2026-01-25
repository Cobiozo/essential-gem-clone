export type UserRole = 'klient' | 'partner' | 'specjalista' | 'admin';

export interface TourStep {
  id: string;
  targetSelector: string;
  titleKey: string;
  descriptionKey: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  visibleFor: UserRole[];
  requiresDropdownOpen?: boolean;
  scrollTo?: boolean;
}

export const tourSteps: TourStep[] = [
  {
    id: 'welcome-widget',
    targetSelector: '[data-tour="welcome-widget"]',
    titleKey: 'onboarding.welcome.title',
    descriptionKey: 'onboarding.welcome.description',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    scrollTo: true,
  },
  {
    id: 'sidebar',
    targetSelector: '[data-tour="sidebar"]',
    titleKey: 'onboarding.sidebar.title',
    descriptionKey: 'onboarding.sidebar.description',
    position: 'right',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'training',
    targetSelector: '[data-tour="menu-academy"]',
    titleKey: 'onboarding.training.title',
    descriptionKey: 'onboarding.training.description',
    position: 'right',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'calendar',
    targetSelector: '[data-tour="calendar-widget"]',
    titleKey: 'onboarding.calendar.title',
    descriptionKey: 'onboarding.calendar.description',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    scrollTo: true,
  },
  {
    id: 'notifications',
    targetSelector: '[data-tour="notifications-bell"]',
    titleKey: 'onboarding.notifications.title',
    descriptionKey: 'onboarding.notifications.description',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'resources',
    targetSelector: '[data-tour="menu-resources"]',
    titleKey: 'onboarding.resources.title',
    descriptionKey: 'onboarding.resources.description',
    position: 'right',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'pure-kontakty',
    targetSelector: '[data-tour="menu-pureContacts"]',
    titleKey: 'onboarding.pureKontakty.title',
    descriptionKey: 'onboarding.pureKontakty.description',
    position: 'right',
    visibleFor: ['partner', 'specjalista', 'admin'],
  },
  {
    id: 'pure-linki',
    targetSelector: '[data-tour="menu-reflinks"]',
    titleKey: 'onboarding.pureLinki.title',
    descriptionKey: 'onboarding.pureLinki.description',
    position: 'right',
    visibleFor: ['partner', 'specjalista', 'admin'],
  },
  {
    id: 'info-linki',
    targetSelector: '[data-tour="menu-infolinks"]',
    titleKey: 'onboarding.infoLinki.title',
    descriptionKey: 'onboarding.infoLinki.description',
    position: 'right',
    visibleFor: ['partner', 'specjalista', 'admin'],
  },
  {
    id: 'zdrowa-wiedza',
    targetSelector: '[data-tour="menu-healthy-knowledge"]',
    titleKey: 'onboarding.zdrowaWiedza.title',
    descriptionKey: 'onboarding.zdrowaWiedza.description',
    position: 'right',
    visibleFor: ['partner', 'specjalista', 'admin'],
  },
  {
    id: 'my-account',
    targetSelector: '[data-tour="user-menu-account"]',
    titleKey: 'onboarding.myAccount.title',
    descriptionKey: 'onboarding.myAccount.description',
    position: 'left',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    requiresDropdownOpen: true,
  },
  {
    id: 'tool-panel',
    targetSelector: '[data-tour="user-menu-tools"]',
    titleKey: 'onboarding.toolPanel.title',
    descriptionKey: 'onboarding.toolPanel.description',
    position: 'left',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    requiresDropdownOpen: true,
  },
  {
    id: 'support',
    targetSelector: '[data-tour="menu-support"]',
    titleKey: 'onboarding.support.title',
    descriptionKey: 'onboarding.support.description',
    position: 'right',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'footer',
    targetSelector: '[data-tour="footer-section"]',
    titleKey: 'onboarding.footer.title',
    descriptionKey: 'onboarding.footer.description',
    position: 'top',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    scrollTo: true,
  },
];

// Get filtered steps based on user role
export const getStepsForRole = (role: string | undefined): TourStep[] => {
  const normalizedRole = (role?.toLowerCase() || 'klient') as UserRole;
  return tourSteps.filter(step => step.visibleFor.includes(normalizedRole));
};
