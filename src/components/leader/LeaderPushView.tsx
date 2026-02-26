import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Smartphone } from 'lucide-react';

const LeaderPushView: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          Push do zespołu
        </CardTitle>
        <CardDescription>
          Wysyłaj powiadomienia push do członków swojego zespołu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Smartphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">Moduł push — w przygotowaniu</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderPushView;
