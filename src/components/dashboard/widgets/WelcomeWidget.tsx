import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, Bell, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export const WelcomeWidget: React.FC = () => {
  const { profile, isAdmin, isPartner, isSpecjalista } = useAuth();
  const { t } = useLanguage();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Dzień dobry';
    if (hour < 18) return 'Dzień dobry';
    return 'Dobry wieczór';
  };

  const getFirstName = () => {
    return profile?.first_name || 'Użytkowniku';
  };

  const getCurrentDate = () => {
    return format(new Date(), "EEEE, d MMMM yyyy", { locale: pl });
  };

  // Calculate profile completion percentage
  const getProfileCompletion = () => {
    if (!profile) return 0;
    const fields = [
      profile.first_name,
      profile.last_name,
      profile.phone_number,
      profile.city,
      profile.eq_id,
    ];
    const filledFields = fields.filter(Boolean).length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const profileCompletion = getProfileCompletion();

  return (
    <Card className="dashboard-widget overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {getGreeting()}, {getFirstName()}! 👋
            </h1>
            <p className="text-muted-foreground mt-1 capitalize">
              {getCurrentDate()}
            </p>
          </div>
          
          {profileCompletion < 100 && (
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
              <div className="flex-1 min-w-[120px]">
                <p className="text-xs text-muted-foreground mb-1">Kompletność profilu</p>
                <Progress value={profileCompletion} className="h-2" />
              </div>
              <Badge variant="outline" className="shrink-0">
                {profileCompletion}%
              </Badge>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">12</p>
              <p className="text-xs text-muted-foreground">Szkoleń</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">5</p>
              <p className="text-xs text-muted-foreground">Ukończonych</p>
            </div>
          </div>

          {(isPartner || isSpecjalista || isAdmin) && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">24</p>
                <p className="text-xs text-muted-foreground">Kontaktów</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
            <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">3</p>
              <p className="text-xs text-muted-foreground">Powiadomień</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
