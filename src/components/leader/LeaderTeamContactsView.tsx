import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Contact } from 'lucide-react';

const LeaderTeamContactsView: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Contact className="h-5 w-5 text-primary" />
          Kontakty zespołu
        </CardTitle>
        <CardDescription>
          Podgląd i zarządzanie danymi kontaktowymi członków Twojego zespołu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Contact className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">Moduł kontaktów — w przygotowaniu</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderTeamContactsView;
