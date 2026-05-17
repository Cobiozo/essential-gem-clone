// Statyczny rejestr "miejsc" w aplikacji, do których admin może przypisać
// pozycję dolnego paska nawigacji (mobile). Łatwo rozszerzalny.

export interface AppLocation {
  label: string;
  path: string;
  iconName: string; // nazwa ikony lucide-react (PascalCase)
  group?: string;
}

export const APP_LOCATIONS: AppLocation[] = [
  { label: 'Pulpit', path: '/dashboard', iconName: 'LayoutDashboard', group: 'Główne' },
  { label: 'Wiadomości', path: '/messages', iconName: 'MessageCircle', group: 'Główne' },
  { label: 'Powiadomienia', path: '/notifications', iconName: 'Bell', group: 'Główne' },
  { label: 'Profil', path: '/profile', iconName: 'User', group: 'Główne' },
  { label: 'Ustawienia', path: '/settings', iconName: 'Settings', group: 'Główne' },

  { label: 'Eventy', path: '/events', iconName: 'Calendar', group: 'Wydarzenia' },
  { label: 'Webinary', path: '/webinars', iconName: 'Video', group: 'Wydarzenia' },
  { label: 'Spotkania 1:1', path: '/individual-meetings', iconName: 'Users', group: 'Wydarzenia' },
  { label: 'Spotkania zespołowe', path: '/team-meetings', iconName: 'UsersRound', group: 'Wydarzenia' },
  { label: 'Płatne wydarzenia', path: '/paid-events', iconName: 'Ticket', group: 'Wydarzenia' },

  { label: 'Akademia', path: '/academy', iconName: 'GraduationCap', group: 'Wiedza' },
  { label: 'Baza wiedzy', path: '/zdrowa-wiedza', iconName: 'BookOpen', group: 'Wiedza' },
  { label: 'AI Kompas', path: '/ai-compass', iconName: 'Compass', group: 'Wiedza' },

  { label: 'Mój zespół', path: '/team', iconName: 'Users', group: 'Zespół' },
  { label: 'Panel lidera', path: '/leader-panel', iconName: 'Crown', group: 'Zespół' },
  { label: 'Struktura', path: '/organization-tree', iconName: 'Network', group: 'Zespół' },

  { label: 'PureBox / Omega', path: '/purebox', iconName: 'Heart', group: 'Narzędzia' },
  { label: 'Baza testów', path: '/omega-tests', iconName: 'ClipboardList', group: 'Narzędzia' },
  { label: 'Kalkulator', path: '/calculator', iconName: 'Calculator', group: 'Narzędzia' },
  { label: 'Moja strona partnera', path: '/moja-strona', iconName: 'Globe', group: 'Narzędzia' },
  { label: 'Wyszukiwarka specjalistów', path: '/search', iconName: 'Search', group: 'Narzędzia' },
];

// Kuratorska lista ikon lucide do dropdownu (PascalCase).
export const ICON_CHOICES = [
  'Home', 'LayoutDashboard', 'MessageCircle', 'Mail', 'Send',
  'Calendar', 'CalendarDays', 'Clock', 'Ticket',
  'GraduationCap', 'BookOpen', 'Library',
  'Users', 'UsersRound', 'User', 'Crown', 'Network',
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
