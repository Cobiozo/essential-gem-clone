import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';

export const WelcomeWidget: React.FC = () => {
  const { profile } = useAuth();
  const { t, language } = useLanguage();

  const firstName = profile?.first_name || '';
  const now = new Date();
  const hour = now.getHours();

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    if (hour >= 5 && hour < 12) return t('dashboard.greeting.morning');
    if (hour >= 12 && hour < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  // Format date based on language
  const formattedDate = format(now, 'EEEE, d MMMM yyyy', {
    locale: language === 'pl' ? pl : enUS,
  });

  return (
    <Card className="col-span-full bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}! 👋
          </h2>
          <p className="text-muted-foreground capitalize">
            {formattedDate}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
