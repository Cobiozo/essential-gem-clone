/**
 * R2.0 — Etap 1: centralny rejestr architektury informacji (IA).
 *
 * JEDNO źródło prawdy o nawigacji dla desktop / tablet / mobile.
 * Plik jest wyłącznie DANYMI — nie zawiera logiki uprawnień ani fetchowania.
 * Widoczność opisana jest kluczami, które konsumenci (DashboardSidebar,
 * MobileBottomNav, rejestr mobilny) mapują na swoje istniejące sprawdzenia.
 *
 * ZASADA: żadna istniejąca trasa ani funkcja nie jest tu usuwana.
 * `legacyRoutes` dokumentuje stare wejścia, które MUSZĄ nadal działać.
 */

export type NavSectionId =
  | 'start'
  | 'news'
  | 'learning'
  | 'meetings'
  | 'contacts'
  | 'messages'
  | 'tools'
  | 'system';

/** Klucze widoczności — mapowane przez konsumentów na istniejące sprawdzenia ról/uprawnień. */
export type NavVisibility =
  | 'always'
  | 'authenticated'
  | 'notGuest'
  | 'partnerOrSpecialist'
  | 'reflinksEnabled'
  | 'hkCodesEnabled'
  | 'aiCompassEnabled'
  | 'challengeEnabled'
  | 'leader'
  | 'adminOrModerator';

export interface NavItem {
  id: string;
  /** Etykieta lub klucz tłumaczenia (konsument decyduje przez `labelIsKey`). */
  label: string;
  labelIsKey?: boolean;
  route: string;
  section: NavSectionId;
  /** Pozycja nadrzędna w obrębie sekcji (dla podmenu). */
  parent?: string;
  visibility: NavVisibility;
  /** Czy pozycja ma być dostępna w nawigacji mobilnej (bottom bar lub „Więcej"). */
  mobile: 'primary' | 'more' | 'hidden';
  iconName: string;
  badge?: 'unreadMessages' | 'pendingApprovals';
  /** Stare adresy prowadzące do tej pozycji — muszą działać dalej. */
  legacyRoutes?: string[];
}

export interface NavSection {
  id: NavSectionId;
  label: string;
  /** Strefa systemowa nie jest równorzędna z nawigacją główną. */
  zone: 'main' | 'system';
}

export const NAV_SECTIONS: NavSection[] = [
  { id: 'start', label: 'Start', zone: 'main' },
  { id: 'news', label: 'Aktualności', zone: 'main' },
  { id: 'learning', label: 'Nauka', zone: 'main' },
  { id: 'meetings', label: 'Spotkania', zone: 'main' },
  { id: 'contacts', label: 'Kontakty', zone: 'main' },
  { id: 'messages', label: 'Wiadomości', zone: 'main' },
  { id: 'tools', label: 'Narzędzia', zone: 'main' },
  { id: 'system', label: 'System', zone: 'system' },
];

