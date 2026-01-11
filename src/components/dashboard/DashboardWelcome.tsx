import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, Locale } from 'date-fns';
import { pl, enUS, de, uk, ru } from 'date-fns/locale';

const locales: Record<string, Locale> = {
  pl,
  en: enUS,
  de,
  uk,
  ru,
};

export const DashboardWelcome: React.FC = () => {
  const { profile } = useAuth();
  const { language } = useLanguage();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Dzień dobry';
    if (hour < 18) return 'Witaj';
    return 'Dobry wieczór';
  };

  const getFirstName = () => {
    return profile?.first_name || 'Użytkowniku';
  };

  const getFormattedDate = () => {
    const locale = locales[language] || pl;
    return format(new Date(), "EEEE, d MMMM yyyy", { locale });
  };

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {getGreeting()}, <span className="text-primary">{getFirstName()}</span>!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1 capitalize">
            {getFormattedDate()}
          </p>
        </div>
      </div>
    </div>
  );
};
