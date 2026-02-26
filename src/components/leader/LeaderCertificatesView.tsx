import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Award } from 'lucide-react';

const LeaderCertificatesView: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Certyfikaty zespołu
        </CardTitle>
        <CardDescription>
          Podgląd i ręczne wydawanie certyfikatów członkom Twojego zespołu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Award className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">Moduł certyfikatów — w przygotowaniu</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderCertificatesView;
