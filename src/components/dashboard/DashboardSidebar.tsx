import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  GraduationCap,
  FolderOpen,
  Users,
  Users2,
  Newspaper,
  CalendarDays,
  MessageSquare,
  HelpCircle,
  Link2,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  Info,
  Contact,
  Search,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserProfileCard } from './UserProfileCard';
import { supabase } from '@/integrations/supabase/client';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';

interface SubMenuItem {
  id: string;
  labelKey: string;
  path: string;
  icon?: React.ElementType;
}

interface MenuItem {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  path?: string;
  tab?: string;
  action?: () => void;
  visibleFor?: string[];
  hasSubmenu?: boolean;
  submenuItems?: SubMenuItem[];
}

export const DashboardSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, isPartner, isSpecjalista, isClient, userRole, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { state, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Visibility settings
  const [aiCompassVisible, setAiCompassVisible] = useState(false);
  const [canGenerateReflinks, setCanGenerateReflinks] = useState(false);
  const [hasInfoLinks, setHasInfoLinks] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  useEffect(() => {
    const fetchVisibility = async () => {
      // AI Compass visibility
      const { data: compassSettings } = await supabase
        .from('ai_compass_settings')
        .select('is_enabled, enabled_for_clients, enabled_for_partners, enabled_for_specjalista')
        .limit(1)
        .maybeSingle();

      if (compassSettings?.is_enabled) {
        const role = userRole?.role?.toLowerCase();
        const visible =
          (role === 'client' && compassSettings.enabled_for_clients) ||
          (role === 'partner' && compassSettings.enabled_for_partners) ||
          (role === 'specjalista' && compassSettings.enabled_for_specjalista);
        setAiCompassVisible(visible);
      }

      // Reflinks visibility
      if (userRole?.role) {
        const { data: reflinkSettings } = await supabase
          .from('reflink_generation_settings')
          .select('can_generate')
          .eq('role', userRole.role as 'admin' | 'partner' | 'specjalista' | 'client' | 'user')
          .single();
        setCanGenerateReflinks(reflinkSettings?.can_generate || false);

        // Check if there are info links for this role
        const { count } = await supabase
          .from('reflinks')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
          .contains('visible_to_roles', [userRole.role]);
        setHasInfoLinks((count || 0) > 0);
      }
    };

    if (userRole) {
      fetchVisibility();
    }
  }, [userRole]);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard.menu.dashboard', path: '/dashboard' },
    { id: 'academy', icon: GraduationCap, labelKey: 'dashboard.menu.academy', path: '/training' },
    { id: 'resources', icon: FolderOpen, labelKey: 'dashboard.menu.resources', path: '/knowledge' },
    { 
      id: 'pureContacts', 
      icon: Users, 
      labelKey: 'dashboard.menu.pureContacts',
      hasSubmenu: true,
      submenuItems: [
        { id: 'private-contacts', labelKey: 'dashboard.menu.privateContacts', path: '/my-account?tab=team-contacts&subTab=private', icon: Contact },
        { id: 'team-contacts', labelKey: 'dashboard.menu.teamContacts', path: '/my-account?tab=team-contacts&subTab=team', icon: Users },
        { id: 'search-specialist', labelKey: 'dashboard.menu.searchSpecialist', path: '/my-account?tab=team-contacts&subTab=search', icon: Search },
      ],
      visibleFor: ['partner', 'specjalista', 'admin']
    },
    { id: 'news', icon: Newspaper, labelKey: 'dashboard.menu.news', path: '/page/aktualnosci' },
    { id: 'calendar', icon: CalendarDays, labelKey: 'dashboard.menu.calendar', path: '/page/terminarz' },
    { 
      id: 'chat', 
      icon: MessageSquare, 
      labelKey: 'dashboard.menu.chat', 
      path: '/my-account', 
      tab: 'private-chats',
      visibleFor: ['specjalista', 'admin']
    },
    { id: 'support', icon: HelpCircle, labelKey: 'dashboard.menu.support', action: () => {
      // Open chat widget - dispatch custom event
      window.dispatchEvent(new CustomEvent('openSupportChat'));
    }},
    { 
      id: 'reflinks', 
      icon: Link2, 
      labelKey: 'dashboard.pureLinki', 
      path: '/my-account', 
      tab: 'reflinks',
    },
    { 
      id: 'infolinks', 
      icon: Info, 
      labelKey: 'dashboard.menu.infolinks', 
      path: '/my-account', 
      tab: 'reflinks',
    },
    { 
      id: 'community', 
      icon: Users2, 
      labelKey: 'dashboard.menu.community', 
      path: '/page/spolecznosc',
    },
    { id: 'settings', icon: Settings, labelKey: 'dashboard.menu.settings', path: '/my-account', tab: 'profile' },
    { 
      id: 'admin', 
      icon: Shield, 
      labelKey: 'dashboard.menu.admin', 
      path: '/admin',
      visibleFor: ['admin']
    },
  ];

  // Filter menu items based on visibility
  const visibleMenuItems = menuItems.filter(item => {
    // Check role-based visibility
    if (item.visibleFor) {
      const role = userRole?.role?.toLowerCase();
      if (!item.visibleFor.includes(role || '')) {
        // Special case for team - also visible to clients with specialist search access
        if (item.id === 'team' && isClient) {
          return true; // Client can see if they have search access (handled in component)
        }
        return false;
      }
    }

    // Check reflinks visibility
    if (item.id === 'reflinks' && !canGenerateReflinks) {
      return false;
    }

    // Check infolinks visibility
    if (item.id === 'infolinks' && !hasInfoLinks) {
      return false;
    }

    return true;
  });

  const handleMenuClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      const url = item.tab ? `${item.path}?tab=${item.tab}` : item.path;
      navigate(url);
    }
    setOpenMobile(false);
  };

  const handleSubmenuClick = (subItem: SubMenuItem) => {
    navigate(subItem.path);
    setOpenMobile(false);
  };

  const isActive = (item: MenuItem) => {
    // Handle external page paths (like /page/terminarz)
    if (item.path?.startsWith('/page/')) {
      return location.pathname === item.path;
    }
    if (item.path === '/dashboard' && !item.tab) {
      return location.pathname === '/dashboard';
    }
    if (item.tab) {
      const searchParams = new URLSearchParams(location.search);
      return location.pathname === item.path && searchParams.get('tab') === item.tab;
    }
    return location.pathname === item.path;
  };

  const isSubmenuActive = (subItem: SubMenuItem) => {
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab');
    const currentSubTab = searchParams.get('subTab');
    
    if (subItem.id === 'private-contacts') {
      return location.pathname === '/my-account' && currentTab === 'team-contacts' && currentSubTab === 'private';
    }
    if (subItem.id === 'team-contacts') {
      return location.pathname === '/my-account' && currentTab === 'team-contacts' && currentSubTab === 'team';
    }
    if (subItem.id === 'search-specialist') {
      return location.pathname === '/my-account' && currentTab === 'team-contacts' && currentSubTab === 'search';
    }
    return false;
  };

  const isSubmenuParentActive = (item: MenuItem) => {
    if (!item.submenuItems) return false;
    return item.submenuItems.some(sub => isSubmenuActive(sub));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      {/* Logo Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <img 
            src={newPureLifeLogo} 
            alt="Pure Life" 
            className="h-10 w-10 min-w-[40px] min-h-[40px] flex-shrink-0 object-contain"
          />
          {!isCollapsed && (
            <span className="font-bold text-lg text-sidebar-foreground">
              PURE LIFE
            </span>
          )}
        </div>
      </SidebarHeader>

      {/* User Profile Card */}
      <UserProfileCard />

      {/* Navigation Menu */}
      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {visibleMenuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              {item.hasSubmenu && item.submenuItems ? (
                <Collapsible
                  open={openSubmenu === item.id || isSubmenuParentActive(item)}
                  onOpenChange={(open) => setOpenSubmenu(open ? item.id : null)}
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={t(item.labelKey)}
                      isActive={isSubmenuParentActive(item)}
                      className="transition-colors hover:bg-primary/10 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{t(item.labelKey)}</span>
                      <ChevronDown 
                        className={`h-4 w-4 transition-transform ${openSubmenu === item.id || isSubmenuParentActive(item) ? 'rotate-180' : ''}`} 
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.submenuItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.id}>
                          <SidebarMenuSubButton
                            onClick={() => handleSubmenuClick(subItem)}
                            isActive={isSubmenuActive(subItem)}
                            className="cursor-pointer"
                          >
                            {subItem.icon && <subItem.icon className="h-4 w-4 mr-2" />}
                            {t(subItem.labelKey)}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <SidebarMenuButton
                  onClick={() => handleMenuClick(item)}
                  isActive={isActive(item)}
                  tooltip={t(item.labelKey)}
                  className="transition-colors hover:bg-primary/10 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{t(item.labelKey)}</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer with Sign Out */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip={t('nav.logout')}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('nav.logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
