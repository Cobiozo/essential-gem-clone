import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PlaceholderWidgetProps {
  icon: LucideIcon;
  titleKey: string;
}

export const PlaceholderWidget: React.FC<PlaceholderWidgetProps> = ({ icon: Icon, titleKey }) => {
  const { t } = useLanguage();

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {t(titleKey)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 bg-muted rounded-full mb-3">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {t('dashboard.comingSoon')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('dashboard.workingOnFeature')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