export const NAV_ITEMS: NavItem[] = [
  // 1. Start
  { id: 'dashboard', label: 'dashboard.menu.dashboard', labelIsKey: true, route: '/dashboard', section: 'start', visibility: 'authenticated', mobile: 'primary', iconName: 'LayoutDashboard' },

  // 2. Aktualności
  { id: 'news', label: 'dashboard.menu.news', labelIsKey: true, route: '/aktualnosci', section: 'news', visibility: 'authenticated', mobile: 'more', iconName: 'Newspaper' },

  // 3. Nauka
  { id: 'academy', label: 'dashboard.menu.academy', labelIsKey: true, route: '/training', section: 'learning', visibility: 'authenticated', mobile: 'primary', iconName: 'GraduationCap' },
  { id: 'healthy-knowledge', label: 'dashboard.menu.healthyKnowledge', labelIsKey: true, route: '/zdrowa-wiedza', section: 'learning', visibility: 'authenticated', mobile: 'more', iconName: 'Heart' },
  { id: 'knowledge', label: 'dashboard.menu.resources', labelIsKey: true, route: '/knowledge', section: 'learning', visibility: 'authenticated', mobile: 'more', iconName: 'Library' },
  { id: 'skills-assessment', label: 'Ocena umiejętności', route: '/skills-assessment', section: 'learning', visibility: 'notGuest', mobile: 'more', iconName: 'Award' },

  // 4. Spotkania
  { id: 'webinars', label: 'dashboard.menu.webinars', labelIsKey: true, route: '/events/webinars', section: 'meetings', visibility: 'authenticated', mobile: 'primary', iconName: 'Video' },
  { id: 'team-meetings', label: 'dashboard.menu.teamMeetings', labelIsKey: true, route: '/events/team-meetings', section: 'meetings', visibility: 'authenticated', mobile: 'more', iconName: 'UsersRound' },
  { id: 'individual-meetings', label: 'dashboard.menu.individualMeetings', labelIsKey: true, route: '/events/individual-meetings', section: 'meetings', visibility: 'authenticated', mobile: 'more', iconName: 'Users' },
  { id: 'paid-events', label: 'dashboard.menu.paidEvents', labelIsKey: true, route: '/paid-events', section: 'meetings', visibility: 'authenticated', mobile: 'more', iconName: 'Ticket' },
  { id: 'ticket-verification', label: 'Weryfikacja biletów', route: '/weryfikacja-biletow', section: 'meetings', visibility: 'notGuest', mobile: 'more', iconName: 'CheckSquare' },

  // 5. Kontakty — kanoniczne miejsce
  {
    id: 'contacts',
    label: 'dashboard.menu.pureContacts',
    labelIsKey: true,
    route: '/contacts',
    section: 'contacts',
    visibility: 'notGuest',
    mobile: 'more',
    iconName: 'Users',
    badge: 'pendingApprovals',
    legacyRoutes: ['/my-account?tab=team-contacts'],
  },
  { id: 'contacts-private', label: 'dashboard.menu.privateContacts', labelIsKey: true, route: '/contacts?subTab=private', section: 'contacts', parent: 'contacts', visibility: 'notGuest', mobile: 'hidden', iconName: 'Contact' },
  { id: 'contacts-team', label: 'dashboard.menu.teamContacts', labelIsKey: true, route: '/contacts?subTab=team', section: 'contacts', parent: 'contacts', visibility: 'notGuest', mobile: 'hidden', iconName: 'Users' },
  { id: 'contacts-search', label: 'dashboard.menu.searchSpecialist', labelIsKey: true, route: '/contacts?subTab=search', section: 'contacts', parent: 'contacts', visibility: 'notGuest', mobile: 'hidden', iconName: 'Search' },

  // 6. Wiadomości (scalanie implementacji czatów — osobny, późniejszy etap)
  { id: 'messages', label: 'Wiadomości', route: '/messages', section: 'messages', visibility: 'notGuest', mobile: 'primary', iconName: 'MessageCircle', badge: 'unreadMessages' },

  // 7. Narzędzia
  { id: 'omega-base', label: 'PureBox', route: '/omega-base', section: 'tools', visibility: 'notGuest', mobile: 'more', iconName: 'Heart' },
  { id: 'omega-tests', label: 'Baza testów', route: '/moje-testy', section: 'tools', visibility: 'notGuest', mobile: 'more', iconName: 'ClipboardList' },
  { id: 'ai-compass', label: 'AI Kompas', route: '/ai-compass', section: 'tools', visibility: 'aiCompassEnabled', mobile: 'more', iconName: 'Compass', legacyRoutes: ['/my-account?tab=ai-compass'] },
  { id: 'reflinks', label: 'dashboard.pureLinki', labelIsKey: true, route: '/reflinki', section: 'tools', visibility: 'reflinksEnabled', mobile: 'more', iconName: 'Link', legacyRoutes: ['/my-account?tab=reflinks'] },
  { id: 'hk-codes', label: 'Kody HK', route: '/kody-hk', section: 'tools', visibility: 'hkCodesEnabled', mobile: 'more', iconName: 'Key', legacyRoutes: ['/my-account?tab=hk-codes'] },
  { id: 'partner-page', label: 'Moja Strona-Biznes Partner', route: '/moja-strona', section: 'tools', visibility: 'notGuest', mobile: 'more', iconName: 'Globe' },
  { id: 'challenge-90', label: 'Wyzwanie 90-dniowe', route: '/wyzwanie-90', section: 'tools', visibility: 'challengeEnabled', mobile: 'more', iconName: 'Trophy' },
  { id: 'calculator-influencer', label: 'dashboard.menu.forInfluencers', labelIsKey: true, route: '/calculator/influencer', section: 'tools', visibility: 'notGuest', mobile: 'more', iconName: 'Calculator' },
  { id: 'calculator-specialist', label: 'dashboard.menu.forSpecialists', labelIsKey: true, route: '/calculator/specialist', section: 'tools', visibility: 'notGuest', mobile: 'more', iconName: 'Calculator' },

  // Strefa systemowa
  { id: 'leader-panel', label: 'Panel Lidera', route: '/leader', section: 'system', visibility: 'leader', mobile: 'more', iconName: 'Crown' },
  { id: 'admin-panel', label: 'dashboard.menu.admin', labelIsKey: true, route: '/admin', section: 'system', visibility: 'adminOrModerator', mobile: 'more', iconName: 'Shield' },
  { id: 'account', label: 'dashboard.menu.settings', labelIsKey: true, route: '/my-account', section: 'system', visibility: 'authenticated', mobile: 'more', iconName: 'User' },
  { id: 'support', label: 'dashboard.menu.support', labelIsKey: true, route: '/my-account?tab=profile#support', section: 'system', visibility: 'authenticated', mobile: 'more', iconName: 'HelpCircle' },
];

