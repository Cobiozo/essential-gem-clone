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
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src={siteLogo} 
              alt="Logo" 
              className="w-8 h-8"
            />
            <span className="font-semibold text-lg text-primary hidden sm:inline">PURE LIFE</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {publishedPages.map((page) => (
              <Link 
                key={page.id}
                to={`/page/${page.slug}`}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                {page.title}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-2">
            <LanguageSelector />
            <ThemeSelector />
            
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">{t('nav.admin')}</span>
                    </Button>
                  </Link>
                )}
                {!isAdmin && (
                  <Link to="/my-account">
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">{t('nav.myAccount')}</span>
                    </Button>
                  </Link>
                )}
                <Link to="/training">
                  <Button variant="ghost" size="sm">
                    <BookOpen className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Akademia</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t('nav.logout')}</span>
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm">
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
