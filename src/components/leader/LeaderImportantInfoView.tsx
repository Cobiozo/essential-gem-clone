import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info } from 'lucide-react';

const LeaderImportantInfoView: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          Ważne informacje
        </CardTitle>
        <CardDescription>
          Tworzenie ważnych informacji widocznych dla Twojego zespołu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Info className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">Moduł ważnych informacji — w przygotowaniu</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderImportantInfoView;
