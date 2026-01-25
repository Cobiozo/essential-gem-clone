import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LayoutGrid, User, LogOut, Settings, Wrench, Link2, CalendarDays } from 'lucide-react';
import { GoogleCalendarConnect } from '@/components/settings/GoogleCalendarConnect';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeSelector } from '@/components/ThemeSelector';
import { CacheManagementDialog } from './CacheManagementDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardPreference } from '@/hooks/useDashboardPreference';

interface DashboardTopbarProps {
  title?: string;
}

export const DashboardTopbar: React.FC<DashboardTopbarProps> = ({ title }) => {
  const navigate = useNavigate();
  const { profile, signOut, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { setViewMode } = useDashboardPreference();
  const [isGoogleCalendarOpen, setIsGoogleCalendarOpen] = useState(false);

  const handleSwitchToClassic = () => {
    setViewMode('classic');
    navigate('/');
  };

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
        {/* Classic view toggle - only for admins */}
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwitchToClassic}
            className="h-9 w-9"
            title={t('dashboard.switchToClassic')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        )}

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
            <DropdownMenuItem 
              data-tour="user-menu-account"
              onClick={() => navigate('/my-account?tab=profile')}
            >
              <User className="mr-2 h-4 w-4" />
              {t('nav.myAccount')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/my-account?tab=profile')}>
              <Settings className="mr-2 h-4 w-4" />
              {t('dashboard.menu.settings')}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Link2 className="mr-2 h-4 w-4" />
                Synchronizacja API
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                <DropdownMenuItem onClick={() => setIsGoogleCalendarOpen(true)}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Google Calendar
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <CacheManagementDialog>
              <DropdownMenuItem 
                data-tour="user-menu-tools"
                onSelect={(e) => e.preventDefault()}
              >
                <Wrench className="mr-2 h-4 w-4" />
                Panel narzędziowy
              </DropdownMenuItem>
            </CacheManagementDialog>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Google Calendar Dialog */}
        <Dialog open={isGoogleCalendarOpen} onOpenChange={setIsGoogleCalendarOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Google Calendar
              </DialogTitle>
            </DialogHeader>
            <GoogleCalendarConnect />
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
};
