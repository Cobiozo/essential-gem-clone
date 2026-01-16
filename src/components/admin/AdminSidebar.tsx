import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeSelector } from '@/components/ThemeSelector';
import { LanguageSelector } from '@/components/LanguageSelector';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  Settings2,
  Type,
  Palette,
  FileText,
  Users,
  BookOpen,
  Award,
  FolderOpen,
  Cookie,
  Compass,
  Sparkles,
  AlertTriangle,
  Languages,
  Bell,
  Mail,
  Home,
  LogOut,
  LayoutDashboard,
  Wrench,
  UserCircle,
  ChevronDown,
  Clock,
  CalendarDays,
  HelpCircle,
  UserPlus,
} from 'lucide-react';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';

// Hardcoded translations for sidebar - avoids missing translation keys
const SIDEBAR_LABELS: Record<string, Record<string, string>> = {
  pl: {
    content: 'Treść',
    layout: 'Układ stron',
    appearance: 'Wygląd',
    usersCategory: 'Użytkownicy',
    training: 'Szkolenia',
    trainings: 'Szkolenia',
    certificates: 'Certyfikaty',
    resources: 'Zasoby wiedzy',
    features: 'Funkcje',
    dailySignal: 'Sygnał dnia',
    importantInfo: 'Ważne informacje',
    events: 'Wydarzenia',
    guestRegistrations: 'Rejestracje gości',
    communication: 'Komunikacja',
    translations: 'Tłumaczenia',
    teamContacts: 'Kontakty zespołu',
    notifications: 'Powiadomienia',
    system: 'System',
    maintenance: 'Tryb konserwacji',
    cronJobs: 'Zadania Cron',
    cookies: 'Cookies',
    email: 'E-mail',
    compass: 'Kompas AI',
    home: 'Strona główna',
    main: 'Główne',
    pages: 'Strony',
    colors: 'Kolory',
    settings: 'Ustawienia',
    users: 'Użytkownicy',
    account: 'Konto',
    logout: 'Wyloguj',
    support: 'Wsparcie i pomoc',
    dashboardFooter: 'Stopka dashboardu',
  },
  en: {
    content: 'Content',
    layout: 'Page layout',
    appearance: 'Appearance',
    usersCategory: 'Users',
    training: 'Training',
    trainings: 'Trainings',
    certificates: 'Certificates',
    resources: 'Knowledge resources',
    features: 'Features',
    dailySignal: 'Daily signal',
    importantInfo: 'Important info',
    events: 'Events',
    guestRegistrations: 'Guest Registrations',
    communication: 'Communication',
    translations: 'Translations',
    teamContacts: 'Team contacts',
    notifications: 'Notifications',
    system: 'System',
    maintenance: 'Maintenance mode',
    cronJobs: 'Cron Jobs',
    cookies: 'Cookies',
    email: 'E-mail',
    compass: 'AI Compass',
    home: 'Home',
    main: 'Main',
    pages: 'Pages',
    colors: 'Colors',
    settings: 'Settings',
    users: 'Users',
    account: 'Account',
    logout: 'Logout',
    support: 'Support & Help',
    dashboardFooter: 'Dashboard Footer',
  },
};

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  siteLogo?: string;
}

interface NavItem {
  value: string;
  labelKey: string; // key in SIDEBAR_LABELS
  icon: React.ElementType;
}

