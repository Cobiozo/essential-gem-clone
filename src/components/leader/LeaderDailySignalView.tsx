import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sun } from 'lucide-react';

const LeaderDailySignalView: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-primary" />
          Sygnał Dnia
        </CardTitle>
        <CardDescription>
          Tworzenie i edycja Sygnału Dnia widocznego dla wszystkich użytkowników.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sun className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">Moduł Sygnału Dnia — w przygotowaniu</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderDailySignalView;
