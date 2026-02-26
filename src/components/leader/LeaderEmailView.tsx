import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail } from 'lucide-react';

const LeaderEmailView: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Emaile do zespołu
        </CardTitle>
        <CardDescription>
          Wysyłaj emaile grupowe do członków swojego zespołu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Mail className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">Moduł emaili — w przygotowaniu</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderEmailView;
