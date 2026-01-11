import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LayoutGrid, User, LogOut, Settings, Home } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardPreference } from '@/hooks/useDashboardPreference';

interface DashboardTopbarProps {
  title?: string;
}

export const DashboardTopbar: React.FC<DashboardTopbarProps> = ({ title }) => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { t } = useLanguage();
  const { toggleViewMode } = useDashboardPreference();

  const firstName = profile?.first_name || '';
  const lastName = profile?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || profile?.email || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
  const avatarUrl = (profile as any)?.avatar_url || null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      {/* Left side - Sidebar trigger and title */}
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-1" />
        {title && (
          <h1 className="text-lg font-semibold text-foreground hidden sm:block">
            {title}
          </h1>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Classic view toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleViewMode}
          className="h-9 w-9"
          title={t('dashboard.switchToClassic')}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>

        {/* Home button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="h-9 w-9"
          title={t('nav.home')}
        >
          <Home className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* Language */}
        <LanguageSelector />

        {/* Theme */}
        <ThemeSelector />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">{fullName}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/my-account?tab=profile')}>
              <User className="mr-2 h-4 w-4" />
              {t('nav.myAccount')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/my-account?tab=profile')}>
              <Settings className="mr-2 h-4 w-4" />
              {t('dashboard.menu.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
