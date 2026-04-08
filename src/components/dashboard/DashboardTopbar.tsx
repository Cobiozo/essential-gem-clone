import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
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
import { LayoutGrid, User, LogOut, Settings, Wrench, Link2, CalendarDays, HelpCircle, Home, Globe, Palette, BookOpen, ArrowLeft, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { GoogleCalendarConnect } from '@/components/settings/GoogleCalendarConnect';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import SessionTimer from '@/components/SessionTimer';
import { useSessionTimer } from '@/contexts/SessionTimerContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeSelector } from '@/components/ThemeSelector';
import { CacheManagementDialog } from './CacheManagementDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedChat } from '@/hooks/useUnifiedChat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardPreference } from '@/hooks/useDashboardPreference';
import { useChatSidebar } from '@/contexts/ChatSidebarContext';
import { useChatSidebarVisibility, isRoleVisibleForChat } from '@/hooks/useChatSidebarVisibility';
import { isSoundEnabled, setSoundEnabled } from '@/hooks/useNotificationSound';

interface DashboardTopbarProps {
  title?: string;
  backTo?: { label: string; path: string } | null;
  isUserMenuOpen?: boolean;
  onUserMenuOpenChange?: (open: boolean) => void;
}

export const DashboardTopbar: React.FC<DashboardTopbarProps> = ({ 
  title,
  backTo,
  isUserMenuOpen,
  onUserMenuOpenChange,
}) => {
  const navigate = useNavigate();
  const { profile, signOut, isAdmin, userRole } = useAuth();
  const { t, tf } = useLanguage();
  const { setViewMode } = useDashboardPreference();
  const sessionTimer = useSessionTimer();
  const chatSidebar = useChatSidebar();
  const { data: chatVisibility } = useChatSidebarVisibility();
  const { totalUnread } = useUnifiedChat({ enableRealtime: false });
  const isChatVisible = isRoleVisibleForChat(chatVisibility, userRole?.role);
  const [isGoogleCalendarOpen, setIsGoogleCalendarOpen] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled);

  // Listen for sound toggle changes from other components
  useEffect(() => {
    const handler = () => setSoundEnabledState(isSoundEnabled());
    window.addEventListener('notification-sounds-changed', handler);
    return () => window.removeEventListener('notification-sounds-changed', handler);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundEnabledState(next);
  };
  
  // Controlled/uncontrolled pattern for dropdown
  const isOpen = isUserMenuOpen !== undefined ? isUserMenuOpen : internalOpen;
  const handleOpenChange = (open: boolean) => {
    setInternalOpen(open);
    onUserMenuOpenChange?.(open);
  };

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
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-2 sm:px-4 lg:px-6">
      {/* Left side - Back button, sidebar trigger and title */}
      <div className="flex items-center gap-2 sm:gap-4">
        {backTo ? (
          <>
            {/* Mobile: back arrow replaces sidebar trigger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(backTo.path)}
              className="sm:hidden h-9 w-9 -ml-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {/* Desktop: back arrow + label + separator + sidebar trigger */}
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(backTo.path)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                {backTo.label}
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <SidebarTrigger />
            </div>
          </>
        ) : (
          <SidebarTrigger className="-ml-1" />
        )}
        {title && (
          <h1 className="text-lg font-semibold text-foreground hidden sm:block">
            {title}
          </h1>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Session Timer - hidden on mobile */}
        <div className="hidden sm:block">
          {sessionTimer && (
            <SessionTimer
              timeRemaining={sessionTimer.timeRemaining}
              onRefresh={sessionTimer.onRefreshTimer}
              hidden={sessionTimer.isProtectedRoute}
            />
          )}
        </div>

        {/* Chat toggle - simple sidebar toggle */}
        {isChatVisible && (
          <div className="relative">
            <Button
              variant={chatSidebar.isOpen ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              title="Czat"
              onClick={chatSidebar.toggleDocked}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background px-1">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
        )}

        {/* Sound toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSound}
          className="h-9 w-9"
          title={soundEnabled ? tf('nav.muteNotifications', 'Wycisz dźwięki') : tf('nav.unmuteNotifications', 'Włącz dźwięki')}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* Desktop-only actions */}
        <div className="hidden sm:flex items-center gap-1">
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
          <LanguageSelector />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.dispatchEvent(new CustomEvent('startOnboardingTour'))}
            className="h-9 w-9"
            title={tf('nav.tutorial', 'Samouczek')}
            data-tour="tutorial-button"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <ThemeSelector />
        </div>

        {/* User dropdown */}
        <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full flex-shrink-0" data-tour="user-avatar">
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
            <DropdownMenuItem onClick={() => navigate('/dashboard')}>
              <Home className="mr-2 h-4 w-4" />
              {tf('nav.home', 'Strona główna')}
            </DropdownMenuItem>
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
                {tf('nav.apiSync', 'Synchronizacja API')}
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
                {tf('nav.toolPanel', 'Panel narzędziowy')}
              </DropdownMenuItem>
            </CacheManagementDialog>
            {/* Mobile-only: items hidden from topbar */}
            <div className="sm:hidden">
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('startOnboardingTour'))}>
                <HelpCircle className="mr-2 h-4 w-4" />
                {tf('nav.tutorial', 'Samouczek')}
              </DropdownMenuItem>
            </div>
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
