import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarPlus } from 'lucide-react';

const LeaderEventsView: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarPlus className="h-5 w-5 text-primary" />
          Wydarzenia zespołu
        </CardTitle>
        <CardDescription>
          Twórz webinary i szkolenia dla swojego zespołu. Jako lider jesteś automatycznie hostem wydarzenia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarPlus className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">Moduł wydarzeń zespołu — w przygotowaniu</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Wkrótce będziesz mógł tworzyć wydarzenia dla członków swojego zespołu</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderEventsView;
