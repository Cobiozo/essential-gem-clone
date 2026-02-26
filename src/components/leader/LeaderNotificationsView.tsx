import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bell } from 'lucide-react';

const LeaderNotificationsView: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Powiadomienia zespołu
        </CardTitle>
        <CardDescription>
          Wysyłaj powiadomienia in-app do członków swojego zespołu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">Moduł powiadomień — w przygotowaniu</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderNotificationsView;
