import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, ArrowRight, MousePointer, UserPlus, TrendingUp } from 'lucide-react';

export const ReflinkStatsWidget: React.FC = () => {
  const navigate = useNavigate();

  // Simplified widget - actual stats would come from a proper hook
  const stats = {
    totalClicks: 0,
    totalRegistrations: 0,
    conversionRate: 0,
  };

  return (
    <Card className="dashboard-widget h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          Statystyki reflinków
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/moje-konto?tab=reflinks')}
          className="text-primary hover:text-primary/80"
        >
          Szczegóły
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <MousePointer className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats.totalClicks}</p>
            <p className="text-xs text-muted-foreground">Kliknięć</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <UserPlus className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold">{stats.totalRegistrations}</p>
            <p className="text-xs text-muted-foreground">Rejestracji</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <TrendingUp className="h-5 w-5 mx-auto text-blue-600 mb-1" />
            <p className="text-2xl font-bold">{stats.conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Konwersja</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Zobacz szczegółowe statystyki w sekcji Reflinki
        </p>
      </CardContent>
    </Card>
  );
};
