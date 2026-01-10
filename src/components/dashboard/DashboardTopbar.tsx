import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LanguageSelector } from '@/components/LanguageSelector';
import { NotificationBellEnhanced } from '@/components/notifications/NotificationBellEnhanced';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, User, Settings, LogOut, ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/szkolenia': 'Akademia',
  '/centrum-wiedzy': 'Zasoby wiedzy',
  '/moje-konto': 'Moje konto',
  '/admin': 'Panel administratora',
};

export const DashboardTopbar: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

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

  const getBreadcrumbs = () => {
    const pathname = location.pathname;
    const crumbs = [{ label: 'Dashboard', path: '/' }];
    
    if (pathname !== '/') {
      const label = routeLabels[pathname] || pathname.replace('/', '').replace(/-/g, ' ');
      crumbs.push({ label, path: pathname });
    }
    
    return crumbs;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement global search
    console.log('Search:', searchQuery);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-full items-center gap-4 px-4">
        {/* Sidebar Trigger */}
        <SidebarTrigger className="shrink-0" />

        {/* Breadcrumbs */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <button
                onClick={() => navigate(crumb.path)}
                className={cn(
                  "hover:text-foreground transition-colors",
                  index === breadcrumbs.length - 1
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {index === 0 && <Home className="h-4 w-4 inline mr-1" />}
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="hidden lg:flex relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Szukaj..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-64 bg-muted/50 border-transparent focus:border-border"
          />
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <NotificationBellEnhanced />

          {/* Language Selector */}
          <div className="hidden sm:block">
            <LanguageSelector />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-popover" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/moje-konto')}>
                <User className="mr-2 h-4 w-4" />
                <span>Moje konto</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/moje-konto?tab=settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Ustawienia</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Wyloguj</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
