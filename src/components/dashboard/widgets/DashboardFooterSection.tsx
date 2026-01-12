import React from 'react';
import { Heart, Users, Check, Mail } from 'lucide-react';
import dropletIcon from '@/assets/pure-life-droplet.png';
import { useLanguage } from '@/contexts/LanguageContext';

export const DashboardFooterSection: React.FC = () => {
  const { t } = useLanguage();
  
  const teamFeatures = [
    { 
      icon: Heart, 
      titleKey: 'footer.passion', 
      descriptionKey: 'footer.passionDescription' 
    },
    { 
      icon: Users, 
      titleKey: 'footer.community', 
      descriptionKey: 'footer.communityDescription' 
    },
    { 
      icon: Check, 
      titleKey: 'footer.missionTitle', 
      descriptionKey: 'footer.missionDescription' 
    },
  ];

  return (
    <div className="mt-8 space-y-12">
      {/* Cytat - misja */}
      <section className="text-center py-8">
        <h2 className="text-3xl font-bold italic mb-4 text-foreground">
          "{t('footer.quote')}"
        </h2>
        <p className="text-muted-foreground max-w-3xl mx-auto text-sm leading-relaxed">
          "{t('footer.missionStatement')}"
        </p>
      </section>

      {/* Zespół Pure Life */}
      <section className="text-center py-8 bg-muted/30 rounded-lg">
        <h3 className="text-2xl font-bold mb-2 text-foreground">{t('footer.teamTitle')}</h3>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto mb-8">
          {t('footer.teamDescription')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          {teamFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-3">
                  <Icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <h4 className="font-semibold mb-1 text-foreground">{t(feature.titleKey)}</h4>
                <p className="text-xs text-muted-foreground max-w-[200px]">{t(feature.descriptionKey)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Kontakt */}
      <section className="text-center py-8">
        <h3 className="text-2xl font-bold uppercase tracking-wide mb-4 text-foreground">{t('footer.contact')}</h3>
        <p className="text-muted-foreground text-sm mb-4">
          {t('footer.contactDescription')}
        </p>
        <p className="text-xs text-muted-foreground mb-6 max-w-md mx-auto">
          {t('footer.contactReminder')}
        </p>
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-3">
            <Mail className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-foreground">{t('footer.emailSupport')}</span>
          <a 
            href="mailto:kontakt@purelife.info.pl" 
            className="text-primary hover:underline text-sm"
          >
            kontakt@purelife.info.pl
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-4 pb-2 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
        <div className="flex items-center gap-2">
          <img src={dropletIcon} alt="" className="w-5 h-5" />
          <span className="text-primary font-bold">PURE LIFE</span>
        </div>
        <span>© {new Date().getFullYear()} Pure Life. {t('footer.allRightsReserved')}</span>
        <div className="flex gap-4">
          <a href="/page/polityka-prywatnosci" className="hover:text-primary transition-colors">
            {t('footer.privacyPolicy')}
          </a>
          <span>•</span>
          <a href="/page/regulamin" className="hover:text-primary transition-colors">
            {t('footer.terms')}
          </a>
        </div>
      </footer>
    </div>
  );
};
