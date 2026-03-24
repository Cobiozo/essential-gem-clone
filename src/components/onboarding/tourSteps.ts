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

const allRoles: UserRole[] = ['klient', 'partner', 'specjalista', 'admin'];
const partnerPlus: UserRole[] = ['partner', 'specjalista', 'admin'];

export const tourSteps: TourStep[] = [
  // ============================================================
  // SEKCJA 1: PASEK GÓRNY (od lewej do prawej)
  // ============================================================
  {
    id: 'sidebar',
    targetSelector: '[data-tour="sidebar"]',
    title: '📌 Menu nawigacyjne',
    description: 'To jest główne menu platformy. Znajdziesz tu wszystkie sekcje: szkolenia, zasoby, kontakty, wydarzenia i więcej. Na telefonie otworzysz je przyciskiem ☰ w lewym górnym rogu.',
    position: 'right',
    visibleFor: allRoles,
  },
  {
    id: 'notifications',
    targetSelector: '[data-tour="notifications-bell"]',
    title: '🔔 Powiadomienia',
    description: 'Kliknij dzwonek, aby zobaczyć listę powiadomień. Czerwona kropka oznacza nieprzeczytane wiadomości. Znajdziesz tu informacje o nowych wydarzeniach, wiadomościach i zmianach na platformie.',
    position: 'bottom',
    visibleFor: allRoles,
  },
  {
    id: 'language-selector',
    targetSelector: '[data-tour="language-selector"]',
    title: '🌐 Wybór języka',
    description: 'Zmień język interfejsu platformy. Dostępne języki: Polski 🇵🇱, Angielski 🇬🇧 i Niemiecki 🇩🇪. Wszystkie nazwy sekcji, przyciski i komunikaty zmienią się automatycznie.',
    position: 'bottom',
    visibleFor: allRoles,
  },
  {
    id: 'tutorial-button',
    targetSelector: '[data-tour="tutorial-button"]',
    title: '❓ Przycisk samouczka',
    description: 'Kliknij tę ikonkę pomocy w dowolnym momencie, aby ponownie uruchomić ten samouczek. Przydatne gdy zapomnisz, gdzie coś się znajduje.',
    position: 'bottom',
    visibleFor: allRoles,
  },
  {
    id: 'theme-selector',
    targetSelector: '[data-tour="theme-selector"]',
    title: '🎨 Motyw kolorystyczny',
    description: 'Przełącz między trybem jasnym ☀️, ciemnym 🌙 lub automatycznym 💻 (dopasowanym do ustawień Twojego systemu operacyjnego).',
    position: 'bottom',
    visibleFor: allRoles,
  },
  {
    id: 'user-avatar',
    targetSelector: '[data-tour="user-avatar"]',
    title: '👤 Menu użytkownika',
    description: 'Kliknij swój avatar, aby otworzyć menu użytkownika. Stąd przejdziesz do ustawień konta, profilu i wylogowania.',
    position: 'left',
    visibleFor: allRoles,
  },
  {
    id: 'my-account',
    targetSelector: '[data-tour="user-menu-account"]',
    title: '⚙️ Moje Konto',
    description: 'Wybierz "Moje konto" aby zarządzać swoim profilem — zmień zdjęcie, hasło, dane osobowe i preferencje powiadomień.',
    position: 'left',
    visibleFor: allRoles,
    requiresDropdownOpen: true,
  },
  {
    id: 'tool-panel',
    targetSelector: '[data-tour="user-menu-tools"]',
    title: '🛠️ Panel narzędziowy',
    description: 'Panel narzędziowy pomoże Ci gdy aplikacja działa niepoprawnie. Znajdziesz tu opcje czyszczenia pamięci podręcznej i resetowania ustawień.',
    position: 'left',
    visibleFor: allRoles,
    requiresDropdownOpen: true,
  },

  // ============================================================
  // SEKCJA 2: WIDGETY DASHBOARDU (z góry na dół)
  // ============================================================
  {
    id: 'welcome-widget',
    targetSelector: '[data-tour="welcome-widget"]',
    title: '👋 Widget powitalny',
    description: 'Tutaj widzisz powitanie, aktualną datę i zegar cyfrowy. Możesz zmienić strefę czasową klikając na selektor obok zegara. Poniżej zobaczysz pasek informacyjny.',
    position: 'bottom',
    visibleFor: allRoles,
    scrollTo: true,
  },
  {
    id: 'news-ticker',
    targetSelector: '[data-tour="news-ticker"]',
    title: '📰 Pasek informacyjny',
    description: 'Przewijający się pasek pokazuje na żywo aktywność na platformie: kto ukończył szkolenie, zdobył certyfikat, dołączył do zespołu oraz informacje o nadchodzących webinarach.',
    position: 'bottom',
    visibleFor: allRoles,
    scrollTo: true,
  },
  {
    id: 'calendar',
    targetSelector: '[data-tour="calendar-widget"]',
    title: '📅 Kalendarz',
    description: 'Kalendarz pokazuje nadchodzące wydarzenia — webinary, spotkania zespołu i konsultacje indywidualne. Kliknij na dzień aby zobaczyć szczegóły. Kolorowe kropki oznaczają typ wydarzenia.',
    position: 'bottom',
    visibleFor: allRoles,
    scrollTo: true,
  },
  {
    id: 'my-meetings-widget',
    targetSelector: '[data-tour="my-meetings-widget"]',
    title: '📋 Twoje Spotkania',
    description: 'Lista Twoich nadchodzących spotkań, na które się zapisałeś. Gdy zbliża się czas rozpoczęcia, pojawi się przycisk WEJDŹ z pulsującą zieloną kropką — kliknij go, aby dołączyć.',
    position: 'bottom',
    visibleFor: allRoles,
    scrollTo: true,
  },
  {
    id: 'training-widget',
    targetSelector: '[data-tour="training-widget"]',
    title: '🎓 Postęp Szkolenia',
    description: 'Pasek postępu pokazuje ile modułów szkoleniowych ukończyłeś. Kliknij na konkretny moduł, aby kontynuować naukę. Po ukończeniu wszystkich lekcji w module — zdobędziesz certyfikat!',
    position: 'bottom',
    visibleFor: allRoles,
    scrollTo: true,
  },
  {
    id: 'otp-codes-widget',
    targetSelector: '[data-tour="otp-codes-widget"]',
    title: '🔑 Kody Dostępu OTP',
    description: 'Podgląd aktywnych kodów jednorazowych. Skopiuj kod jednym kliknięciem i wyślij go osobie, której chcesz udostępnić chronione treści (InfoLinki lub Zdrową Wiedzę).',
    position: 'bottom',
    visibleFor: partnerPlus,
    scrollTo: true,
  },
  {
    id: 'resources-widget',
    targetSelector: '[data-tour="resources-widget"]',
    title: '📁 Najnowsze Zasoby',
    description: 'Szybki dostęp do najnowszych materiałów w bibliotece — dokumenty, grafiki, prezentacje. Kliknij aby pobrać plik lub skopiować link do udostępnienia.',
    position: 'bottom',
    visibleFor: allRoles,
    scrollTo: true,
  },
  {
    id: 'team-contacts-widget',
    targetSelector: '[data-tour="team-contacts-widget"]',
    title: '👥 Kontakty Zespołowe',
    description: 'Podgląd Twoich kontaktów w zespole. Kliknij aby zobaczyć pełną listę, wyszukać specjalistę w bazie lub dodać nowy kontakt z notatkami.',
    position: 'bottom',
    visibleFor: partnerPlus,
    scrollTo: true,
  },

  // ============================================================
  // SEKCJA 3: MENU BOCZNE (kolejność w sidebar)
  // ============================================================
  {
    id: 'menu-dashboard',
    targetSelector: '[data-tour="menu-dashboard"]',
    title: '🏠 Strona Główna',
    description: 'Kliknij tutaj, aby wrócić do tego głównego pulpitu z widgetami. To jest Twoja „baza" — zawsze wrócisz tu jednym kliknięciem.',
    position: 'right',
    visibleFor: allRoles,
  },
  {
    id: 'training',
    targetSelector: '[data-tour="menu-academy"]',
    title: '🎓 Akademia',
    description: 'Sekcja szkoleń online — moduły wideo z lekcjami krok po kroku. Ukończ wszystkie lekcje w module aby zdobyć certyfikat PDF do pobrania.',
    position: 'right',
    visibleFor: allRoles,
  },
  {
    id: 'zdrowa-wiedza',
    targetSelector: '[data-tour="menu-healthy-knowledge"]',
    title: '🧬 Zdrowa Wiedza',
    description: 'Biblioteka materiałów o zdrowiu — artykuły, filmy i infografiki. Możesz je przeglądać i udostępniać swoim kontaktom za pomocą kodów OTP. Widget na dashboardzie pokazuje wyróżnione materiały.',
    position: 'right',
    visibleFor: partnerPlus,
  },
  {
    id: 'resources',
    targetSelector: '[data-tour="menu-resources"]',
    title: '📁 Zasoby / Biblioteka',
    description: 'Materiały do pobrania — dokumenty PDF, prezentacje, grafiki marketingowe, pliki do druku. Filtruj po kategoriach i wyszukuj po nazwie.',
    position: 'right',
    visibleFor: allRoles,
  },
  {
    id: 'pure-kontakty',
    targetSelector: '[data-tour="menu-pureContacts"]',
    title: '📇 PureKontakty',
    description: 'System zarządzania kontaktami — dodawaj osoby, przypisuj etapy, planuj follow-upy i rób notatki. AI Kompas podpowie Ci najlepszy moment na kontakt.',
    position: 'right',
    visibleFor: partnerPlus,
  },
  {
    id: 'pure-linki',
    targetSelector: '[data-tour="menu-reflinks"]',
    title: '🔗 PureLinki',
    description: 'Generuj unikalne linki polecające — każdy link śledzi kliknięcia. Skopiuj i wyślij link osobie, którą chcesz zaprosić na platformę. Widget na dashboardzie pokazuje statystyki kliknięć.',
    position: 'right',
    visibleFor: partnerPlus,
  },
  {
    id: 'info-linki',
    targetSelector: '[data-tour="menu-infolinks"]',
    title: '🔗 InfoLinki',
    description: 'Twórz linki z kodem OTP do chronionych treści. Odbiorca wpisuje kod jednorazowy, aby obejrzeć materiały. Widget na dashboardzie pokazuje Twoje aktywne InfoLinki.',
    position: 'right',
    visibleFor: partnerPlus,
  },
  {
    id: 'menu-news',
    targetSelector: '[data-tour="menu-news"]',
    title: '📰 Aktualności',
    description: 'Najnowsze wiadomości i ogłoszenia od zespołu Pure Life. Informacje o zmianach, promocjach, nowych funkcjach i ważnych wydarzeniach.',
    position: 'right',
    visibleFor: allRoles,
  },
  {
    id: 'menu-events',
    targetSelector: '[data-tour="menu-events"]',
    title: '📆 Wydarzenia',
    description: 'Webinary, spotkania zespołowe i konsultacje indywidualne. Zapisz się na wydarzenie aby pojawiło się w Twoim kalendarzu na dashboardzie.',
    position: 'right',
    visibleFor: allRoles,
  },
  {
    id: 'support',
    targetSelector: '[data-tour="menu-support"]',
    title: '🆘 Wsparcie techniczne',
    description: 'Masz pytanie lub napotkałeś problem? Kliknij tutaj, aby wysłać zgłoszenie do zespołu wsparcia. Odpowiemy najszybciej jak to możliwe.',
    position: 'right',
    visibleFor: allRoles,
  },

  // ============================================================
  // SEKCJA 4: STOPKA
  // ============================================================
  {
    id: 'footer',
    targetSelector: '[data-tour="footer-section"]',
    title: '📋 Stopka',
    description: 'Na samym dole strony znajdziesz cytat motywacyjny, dane kontaktowe firmy, linki do regulaminu i polityki prywatności.',
    position: 'top',
    visibleFor: allRoles,
    scrollTo: true,
  },
];

// Get filtered steps based on user role
export const getStepsForRole = (role: string | undefined): TourStep[] => {
  const normalizedRole = (role?.toLowerCase() || 'klient') as UserRole;
  return tourSteps.filter(step => step.visibleFor.includes(normalizedRole));
};
