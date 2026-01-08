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
} from 'lucide-react';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';
interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  siteLogo?: string;
}

interface NavItem {
  value: string;
  label: string;
  icon: React.ElementType;
}

interface NavCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navCategories: NavCategory[] = [
  {
    id: 'content',
    label: 'admin.sidebar.content',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { value: 'content', label: 'admin.main', icon: Settings2 },
      { value: 'layout', label: 'admin.sidebar.layout', icon: Type },
      { value: 'pages', label: 'admin.pages', icon: FileText },
    ],
  },
  {
    id: 'appearance',
    label: 'admin.sidebar.appearance',
    icon: Palette,
    items: [
      { value: 'colors', label: 'admin.colors', icon: Palette },
      { value: 'settings', label: 'admin.settings', icon: Settings2 },
    ],
  },
  {
    id: 'users',
    label: 'admin.sidebar.usersCategory',
    icon: Users,
    items: [
      { value: 'users', label: 'admin.users', icon: Users },
      { value: 'account', label: 'admin.account', icon: UserCircle },
    ],
  },
  {
    id: 'training',
    label: 'admin.sidebar.training',
    icon: BookOpen,
    items: [
      { value: 'training', label: 'admin.sidebar.trainings', icon: BookOpen },
      { value: 'certificates', label: 'admin.sidebar.certificates', icon: Award },
      { value: 'knowledge', label: 'admin.sidebar.resources', icon: FolderOpen },
    ],
  },
  {
    id: 'features',
    label: 'admin.sidebar.features',
    icon: Sparkles,
    items: [
      { value: 'cookies', label: 'Cookies', icon: Cookie },
      { value: 'ai-compass', label: 'AI-Compass', icon: Compass },
      { value: 'daily-signal', label: 'admin.sidebar.dailySignal', icon: Sparkles },
      { value: 'important-info', label: 'admin.sidebar.importantInfo', icon: AlertTriangle },
    ],
  },
  {
    id: 'communication',
    label: 'admin.sidebar.communication',
    icon: Mail,
    items: [
      { value: 'translations', label: 'admin.sidebar.translations', icon: Languages },
      { value: 'team-contacts', label: 'admin.sidebar.teamContacts', icon: Users },
      { value: 'notifications', label: 'admin.sidebar.notifications', icon: Bell },
      { value: 'emails', label: 'E-mail', icon: Mail },
    ],
  },
  {
    id: 'system',
    label: 'admin.sidebar.system',
    icon: Wrench,
    items: [
      { value: 'maintenance', label: 'admin.sidebar.maintenance', icon: Settings2 },
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
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Track which categories are open
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navCategories.forEach((cat) => {
      // Open category if it contains active tab or has defaultOpen
      const containsActive = cat.items.some((item) => item.value === activeTab);
      initial[cat.id] = containsActive || cat.defaultOpen || false;
    });
    return initial;
  });

  const getTranslatedLabel = (key: string): string => {
    const translated = t(key);
    return translated !== key ? translated : key.split('.').pop() || key;
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
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
              <span className="font-semibold text-sm truncate">{t('admin.title')}</span>
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
                  onClick={() => navigate('/')}
                  tooltip={t('nav.home')}
                >
                  <Home className="w-4 h-4" />
                  <span>{t('nav.home')}</span>
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
                    {!isCollapsed && <span>{getTranslatedLabel(category.label)}</span>}
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
                          onClick={() => onTabChange(item.value)}
                          isActive={activeTab === item.value}
                          tooltip={getTranslatedLabel(item.label)}
                          className={cn(
                            activeTab === item.value && 'bg-primary/10 text-primary font-medium'
                          )}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{getTranslatedLabel(item.label)}</span>
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
            {!isCollapsed && <span className="ml-2">{t('nav.logout')}</span>}
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