interface NavCategory {
  id: string;
  labelKey: string; // key in SIDEBAR_LABELS
  icon: React.ElementType;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navCategories: NavCategory[] = [
  {
    id: 'content',
    labelKey: 'content',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { value: 'content', labelKey: 'main', icon: Settings2 },
      { value: 'layout', labelKey: 'layout', icon: Type },
      { value: 'pages', labelKey: 'pages', icon: FileText },
      { value: 'dashboard-footer', labelKey: 'dashboardFooter', icon: LayoutDashboard },
    ],
  },
  {
    id: 'appearance',
    labelKey: 'appearance',
    icon: Palette,
    items: [
      { value: 'colors', labelKey: 'colors', icon: Palette },
      { value: 'settings', labelKey: 'settings', icon: Settings2 },
    ],
  },
  {
    id: 'users',
    labelKey: 'usersCategory',
    icon: Users,
    items: [
      { value: 'users', labelKey: 'users', icon: Users },
      { value: 'account', labelKey: 'account', icon: UserCircle },
    ],
  },
  {
    id: 'training',
    labelKey: 'training',
    icon: BookOpen,
    items: [
      { value: 'training', labelKey: 'trainings', icon: BookOpen },
      { value: 'certificates', labelKey: 'certificates', icon: Award },
      { value: 'knowledge', labelKey: 'resources', icon: FolderOpen },
    ],
  },
  {
    id: 'features',
    labelKey: 'features',
    icon: Sparkles,
    items: [
      { value: 'cookies', labelKey: 'cookies', icon: Cookie },
      { value: 'ai-compass', labelKey: 'compass', icon: Compass },
      { value: 'daily-signal', labelKey: 'dailySignal', icon: Sparkles },
      { value: 'important-info', labelKey: 'importantInfo', icon: AlertTriangle },
      { value: 'events', labelKey: 'events', icon: CalendarDays },
      { value: 'guest-registrations', labelKey: 'guestRegistrations', icon: UserPlus },
    ],
  },
  {
    id: 'communication',
    labelKey: 'communication',
    icon: Mail,
    items: [
      { value: 'translations', labelKey: 'translations', icon: Languages },
      { value: 'team-contacts', labelKey: 'teamContacts', icon: Users },
      { value: 'notifications', labelKey: 'notifications', icon: Bell },
      { value: 'emails', labelKey: 'email', icon: Mail },
      { value: 'support', labelKey: 'support', icon: HelpCircle },
    ],
  },
  {
    id: 'system',
    labelKey: 'system',
    icon: Wrench,
    items: [
      { value: 'maintenance', labelKey: 'maintenance', icon: Settings2 },
      { value: 'cron-jobs', labelKey: 'cronJobs', icon: Clock },
    ],
  },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  onSignOut,
  siteLogo,
}) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Track which categories are open
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navCategories.forEach((cat) => {
      const containsActive = cat.items.some((item) => item.value === activeTab);
      initial[cat.id] = containsActive || cat.defaultOpen || false;
    });
    return initial;
  });

  // Get translated label from hardcoded translations
  const getLabel = (key: string): string => {
    const langLabels = SIDEBAR_LABELS[language] || SIDEBAR_LABELS['pl'];
    return langLabels[key] || key;
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Handle tab change - close sidebar on mobile
  const handleTabChange = (value: string) => {
    onTabChange(value);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Handle navigation - close sidebar on mobile
  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-2">
          <img 
            src={siteLogo || newPureLifeLogo} 
            alt="Pure Life" 
            className="w-8 h-8 flex-shrink-0" 
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">Panel Administracyjny</span>
              <span className="text-xs text-muted-foreground">Administrator</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Home link */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleNavigate('/')}
                  tooltip={getLabel('home')}
                >
                  <Home className="w-4 h-4" />
                  <span>{getLabel('home')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        {/* Navigation categories */}
        {navCategories.map((category) => (
          <Collapsible
            key={category.id}
            open={openCategories[category.id]}
            onOpenChange={() => toggleCategory(category.id)}
          >
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1.5 w-full justify-between">
                  <div className="flex items-center gap-2">
                    <category.icon className="w-4 h-4" />
                    {!isCollapsed && <span>{getLabel(category.labelKey)}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform",
                        openCategories[category.id] && "rotate-180"
                      )}
                    />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {category.items.map((item) => (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          onClick={() => handleTabChange(item.value)}
                          isActive={activeTab === item.value}
                          tooltip={getLabel(item.labelKey)}
                          className={cn(
                            activeTab === item.value && 'bg-primary/10 text-primary font-medium'
                          )}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{getLabel(item.labelKey)}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className={cn(
          "flex items-center gap-2 p-2",
          isCollapsed ? "flex-col" : "flex-row justify-between"
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <ThemeSelector />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              isCollapsed && "w-full justify-center"
            )}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="ml-2">{getLabel('logout')}</span>}
          </Button>
        </div>
        {isCollapsed && (
          <div className="flex flex-col items-center gap-2 p-2">
            <LanguageSelector />
            <ThemeSelector />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
