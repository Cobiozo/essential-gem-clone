import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FolderOpen,
  Compass,
  Link2,
  Settings,
  LogOut,
  BookOpen,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    path: '/',
    roles: ['admin', 'partner', 'client', 'specjalista']
  },
  { 
    id: 'team', 
    label: 'Członkowie zespołu', 
    icon: Users, 
    path: '/moje-konto?tab=team',
    roles: ['admin', 'partner', 'specjalista']
  },
  { 
    id: 'training', 
    label: 'Akademia', 
    icon: GraduationCap, 
    path: '/szkolenia',
    roles: ['admin', 'partner', 'client', 'specjalista']
  },
  { 
    id: 'resources', 
    label: 'Zasoby wiedzy', 
    icon: FolderOpen, 
    path: '/centrum-wiedzy',
    roles: ['admin', 'partner', 'client', 'specjalista']
  },
  { 
    id: 'compass', 
    label: 'Kompas AI', 
    icon: Compass, 
    path: '/moje-konto?tab=compass',
    roles: ['admin', 'partner', 'specjalista']
  },
  { 
    id: 'reflinks', 
    label: 'Moje reflinki', 
    icon: Link2, 
    path: '/moje-konto?tab=reflinks',
    roles: ['admin', 'partner', 'specjalista']
  },
  { 
    id: 'account', 
    label: 'Moje konto', 
    icon: Settings, 
    path: '/moje-konto',
    roles: ['admin', 'partner', 'client', 'specjalista']
  },
];

const adminItems = [
  { 
    id: 'admin', 
    label: 'Panel admina', 
    icon: Shield, 
    path: '/admin',
    roles: ['admin']
  },
];

export const DashboardSidebar: React.FC = () => {
  const { profile, userRole, signOut, isAdmin, isPartner, isSpecjalista, isClient } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const currentRole = userRole?.role || profile?.role || 'client';
  
  const getRoleLabel = () => {
    if (isAdmin) return 'Administrator';
    if (isSpecjalista) return 'Specjalista';
    if (isPartner) return 'Partner';
    return 'Klient';
  };

  const getRoleBadgeVariant = () => {
    if (isAdmin) return 'destructive';
    if (isSpecjalista) return 'default';
    if (isPartner) return 'secondary';
    return 'outline';
  };

  const getInitials = () => {
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return profile?.email?.[0]?.toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile?.email || 'Użytkownik';
  };

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(currentRole)
  );

  const filteredAdminItems = adminItems.filter(item => 
    item.roles.includes(currentRole)
  );

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path.split('?')[0]);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      {/* User Profile Header */}
      <SidebarHeader className="p-4">
        <div className={cn(
          "flex items-center gap-3 transition-all",
          isCollapsed && "justify-center"
        )}>
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate text-sm">
                {getDisplayName()}
              </p>
              <Badge variant={getRoleBadgeVariant()} className="text-xs mt-1">
                {getRoleLabel()}
              </Badge>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="mx-4" />

      {/* Main Navigation */}
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.path)}
                    isActive={isActive(item.path)}
                    tooltip={item.label}
                    className={cn(
                      "transition-all duration-200",
                      isActive(item.path) && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {filteredAdminItems.length > 0 && (
          <>
            <Separator className="my-2" />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredAdminItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => handleNavigation(item.path)}
                        isActive={isActive(item.path)}
                        tooltip={item.label}
                        className={cn(
                          "transition-all duration-200",
                          isActive(item.path) && "bg-destructive/10 text-destructive font-medium"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-4 space-y-2">
        <Separator />
        <div className={cn(
          "flex items-center gap-2",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          <ThemeSelector />
          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Wyloguj</span>
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
