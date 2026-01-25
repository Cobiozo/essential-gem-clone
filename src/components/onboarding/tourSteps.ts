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
  // WPROWADZENIE
  {
    id: 'welcome-widget',
    targetSelector: '[data-tour="welcome-widget"]',
    title: 'Widget powitalny',
    description: 'Tutaj widzisz powitanie, aktualną datę i zegar. Możesz zmienić strefę czasową klikając na selektor.',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    scrollTo: true,
  },
  
  // NAWIGACJA GŁÓWNA
  {
    id: 'sidebar',
    targetSelector: '[data-tour="sidebar"]',
    title: 'Menu nawigacyjne',
    description: 'Stąd przejdziesz do wszystkich sekcji platformy. Na urządzeniach mobilnych otwórz je przyciskiem w lewym górnym rogu.',
    position: 'right',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'menu-dashboard',
    targetSelector: '[data-tour="menu-dashboard"]',
    title: 'Strona Główna',
    description: 'Kliknij tutaj, aby wrócić do głównego pulpitu z widgetami.',
    position: 'right',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  
  // WIDGETY DASHBOARDOWE
  {
    id: 'calendar',
    targetSelector: '[data-tour="calendar-widget"]',
    title: 'Kalendarz i Spotkania',
    description: 'Kalendarz pokazuje nadchodzące wydarzenia. Kliknij na dzień, aby zobaczyć szczegóły.',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    scrollTo: true,
  },
  {
    id: 'my-meetings-widget',
    targetSelector: '[data-tour="my-meetings-widget"]',
    title: 'Twoje Spotkania',
    description: 'Lista Twoich nadchodzących spotkań. Gdy zbliża się czas, pojawi się przycisk WEJDŹ z pulsującą kropką.',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
    scrollTo: true,
  },
  {
    id: 'training-widget',
    targetSelector: '[data-tour="training-widget"]',
    title: 'Postęp Szkolenia',
    description: 'Widget pokazuje Twój postęp w modułach szkoleniowych. Kliknij moduł, aby kontynuować naukę.',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'notifications-widget',
    targetSelector: '[data-tour="notifications-widget"]',
    title: 'Ostatnie Powiadomienia',
    description: 'Widget wyświetla 4 najnowsze powiadomienia. Kliknij, aby zobaczyć szczegóły lub przejść do pełnej listy.',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'otp-codes-widget',
    targetSelector: '[data-tour="otp-codes-widget"]',
    title: 'Kody Dostępu OTP',
    description: 'Podgląd aktywnych kodów OTP dla InfoLinków i Zdrowej Wiedzy. Skopiuj kod jednym kliknięciem i udostępnij odbiorcy.',
    position: 'bottom',
    visibleFor: ['partner', 'admin'],
  },
  {
    id: 'resources-widget',
    targetSelector: '[data-tour="resources-widget"]',
    title: 'Najnowsze Zasoby',
    description: 'Szybki dostęp do najnowszych materiałów. Możesz kopiować linki, pobierać pliki lub przejść do biblioteki.',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'team-contacts-widget',
    targetSelector: '[data-tour="team-contacts-widget"]',
    title: 'Kontakty Zespołowe',
    description: 'Podgląd Twoich kontaktów prywatnych i zespołowych. Kliknij, aby zobaczyć pełną listę i dodać nowe kontakty.',
    position: 'bottom',
    visibleFor: ['partner', 'specjalista', 'admin'],
  },
  {
    id: 'healthy-knowledge-widget',
    targetSelector: '[data-tour="healthy-knowledge-widget"]',
    title: 'Zdrowa Wiedza',
    description: 'Materiały edukacyjne o zdrowiu. Możesz je przeglądać i udostępniać innym za pomocą kodów OTP.',
    position: 'bottom',
    visibleFor: ['partner', 'specjalista', 'admin'],
  },
  {
    id: 'active-users-widget',
    targetSelector: '[data-tour="active-users-widget"]',
    title: 'Aktywni Użytkownicy',
    description: 'Statystyki aktywności użytkowników platformy. Widoczne tylko dla administratorów.',
    position: 'bottom',
    visibleFor: ['admin'],
  },
  
  // MENU FUNKCJI
  {
    id: 'training',
    targetSelector: '[data-tour="menu-academy"]',
    title: 'Akademia / Szkolenia',
    description: 'Tutaj znajdziesz szkolenia. Widget na dashboardzie pokazuje Twój postęp. Po ukończeniu otrzymasz certyfikat!',
    position: 'right',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
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
    id: 'menu-news',
    targetSelector: '[data-tour="menu-news"]',
    title: 'Aktualności',
    description: 'Przeglądaj najnowsze wiadomości, ogłoszenia i informacje od zespołu Pure Life.',
    position: 'right',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'menu-events',
    targetSelector: '[data-tour="menu-events"]',
    title: 'Wydarzenia',
    description: 'Tutaj znajdziesz webinary, spotkania zespołu i spotkania indywidualne. Zapisuj się i uczestniczy online.',
    position: 'right',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  
  // PASEK GÓRNY I USTAWIENIA
  {
    id: 'notifications',
    targetSelector: '[data-tour="notifications-bell"]',
    title: 'Powiadomienia',
    description: 'Dzwonek w górnym pasku pokazuje nowe powiadomienia. Kliknij, aby zobaczyć listę i przejść do szczegółów.',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'tutorial-button',
    targetSelector: '[data-tour="tutorial-button"]',
    title: 'Przycisk Samouczka',
    description: 'Kliknij tę ikonkę pomocy w dowolnym momencie, aby ponownie uruchomić samouczek.',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'language-selector',
    targetSelector: '[data-tour="language-selector"]',
    title: 'Wybór Języka',
    description: 'Zmień język interfejsu platformy. Dostępne języki: Polski, Angielski i Niemiecki.',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'theme-selector',
    targetSelector: '[data-tour="theme-selector"]',
    title: 'Motyw Kolorystyczny',
    description: 'Przełącz między trybem jasnym, ciemnym lub automatycznym (zgodnym z ustawieniami systemu).',
    position: 'bottom',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'user-avatar',
    targetSelector: '[data-tour="user-avatar"]',
    title: 'Menu Użytkownika',
    description: 'Kliknij swój avatar, aby otworzyć menu użytkownika z dostępem do konta, ustawień i wylogowania.',
    position: 'left',
    visibleFor: ['klient', 'partner', 'specjalista', 'admin'],
  },
  {
    id: 'my-account',
    targetSelector: '[data-tour="user-menu-account"]',
    title: 'Moje Konto',
    description: "Wybierz 'Moje konto' aby zarządzać swoim profilem, zmienić hasło, skonfigurować preferencje.",
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
  
  // STOPKA
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
