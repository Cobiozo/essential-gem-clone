import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const LeaderReportsView: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Raporty i statystyki zespołu
        </CardTitle>
        <CardDescription>
          Dashboard ze statystykami aktywności, postępów i rejestracji członków Twojego zespołu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">Moduł raportów — w przygotowaniu</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderReportsView;
