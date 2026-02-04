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
  const { t } = useLanguage();
  const [settings, setSettings] = useState<DashboardFooterSettings | null>(null);

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
      title: settings?.feature_1_title || t('footer.passion'), 
      description: settings?.feature_1_description || t('footer.passionDescription') 
    },
    { 
      icon: settings?.feature_2_icon || 'Users', 
      title: settings?.feature_2_title || t('footer.community'), 
      description: settings?.feature_2_description || t('footer.communityDescription') 
    },
    { 
      icon: settings?.feature_3_icon || 'Check', 
      title: settings?.feature_3_title || t('footer.missionTitle'), 
      description: settings?.feature_3_description || t('footer.missionDescription') 
    },
  ];

  return (
    <div data-tour="footer-section" className="mt-8 space-y-12">
      {/* Cytat - misja */}
      <section className="text-center py-8">
        <h2 className="text-3xl font-bold italic mb-4 text-foreground">
          "{settings?.quote_text || t('footer.quote')}"
        </h2>
        <p className="text-muted-foreground max-w-3xl mx-auto text-sm leading-relaxed">
          "{settings?.mission_statement || t('footer.missionStatement')}"
        </p>
      </section>

      {/* Zespół Pure Life */}
      <section className="text-center py-8 bg-muted/30 rounded-lg">
        <h3 className="text-2xl font-bold mb-2 text-foreground">
          {settings?.team_title || t('footer.teamTitle')}
        </h3>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto mb-8">
          {settings?.team_description || t('footer.teamDescription')}
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
          {settings?.contact_title || t('footer.contact')}
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          {settings?.contact_description || t('footer.contactDescription')}
        </p>
        <p className="text-xs text-muted-foreground mb-6 max-w-md mx-auto">
          {settings?.contact_reminder || t('footer.contactReminder')}
        </p>
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-3">
            <DynamicIcon name={settings?.contact_icon || 'Mail'} className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-foreground">
            {settings?.contact_email_label || t('footer.emailSupport')}
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
        </div>
      </footer>
    </div>
  );
};

export default DashboardFooterSection;
