import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, BookOpen } from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface HeaderProps {
  siteLogo: string;
  publishedPages?: any[];
}

export const Header: React.FC<HeaderProps> = ({ siteLogo, publishedPages = [] }) => {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useLanguage();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
            <img 
              src={siteLogo} 
              alt="Logo" 
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
            />
            <span className="font-bold text-sm sm:text-base text-foreground hidden sm:inline uppercase tracking-wide">PURE LIFE</span>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center space-x-0.5 sm:space-x-1">
            <LanguageSelector />
            <ThemeSelector />
            
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="hover:bg-muted h-8 sm:h-9 px-2 sm:px-3">
                      <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden md:inline text-xs sm:text-sm">{t('nav.admin')}</span>
                    </Button>
                  </Link>
                )}
                {!isAdmin && (
                  <Link to="/my-account">
                    <Button variant="ghost" size="sm" className="hover:bg-muted h-8 sm:h-9 px-2 sm:px-3">
                      <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden md:inline text-xs sm:text-sm">{t('nav.myAccount')}</span>
                    </Button>
                  </Link>
                )}
                <Link to="/training">
                  <Button variant="ghost" size="sm" className="hover:bg-muted h-8 sm:h-9 px-2 sm:px-3">
                    <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden md:inline text-xs sm:text-sm">{t('training.title')}</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="hover:bg-muted h-8 sm:h-9 px-2 sm:px-3">
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden md:inline text-xs sm:text-sm">{t('nav.logout')}</span>
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm">
                  {t('nav.login')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
