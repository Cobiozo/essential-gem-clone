import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemTexts } from '@/hooks/useSystemTexts';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeSelector } from '@/components/ThemeSelector';
import { LanguageSelector } from '@/components/LanguageSelector';
import { LayoutSwitcher } from '@/components/LayoutSwitcher';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useSidebar } from '@/components/ui/sidebar';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';

export const DashboardTopbar: React.FC = () => {
  const { profile, signOut, isAdmin } = useAuth();
  const { toggleSidebar, isMobile } = useSidebar();
  const { data: systemTextsData = [] } = useSystemTexts();

  const siteLogo = React.useMemo(() => {
    const logoSystemText = systemTextsData.find(item => item.type === 'site_logo');
    return logoSystemText?.content || newPureLifeLogo;
  }, [systemTextsData]);

  const getInitials = () => {
    const first = profile?.first_name?.[0] || '';
    const last = profile?.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getFullName = () => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return profile?.email?.split('@')[0] || 'Użytkownik';
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center gap-4 border-b border-border bg-card/95 backdrop-blur-sm px-4 sm:px-6">
      {/* Mobile hamburger menu */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-9 w-9 md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Otwórz menu</span>
        </Button>
      )}

      {/* Logo - visible on mobile only since sidebar shows it on desktop */}
      {isMobile && (
        <Link to="/" className="flex items-center gap-2">
          <img src={siteLogo} alt="Pure Life" className="h-7 w-7 object-contain" />
          <span className="font-bold text-sm uppercase tracking-wide text-foreground">
            PURE LIFE
          </span>
        </Link>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Notifications */}
        <NotificationBell />

        {/* Language selector */}
        <LanguageSelector />

        {/* Theme selector */}
        <ThemeSelector />

        {/* Layout switcher */}
        <LayoutSwitcher />

        {/* User profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                <AvatarImage src={undefined} alt={getFullName()} />
                <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-sm font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{getFullName()}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {profile?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/my-account?tab=profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Mój profil</span>
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/admin" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Panel admina</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Wyloguj się</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
