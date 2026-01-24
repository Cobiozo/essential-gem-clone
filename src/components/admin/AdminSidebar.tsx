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
  FileCode,
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
  Calculator,
  MessageSquare,
  Images,
  Heart,
  TreePine,
} from 'lucide-react';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';

// Translation keys for sidebar navigation
const SIDEBAR_KEYS = {
  content: 'admin.sidebar.content',
  layout: 'admin.sidebar.layout',
  appearance: 'admin.sidebar.appearance',
  usersCategory: 'admin.sidebar.usersCategory',
  training: 'admin.sidebar.training',
  trainings: 'admin.sidebar.trainings',
  certificates: 'admin.sidebar.certificates',
  resources: 'admin.sidebar.resources',
  features: 'admin.sidebar.features',
  dailySignal: 'admin.sidebar.dailySignal',
  importantInfo: 'admin.sidebar.importantInfo',
  events: 'admin.sidebar.events',
  guestRegistrations: 'admin.sidebar.guestRegistrations',
  communication: 'admin.sidebar.communication',
  translations: 'admin.sidebar.translations',
  teamContacts: 'admin.sidebar.teamContacts',
  notifications: 'admin.sidebar.notifications',
  system: 'admin.sidebar.system',
  systemHealth: 'admin.sidebar.systemHealth',
  maintenance: 'admin.sidebar.maintenance',
  cronJobs: 'admin.sidebar.cronJobs',
  googleCalendar: 'admin.sidebar.googleCalendar',
  cookies: 'admin.sidebar.cookies',
  email: 'admin.sidebar.email',
  compass: 'admin.sidebar.compass',
  home: 'admin.sidebar.home',
  main: 'admin.sidebar.main',
  pages: 'admin.sidebar.pages',
  colors: 'admin.sidebar.colors',
  settings: 'admin.sidebar.settings',
  users: 'admin.sidebar.users',
  account: 'admin.sidebar.account',
  logout: 'admin.sidebar.logout',
  support: 'admin.sidebar.support',
  dashboardFooter: 'admin.sidebar.dashboardFooter',
  adminPanel: 'admin.sidebar.adminPanel',
  administrator: 'admin.sidebar.administrator',
  calculator: 'admin.sidebar.calculator',
  chatPermissions: 'admin.sidebar.chatPermissions',
  sidebarIcons: 'admin.sidebar.sidebarIcons',
  mediaLibrary: 'admin.sidebar.mediaLibrary',
  htmlPages: 'admin.sidebar.htmlPages',
  specialistCalculator: 'admin.sidebar.specialistCalculator',
  healthyKnowledge: 'admin.sidebar.healthyKnowledge',
  organizationTree: 'admin.sidebar.organizationTree',
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
      { value: 'html-pages', labelKey: 'htmlPages', icon: FileCode },
      { value: 'dashboard-footer', labelKey: 'dashboardFooter', icon: LayoutDashboard },
      { value: 'sidebar-icons', labelKey: 'sidebarIcons', icon: Palette },
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
      { value: 'media-library', labelKey: 'mediaLibrary', icon: Images },
      { value: 'healthy-knowledge', labelKey: 'healthyKnowledge', icon: Heart },
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
      { value: 'calculator', labelKey: 'calculator', icon: Calculator },
      { value: 'specialist-calculator', labelKey: 'specialistCalculator', icon: Calculator },
      { value: 'organization-tree', labelKey: 'organizationTree', icon: TreePine },
    ],
  },
  {
    id: 'communication',
    labelKey: 'communication',
    icon: Mail,
    items: [
      { value: 'translations', labelKey: 'translations', icon: Languages },
      { value: 'team-contacts', labelKey: 'teamContacts', icon: Users },
      { value: 'chat-permissions', labelKey: 'chatPermissions', icon: MessageSquare },
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
      { value: 'system-health', labelKey: 'systemHealth', icon: AlertTriangle },
      { value: 'maintenance', labelKey: 'maintenance', icon: Settings2 },
      { value: 'cron-jobs', labelKey: 'cronJobs', icon: Clock },
      { value: 'google-calendar', labelKey: 'googleCalendar', icon: CalendarDays },
    ],
  },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  onSignOut,
  siteLogo,
}) => {
  const { t } = useLanguage();
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

  // Get translated label using t() function
  // Hardcoded labels for features without i18n translations
  const hardcodedLabels: Record<string, string> = {
    calculator: 'Kalkulator Influencerów',
    specialistCalculator: 'Kalkulator Specjalistów',
    chatPermissions: 'Kierunki komunikacji',
    sidebarIcons: 'Ikony paska bocznego',
    healthyKnowledge: 'Zdrowa Wiedza',
    systemHealth: 'Alerty systemowe',
    htmlPages: 'Strony HTML',
    organizationTree: 'Struktura organizacji',
  };

  const getLabel = (key: string): string => {
    if (hardcodedLabels[key]) return hardcodedLabels[key];
    const translationKey = SIDEBAR_KEYS[key as keyof typeof SIDEBAR_KEYS];
    return translationKey ? t(translationKey) : key;
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
              <span className="font-semibold text-sm truncate">{getLabel('adminPanel')}</span>
              <span className="text-xs text-muted-foreground">{getLabel('administrator')}</span>
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
