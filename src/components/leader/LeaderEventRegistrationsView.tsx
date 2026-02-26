import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';

const LeaderEventRegistrationsView: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Rejestracje na wydarzenia
        </CardTitle>
        <CardDescription>
          Podgląd osób zarejestrowanych na Twoje wydarzenia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">Moduł rejestracji — w przygotowaniu</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderEventRegistrationsView;
