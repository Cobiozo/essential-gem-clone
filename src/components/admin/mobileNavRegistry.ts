// Statyczny rejestr realnych "miejsc" w aplikacji, do których admin może
// przypisać pozycję dolnego paska nawigacji (mobile).
// Ścieżki MUSZĄ odpowiadać trasom z src/App.tsx.

export interface AppLocation {
  label: string;
  path: string;
  iconName: string; // nazwa ikony lucide-react (PascalCase)
  group?: string;
}

export const APP_LOCATIONS: AppLocation[] = [
  // Główne
  { label: 'Pulpit', path: '/dashboard', iconName: 'LayoutDashboard', group: 'Główne' },
  { label: 'Wiadomości', path: '/messages', iconName: 'MessageCircle', group: 'Główne' },
  { label: 'Moje konto', path: '/my-account', iconName: 'User', group: 'Główne' },
  { label: 'Powiadomienia', path: '/my-account?tab=notifications', iconName: 'Bell', group: 'Główne' },
  { label: 'Profil', path: '/my-account?tab=profile', iconName: 'IdCard', group: 'Główne' },
  { label: 'Preferencje', path: '/my-account?tab=preferences', iconName: 'Settings', group: 'Główne' },
  { label: 'Bezpieczeństwo', path: '/my-account?tab=security', iconName: 'Shield', group: 'Główne' },
  { label: 'Aktualności', path: '/aktualnosci', iconName: 'Newspaper', group: 'Główne' },

  // Wydarzenia
  { label: 'Webinary', path: '/events/webinars', iconName: 'Video', group: 'Wydarzenia' },
  { label: 'Spotkania 1:1', path: '/events/individual-meetings', iconName: 'Users', group: 'Wydarzenia' },
  { label: 'Spotkania zespołowe', path: '/events/team-meetings', iconName: 'UsersRound', group: 'Wydarzenia' },
  { label: 'Płatne wydarzenia', path: '/paid-events', iconName: 'Ticket', group: 'Wydarzenia' },

  // Wiedza
  { label: 'Akademia', path: '/training', iconName: 'GraduationCap', group: 'Wiedza' },
  { label: 'Zdrowa Wiedza', path: '/zdrowa-wiedza', iconName: 'BookOpen', group: 'Wiedza' },
  { label: 'Centrum wiedzy', path: '/knowledge', iconName: 'Library', group: 'Wiedza' },
  { label: 'AI Kompas', path: '/my-account?tab=ai-compass', iconName: 'Compass', group: 'Wiedza' },

  // Zespół
  { label: 'Mój zespół', path: '/my-account?tab=team-contacts', iconName: 'Users', group: 'Zespół' },
  { label: 'Struktura', path: '/my-account?tab=team-contacts&subTab=structure', iconName: 'Network', group: 'Zespół' },
  { label: 'Panel lidera', path: '/leader', iconName: 'Crown', group: 'Zespół' },
  { label: 'Reflinki', path: '/my-account?tab=reflinks', iconName: 'Link', group: 'Zespół' },

  // Narzędzia
  { label: 'PureBox / Omega Base', path: '/omega-base', iconName: 'Heart', group: 'Narzędzia' },
  { label: 'Moje testy (Omega)', path: '/moje-testy', iconName: 'ClipboardList', group: 'Narzędzia' },
  { label: 'Kalkulator influencera', path: '/calculator/influencer', iconName: 'Calculator', group: 'Narzędzia' },
  { label: 'Kalkulator specjalisty', path: '/calculator/specialist', iconName: 'Calculator', group: 'Narzędzia' },
  { label: 'Moja strona partnera', path: '/moja-strona', iconName: 'Globe', group: 'Narzędzia' },
  { label: 'Ocena umiejętności', path: '/skills-assessment', iconName: 'Award', group: 'Narzędzia' },

  // Administracja
  { label: 'Panel admina', path: '/admin', iconName: 'Shield', group: 'Administracja' },
];

// Kuratorska lista ikon lucide do dropdownu (PascalCase).
export const ICON_CHOICES = [
  'Home', 'LayoutDashboard', 'MessageCircle', 'Mail', 'Send',
  'Calendar', 'CalendarDays', 'Clock', 'Ticket',
  'GraduationCap', 'BookOpen', 'Library',
  'Users', 'UsersRound', 'User', 'IdCard', 'Crown', 'Network',
  'Settings', 'Wrench', 'Bell', 'BellRing',
  'Heart', 'Activity', 'Stethoscope', 'Pill',
  'Map', 'MapPin', 'Compass', 'Globe',
  'Phone', 'Video', 'Mic', 'Headphones', 'Image',
  'FileText', 'Folder', 'ClipboardList', 'CheckSquare',
  'Search', 'Filter', 'Star', 'Bookmark', 'Flag', 'Tag',
  'ShoppingBag', 'ShoppingCart', 'Package', 'Wallet', 'CreditCard',
  'Briefcase', 'Building2', 'Newspaper', 'Trophy', 'Award', 'Gift',
  'BarChart', 'BarChart3', 'PieChart', 'LineChart', 'TrendingUp',
  'Sparkles', 'Zap', 'Sun', 'Moon', 'Cloud',
  'Plus', 'Menu', 'Grid', 'List', 'Box', 'Layers', 'Link',
  'Smartphone', 'Shield', 'HelpCircle', 'Info', 'Circle',
  'Calculator',
];
