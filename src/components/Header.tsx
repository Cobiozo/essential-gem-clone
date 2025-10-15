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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <img 
              src={siteLogo} 
              alt="Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="font-bold text-base text-foreground hidden sm:inline uppercase tracking-wide">PURE LIFE</span>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center space-x-1">
            <LanguageSelector />
            <ThemeSelector />
            
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="hover:bg-muted">
                      <Settings className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">{t('nav.admin')}</span>
                    </Button>
                  </Link>
                )}
                {!isAdmin && (
                  <Link to="/my-account">
                    <Button variant="ghost" size="sm" className="hover:bg-muted">
                      <Settings className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">{t('nav.myAccount')}</span>
                    </Button>
                  </Link>
                )}
                <Link to="/training">
                  <Button variant="ghost" size="sm" className="hover:bg-muted">
                    <BookOpen className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Akademia</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="hover:bg-muted">
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t('nav.logout')}</span>
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
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
