import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetInfoButton } from '../WidgetInfoButton';
import { NewsTicker } from '@/components/news-ticker';
import { COMMON_TIMEZONES, getTimezoneAbbr } from '@/utils/timezoneHelpers';

export const WelcomeWidget: React.FC = () => {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTimezone, setSelectedTimezone] = useState(userTimezone);

  // Update time every second - pause when tab is hidden
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    const startTimer = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => setCurrentTime(new Date()), 1000);
    };
    
    const stopTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        setCurrentTime(new Date()); // Immediate update when tab becomes visible
        startTimer();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Start timer only if tab is visible
    if (!document.hidden) {
      startTimer();
    }
    
    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Timezone list - use central COMMON_TIMEZONES, auto-add user's timezone if not in list
  const timezones = useMemo(() => {
    const userTzExists = COMMON_TIMEZONES.some(tz => tz.value === userTimezone);
    
    if (userTzExists) {
      return COMMON_TIMEZONES;
    }
    
    // Add user's timezone at the top
    const cityName = userTimezone.split('/').pop()?.replace(/_/g, ' ') || userTimezone;
    const abbr = getTimezoneAbbr(userTimezone);
    
    return [
      { value: userTimezone, label: `${cityName} (${abbr})` },
      ...COMMON_TIMEZONES
    ];
  }, [userTimezone]);

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

  // Format time in selected timezone
  const formattedTime = formatInTimeZone(currentTime, selectedTimezone, 'HH:mm:ss');
  
  // Polish time for secondary clock
  const polishTime = formatInTimeZone(currentTime, 'Europe/Warsaw', 'HH:mm');
  const isNonPolishTimezone = selectedTimezone !== 'Europe/Warsaw';

  return (
    <Card 
      data-tour="welcome-widget"
      variant="premium"
      className="col-span-full overflow-hidden relative"
    >
      {/* Gradient overlay - różny dla light/dark */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-blue-500/5 dark:from-gold/10 dark:via-transparent dark:to-action-blue/5 pointer-events-none" />
      
      {/* Glass effect bar at top - tylko dark mode */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/[0.02] to-transparent dark:from-white/5 dark:to-transparent dark:backdrop-blur-[1px] pointer-events-none" />
      
      <WidgetInfoButton description="Powitanie i aktualny czas - dostosuj strefę czasową według potrzeb" />
      <CardContent className="relative z-10 p-6 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl md:text-3xl font-bold text-amber-600 dark:text-gold">
              {getGreeting()}{firstName ? `, ${firstName}` : ''}! 👋
            </h2>
            <p className="text-muted-foreground capitalize">
              {formattedDate}
            </p>
          </div>
          
          {/* Digital clock with timezone selector */}
          <div className="flex flex-col items-end gap-0.5">
            {/* Main clock - user's timezone */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-2xl md:text-3xl font-mono font-bold text-amber-600 dark:text-gold tabular-nums">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-amber-600/70 dark:text-gold/70" />
                {formattedTime}
              </div>
              <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                <SelectTrigger className="w-[160px] h-8 text-xs bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map(tz => (
                    <SelectItem key={tz.value} value={tz.value} className="text-xs">
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Secondary Polish clock - visible only when timezone differs from Poland */}
            {isNonPolishTimezone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-[168px]">
                <span className="text-sm">🇵🇱</span>
                <span className="font-mono tabular-nums">{polishTime}</span>
                <span className="text-[10px]">({t('common.poland') || 'Polska'})</span>
              </div>
            )}
          </div>
        </div>
        
        {/* News Ticker - pasek informacyjny */}
        <div className="mt-4 overflow-hidden w-full max-w-full">
          <NewsTicker />
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeWidget;
