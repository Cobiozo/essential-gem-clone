import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpenCheck } from 'lucide-react';

const LeaderTrainingMgmtView: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpenCheck className="h-5 w-5 text-primary" />
          Zarządzanie szkoleniami zespołu
        </CardTitle>
        <CardDescription>
          Przypisywanie modułów szkoleniowych, podgląd i reset postępów członków zespołu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpenCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">Moduł zarządzania szkoleniami — w przygotowaniu</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderTrainingMgmtView;
