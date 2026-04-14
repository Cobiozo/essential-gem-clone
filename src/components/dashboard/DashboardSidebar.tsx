import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  LogOut,
  Crown,
  Menu,
  ExternalLink,
  icons as LucideIcons,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserProfileCard } from './UserProfileCard';
import { useLeaderPermissions } from '@/hooks/useLeaderPermissions';
import newPureLifeLogo from '@/assets/pure-life-droplet-new.png';
import { useSidebarNavigation } from '@/hooks/useSidebarNavigation';
import { DashboardMegaMenu } from './DashboardMegaMenu';
import { useIsMobile } from '@/hooks/use-mobile';

export const DashboardSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, isPartner } = useAuth();
  const { t, tf } = useLanguage();
  const { state, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const isMobile = useIsMobile();
  const { isAnyLeaderFeatureEnabled } = useLeaderPermissions();
  const { communityLinks, detectPlatform, platformIcons } = useSidebarNavigation();
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpenMobile(false);
  };

  const openMegaMenu = () => {
    setMegaMenuOpen(true);
    // On mobile, close the sidebar sheet first
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isDashboardActive = location.pathname === '/dashboard';
  const isLeaderActive = location.pathname.startsWith('/leader');

  return (
    <>
      <Sidebar data-tour="sidebar" collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
        {/* Logo Header */}
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className={`flex-shrink-0 flex items-center justify-center ${
              isCollapsed ? 'h-8 min-h-[32px]' : 'h-10 min-h-[40px]'
            }`}>
              <img 
                src={newPureLifeLogo} 
                alt="Pure Life Center" 
                className="h-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-lg text-sidebar-foreground whitespace-nowrap">
                PURE LIFE CENTER
              </span>
            )}
          </div>
        </SidebarHeader>

        {/* User Profile Card */}
        <UserProfileCard />

        {/* Minimal Navigation */}
        <SidebarContent className="px-2 py-4">
          <SidebarMenu>
            {/* Mega Menu Trigger */}
            <SidebarMenuItem>
              {isMobile ? (
                <SidebarMenuButton
                  onClick={openMegaMenu}
                  className="transition-colors hover:bg-primary/10 font-semibold"
                >
                  <Menu className="h-4 w-4" />
                  <span>{tf('nav.menu', 'Menu')}</span>
                </SidebarMenuButton>
              ) : (
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      onClick={openMegaMenu}
                      className="transition-colors hover:bg-primary/10 font-semibold"
                    >
                      <Menu className="h-4 w-4" />
                      <span>{tf('nav.menu', 'Menu')}</span>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {tf('tooltip.megaMenu', 'Otwórz pełne menu nawigacji')}
                  </TooltipContent>
                </Tooltip>
              )}
            </SidebarMenuItem>

            <SidebarSeparator className="my-2" />

            {/* Dashboard - quick access */}
            <SidebarMenuItem data-tour="menu-dashboard">
              {isMobile ? (
                <SidebarMenuButton
                  onClick={() => handleNavigate('/dashboard')}
                  isActive={isDashboardActive}
                  className="transition-colors hover:bg-primary/10 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{tf('dashboard.menu.dashboard', 'Dashboard')}</span>
                </SidebarMenuButton>
              ) : (
                <Tooltip delayDuration={3000}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      onClick={() => handleNavigate('/dashboard')}
                      isActive={isDashboardActive}
                      className="transition-colors hover:bg-primary/10 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span>{tf('dashboard.menu.dashboard', 'Dashboard')}</span>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs text-xs">
                    {tf('tooltip.dashboard', 'Twoja strona główna z podglądem wszystkich najważniejszych informacji')}
                  </TooltipContent>
                </Tooltip>
              )}
            </SidebarMenuItem>

            {/* Leader Panel - if visible */}
            {isPartner && isAnyLeaderFeatureEnabled && (
              <SidebarMenuItem data-tour="menu-leader-panel">
                {isMobile ? (
                  <SidebarMenuButton
                    onClick={() => handleNavigate('/leader')}
                    isActive={isLeaderActive}
                    className="transition-colors hover:bg-primary/10 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                  >
                    <Crown className="h-4 w-4" />
                    <span>Panel Lidera</span>
                  </SidebarMenuButton>
                ) : (
                  <Tooltip delayDuration={3000}>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        onClick={() => handleNavigate('/leader')}
                        isActive={isLeaderActive}
                        className="transition-colors hover:bg-primary/10 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                      >
                        <Crown className="h-4 w-4" />
                        <span>Panel Lidera</span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs">
                      {tf('tooltip.leaderPanel', 'Panel Lidera — narzędzia i statystyki Twojej struktury')}
                    </TooltipContent>
                  </Tooltip>
                )}
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="border-t border-sidebar-border p-2">
          {/* Social Media Buttons */}
          {!isCollapsed && communityLinks.length > 0 && (
            <div className="px-2 py-2 border-b border-sidebar-border mb-2">
              <div className="flex flex-wrap gap-2 justify-center">
                {communityLinks.map((link) => {
                  const hasCustomImage = !!link.image_url;
                  const IconComponent = link.icon_name
                    ? (LucideIcons as Record<string, React.ElementType>)[link.icon_name] || ExternalLink
                    : platformIcons[detectPlatform(link.title, link.url)] || ExternalLink;
                  return (
                    <Button
                      key={link.id}
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full hover:bg-primary/10 overflow-hidden"
                      onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                      title={link.title}
                    >
                      {hasCustomImage ? (
                        <img src={link.image_url!} alt={link.title} className="h-5 w-5 object-contain" />
                      ) : (
                        <IconComponent className="h-5 w-5" style={{ color: link.icon_color || undefined }} />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

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

      {/* Mega Menu Overlay - rendered outside sidebar */}
      <DashboardMegaMenu open={megaMenuOpen} onClose={() => setMegaMenuOpen(false)} />
    </>
  );
};
