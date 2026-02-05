import React from 'react';
import dropletIcon from '@/assets/pure-life-droplet.png';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCookieConsent } from '@/hooks/useCookieConsent';

const Footer = () => {
  const { t } = useLanguage();
  const { reopenBanner } = useCookieConsent();
  
  return (
    <footer className="bg-muted border-t border-border py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={dropletIcon} alt="" className="w-6 h-6" />
            <span className="text-primary font-bold text-lg">PURE LIFE CENTER</span>
          </div>
          
          {/* Copyright */}
          <p className="text-foreground/60 dark:text-foreground/70 text-sm">
            © {new Date().getFullYear()} Pure Life Center. {t('footer.allRightsReserved')}
          </p>
          
          {/* Links */}
          <div className="flex items-center gap-4 text-sm">
            <a href="/html/polityka-prywatnosci" className="text-foreground/60 dark:text-foreground/70 hover:text-primary transition-colors">
              {t('footer.privacyPolicy')}
            </a>
            <span className="text-foreground/30 dark:text-foreground/40">•</span>
            <a href="/html/regulamin" className="text-foreground/60 dark:text-foreground/70 hover:text-primary transition-colors">
              {t('footer.terms')}
            </a>
            <span className="text-foreground/30 dark:text-foreground/40">•</span>
            <button 
              onClick={reopenBanner} 
              className="text-foreground/60 dark:text-foreground/70 hover:text-primary transition-colors"
            >
              {t('footer.cookieSettings')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
