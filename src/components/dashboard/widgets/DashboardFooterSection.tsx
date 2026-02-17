import React, { useState, useEffect } from 'react';
import { Heart, Users, Check, Mail, HelpCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import pureLifeLogo from '@/assets/pure-life-logo-new.png';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface DashboardFooterSettings {
  id: string;
  quote_text: string;
  mission_statement: string;
  team_title: string;
  team_description: string;
  feature_1_icon: string;
  feature_1_title: string;
  feature_1_description: string;
  feature_2_icon: string;
  feature_2_title: string;
  feature_2_description: string;
  feature_3_icon: string;
  feature_3_title: string;
  feature_3_description: string;
  contact_title: string;
  contact_description: string;
  contact_reminder: string;
  contact_email_label: string;
  contact_email_address: string;
  contact_icon: string;
}

// Dynamic icon renderer
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const Icon = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <Icon className={className} />;
};

export const DashboardFooterSection: React.FC = () => {
  const { t, language } = useLanguage();
  const [settings, setSettings] = useState<DashboardFooterSettings | null>(null);

  // Helper: for PL use DB settings (admin-editable), for other langs use i18n translations
  const ft = (settingsValue: string | undefined, translationKey: string) => {
    if (language === 'pl') return settingsValue || t(translationKey);
    const translated = t(translationKey);
    return translated !== translationKey ? translated : (settingsValue || translated);
  };

  const handleOpenCookieSettings = () => {
    window.dispatchEvent(new CustomEvent('openCookieSettings'));
  };

  const handleOpenInstallBanner = () => {
    window.dispatchEvent(new CustomEvent('resetPWAInstallBanner'));
  };

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('dashboard_footer_settings')
          .select('*')
          .limit(1)
          .single();
        if (data) setSettings(data);
      } catch (error) {
        console.error('Error fetching dashboard footer settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Feature cards with fallback to translations
  const teamFeatures = [
    { 
      icon: settings?.feature_1_icon || 'Heart', 
      title: ft(settings?.feature_1_title, 'footer.passion'), 
      description: ft(settings?.feature_1_description, 'footer.passionDescription') 
    },
    { 
      icon: settings?.feature_2_icon || 'Users', 
      title: ft(settings?.feature_2_title, 'footer.community'), 
      description: ft(settings?.feature_2_description, 'footer.communityDescription') 
    },
    { 
      icon: settings?.feature_3_icon || 'Check', 
      title: ft(settings?.feature_3_title, 'footer.missionTitle'), 
      description: ft(settings?.feature_3_description, 'footer.missionDescription') 
    },
  ];

  return (
    <div data-tour="footer-section" className="mt-8 space-y-12">
      {/* Cytat - misja */}
      <section className="text-center py-8">
        <h2 className="text-3xl font-bold italic mb-4 text-foreground">
          "{ft(settings?.quote_text, 'footer.quote')}"
        </h2>
        <p className="text-muted-foreground max-w-3xl mx-auto text-sm leading-relaxed">
          "{ft(settings?.mission_statement, 'footer.missionStatement')}"
        </p>
      </section>

      {/* Zespół Pure Life */}
      <section className="text-center py-8 bg-muted/30 rounded-lg">
        <h3 className="text-2xl font-bold mb-2 text-foreground">
          {ft(settings?.team_title, 'footer.teamTitle')}
        </h3>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto mb-8">
          {ft(settings?.team_description, 'footer.teamDescription')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          {teamFeatures.map((feature, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-3">
                <DynamicIcon name={feature.icon} className="w-8 h-8 text-primary-foreground" />
              </div>
              <h4 className="font-semibold mb-1 text-foreground">{feature.title}</h4>
              <p className="text-xs text-muted-foreground max-w-[200px]">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Kontakt */}
      <section className="text-center py-8">
        <h3 className="text-2xl font-bold uppercase tracking-wide mb-4 text-foreground">
          {ft(settings?.contact_title, 'footer.contact')}
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          {ft(settings?.contact_description, 'footer.contactDescription')}
        </p>
        <p className="text-xs text-muted-foreground mb-6 max-w-md mx-auto">
          {ft(settings?.contact_reminder, 'footer.contactReminder')}
        </p>
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-3">
            <DynamicIcon name={settings?.contact_icon || 'Mail'} className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-foreground">
            {ft(settings?.contact_email_label, 'footer.emailSupport')}
          </span>
          <a 
            href={`mailto:${settings?.contact_email_address || 'support@purelife.info.pl'}`}
            className="text-primary hover:underline text-sm"
          >
            {settings?.contact_email_address || 'support@purelife.info.pl'}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-4 pb-2 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
        <div className="flex items-center gap-2">
          <img src={pureLifeLogo} alt="Pure Life Center" className="w-6 h-6 object-contain" />
          <span className="text-primary font-bold">PURE LIFE CENTER</span>
        </div>
        <span>© {new Date().getFullYear()} Pure Life Center. {t('footer.allRightsReserved')}</span>
        <div className="flex gap-4">
          <a href="/html/polityka-prywatnosci" className="hover:text-primary transition-colors">
            {t('footer.privacyPolicy')}
          </a>
          <span>•</span>
          <a href="/html/regulamin" className="hover:text-primary transition-colors">
            {t('footer.terms')}
          </a>
          <span>•</span>
           <button onClick={handleOpenCookieSettings} className="hover:text-primary transition-colors">
            {t('footer.cookieSettings')}
          </button>
          {!isStandalone && (
            <>
              <span>•</span>
              <button onClick={handleOpenInstallBanner} className="hover:text-primary transition-colors">
                {t('footer.installApp') !== 'footer.installApp' ? t('footer.installApp') : 'Zainstaluj aplikację'}
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};

export default DashboardFooterSection;
