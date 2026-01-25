export type UserRole = 'klient' | 'partner' | 'specjalista' | 'admin';

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  visibleFor: UserRole[];
  requiresDropdownOpen?: boolean;
  scrollTo?: boolean;
}

export const tourSteps: TourStep[] = [
  {
    id: 'welcome-widget',
    targetSelector: '[data-tour="welcome-widget"]',
    title: 'Widget powitalny',
    description: 'Tutaj widzisz powitanie, aktualną datę i zegar. Możesz zmienić strefę czasową klikając na selektor.',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    scrollTo: true,
  },
  {
    id: 'sidebar',
    targetSelector: '[data-tour="sidebar"]',
    title: 'Menu nawigacyjne',
    description: 'Stąd przejdziesz do wszystkich sekcji platformy. Na urządzeniach mobilnych otwórz je przyciskiem w lewym górnym rogu.',
    position: 'right',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'training',
    targetSelector: '[data-tour="menu-academy"]',
    title: 'Akademia / Szkolenia',
    description: 'Tutaj znajdziesz szkolenia. Widget na dashboardzie pokazuje Twój postęp. Po ukończeniu otrzymasz certyfikat!',
    position: 'right',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'calendar',
    targetSelector: '[data-tour="calendar-widget"]',
    title: 'Kalendarz i Spotkania',
    description: 'Kalendarz pokazuje nadchodzące wydarzenia. Obok widzisz listę Twoich najbliższych spotkań.',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    scrollTo: true,
  },
  {
    id: 'notifications',
    targetSelector: '[data-tour="notifications-bell"]',
    title: 'Powiadomienia',
    description: 'Dzwonek w górnym pasku pokazuje nowe powiadomienia. Widget na dashboardzie wyświetla ostatnie wiadomości.',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'resources',
    targetSelector: '[data-tour="menu-resources"]',
    title: 'Zasoby / Biblioteka',
    description: 'Tutaj znajdziesz materiały do pobrania, dokumenty, prezentacje i inne zasoby edukacyjne.',
    position: 'right',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'pure-kontakty',
    targetSelector: '[data-tour="menu-pureContacts"]',
    title: 'PureKontakty',
    description: 'Zarządzaj kontaktami prywatnymi i zespołowymi. Dodawaj notatki, planuj kolejne kontakty i wyszukuj specjalistów w bazie.',
    position: 'right',
    visibleFor: ['partner', 'specjalista', 'admin'],
  },
  {
    id: 'pure-linki',
    targetSelector: '[data-tour="menu-reflinks"]',
    title: 'PureLinki',
    description: 'Generuj unikalne linki polecające do zapraszania nowych osób. Skopiuj link i udostępnij potencjalnym partnerom lub klientom.',
    position: 'right',
    visibleFor: ['partner', 'specjalista', 'admin'],
  },
  {
    id: 'info-linki',
    targetSelector: '[data-tour="menu-infolinks"]',
    title: 'InfoLinki',
    description: 'Twórz linki z kodem OTP do udostępniania chronionych treści. Odbiorcy wpisują kod, aby uzyskać dostęp do materiałów.',
    position: 'right',
    visibleFor: ['partner', 'specjalista', 'admin'],
  },
  {
    id: 'zdrowa-wiedza',
    targetSelector: '[data-tour="menu-healthy-knowledge"]',
    title: 'Zdrowa Wiedza',
    description: 'Biblioteka materiałów edukacyjnych o zdrowiu. Możesz je przeglądać i udostępniać innym za pomocą kodów OTP.',
    position: 'right',
    visibleFor: ['partner', 'specjalista', 'admin'],
  },
  {
    id: 'my-account',
    targetSelector: '[data-tour="user-menu-account"]',
    title: 'Moje Konto',
    description: "Klikając swój avatar otworzysz menu użytkownika. Wybierz 'Moje konto' aby zarządzać swoim profilem, zmienić hasło, skonfigurować preferencje.",
    position: 'left',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    requiresDropdownOpen: true,
  },
  {
    id: 'tool-panel',
    targetSelector: '[data-tour="user-menu-tools"]',
    title: 'Panel narzędziowy',
    description: 'Panel narzędziowy pomoże Ci gdy aplikacja działa niepoprawnie. Znajdziesz tu opcje czyszczenia pamięci podręcznej.',
    position: 'left',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    requiresDropdownOpen: true,
  },
  {
    id: 'support',
    targetSelector: '[data-tour="menu-support"]',
    title: 'Wsparcie techniczne',
    description: 'Masz pytanie lub problem? Kliknij tutaj, aby wysłać zgłoszenie do zespołu wsparcia.',
    position: 'right',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'footer',
    targetSelector: '[data-tour="footer-section"]',
    title: 'Stopka z kontaktem',
    description: 'Na dole znajdziesz cytat dnia, dane kontaktowe i linki do regulaminu oraz polityki prywatności.',
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
