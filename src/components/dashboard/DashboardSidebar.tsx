import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  FolderOpen,
  Users,
  Newspaper,
  Calendar,
  MessageSquare,
  HelpCircle,
  Link2,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemTexts } from '@/hooks/useSystemTexts';
import { UserProfileCard } from './UserProfileCard';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  anchor?: string;
  roles: string[];
  disabled?: boolean;
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Pulpit', path: '/', roles: ['all'] },
  { icon: GraduationCap, label: 'Akademia', path: '/training', roles: ['client', 'partner', 'specjalista', 'admin'] },
  { icon: FolderOpen, label: 'Zasoby', path: '/knowledge', roles: ['client', 'partner', 'specjalista', 'admin'] },
  { icon: Users, label: 'Członkowie zespołu', path: '/my-account', roles: ['partner', 'specjalista', 'admin'] },
  { icon: Newspaper, label: 'Aktualności', anchor: '#news', roles: ['all'] },
  { icon: Calendar, label: 'Terminarz', path: '/calendar', roles: ['all'], disabled: true },
  { icon: MessageSquare, label: 'Czat', path: '/my-account', roles: ['specjalista', 'admin'] },
  { icon: HelpCircle, label: 'Wsparcie i Pomoc', anchor: '#support', roles: ['all'] },
  { icon: Link2, label: 'Twoje Linki', path: '/my-account', roles: ['partner', 'specjalista', 'admin'] },
  { icon: Settings, label: 'Ustawienia', path: '/my-account', roles: ['all'] },
];

export const DashboardSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, isAdmin } = useAuth();
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const { data: systemTextsData = [] } = useSystemTexts();
  
  const isCollapsed = state === 'collapsed';
  const currentRole = userRole?.role || 'client';

  // Get site logo from system texts
  const siteLogo = React.useMemo(() => {
    const logoSystemText = systemTextsData.find(item => item.type === 'site_logo');
    return logoSystemText?.content || newPureLifeLogo;
  }, [systemTextsData]);

  const isItemVisible = (item: MenuItem): boolean => {
    if (item.roles.includes('all')) return true;
    if (isAdmin) return true;
    return item.roles.includes(currentRole);
  };

  const isActive = (item: MenuItem): boolean => {
    if (item.path === '/') {
      return location.pathname === '/';
    }
    if (item.path) {
      return location.pathname.startsWith(item.path);
    }
    return false;
  };

  const handleClick = (item: MenuItem) => {
    if (item.disabled) return;
    
    // Close mobile sidebar after navigation
    if (isMobile) {
      setOpenMobile(false);
    }

    if (item.anchor) {
      // Navigate to home and scroll to anchor
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const element = document.querySelector(item.anchor!);
          element?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const element = document.querySelector(item.anchor);
        element?.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (item.path) {
      // Handle special cases for MyAccount tabs
      if (item.label === 'Członkowie zespołu') {
        navigate('/my-account?tab=team-contacts');
      } else if (item.label === 'Czat') {
        navigate('/my-account?tab=private-chats');
      } else if (item.label === 'Twoje Linki') {
        navigate('/my-account?tab=reflinks');
      } else if (item.label === 'Ustawienia') {
        navigate('/my-account?tab=profile');
      } else {
        navigate(item.path);
      }
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 px-2 py-3",
          isCollapsed && "justify-center"
        )}>
          <img 
            src={siteLogo} 
            alt="Pure Life" 
            className="h-8 w-8 object-contain flex-shrink-0"
          />
          {!isCollapsed && (
            <span className="font-bold text-sm text-sidebar-foreground uppercase tracking-wide">
              PURE LIFE
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* User Profile Card */}
        <UserProfileCard />
        
        <SidebarSeparator />

        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.filter(isItemVisible).map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      onClick={() => handleClick(item)}
                      isActive={active}
                      disabled={item.disabled}
                      tooltip={item.label}
                      className={cn(
                        "cursor-pointer transition-all duration-200",
                        active && "bg-primary/10 text-primary font-medium border-l-2 border-primary",
                        item.disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4 flex-shrink-0",
                        active && "text-primary"
                      )} />
                      <span>{item.label}</span>
                      {item.disabled && !isCollapsed && (
                        <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Wkrótce
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with collapse toggle */}
      <SidebarFooter className="border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center h-10"
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform duration-200",
            isCollapsed && "rotate-180"
          )} />
          {!isCollapsed && (
            <span className="ml-2 text-xs text-muted-foreground">Zwiń</span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
