import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Library } from 'lucide-react';

const LeaderKnowledgeView: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Library className="h-5 w-5 text-primary" />
          Baza wiedzy zespołu
        </CardTitle>
        <CardDescription>
          Dodawanie i edycja zasobów wiedzy widocznych dla Twojego zespołu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Library className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">Moduł bazy wiedzy — w przygotowaniu</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderKnowledgeView;