/**
 * Stare wejścia `?tab=` → nowe kanoniczne adresy.
 * Zakładki w `/my-account` pozostają działające (okres przejściowy);
 * wejście z parametrem `?tab=` jest przenoszone na adres kanoniczny.
 */
export const LEGACY_ACCOUNT_TAB_ROUTES: Record<string, string> = {
  'team-contacts': '/contacts',
  'ai-compass': '/ai-compass',
  'hk-codes': '/kody-hk',
  reflinks: '/reflinki',
};

/**
 * Segmenty pierwszego poziomu zarezerwowane przez aplikację —
 * NIE mogą być użyte jako alias strony partnera (`/:alias`).
 * Lista jest współdzielona z ProfileCompletionGuard.
 */
export const RESERVED_ROUTE_SEGMENTS: string[] = [
  '/auth', '/admin', '/dashboard', '/my-account', '/training',
  '/knowledge', '/messages', '/calculator', '/paid-events',
  '/events', '/e', '/install', '/page', '/html', '/infolink', '/zdrowa-wiedza',
  '/meeting-room', '/change-password', '/reset-password', '/omega-base',
  '/landing-preview', '/auto-webinar', '/a-w', '/skills-assessment',
  '/moja-strona', '/moje-testy', '/aktualnosci', '/checkout', '/ticket',
  '/zaproszenie', '/konto-usuniete', '/wyzwanie-90',
  // Brakujące dotychczas (audyt R2.0-A)
  '/leader', '/weryfikacja-biletow', '/event-form', '/free-event',
  // Nowe kanoniczne trasy (R2.0 etap 1)
  '/contacts', '/ai-compass', '/kody-hk', '/reflinki',
];

export const getSectionItems = (section: NavSectionId): NavItem[] =>
  NAV_ITEMS.filter((i) => i.section === section && !i.parent);
