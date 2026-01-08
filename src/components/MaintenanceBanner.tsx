import React from 'react';
import { AlertTriangle, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface MaintenanceData {
  title: string;
  message: string;
  planned_end_time: string | null;
}

interface MaintenanceBannerProps {
  maintenance: MaintenanceData;
}

const MaintenanceBanner: React.FC<MaintenanceBannerProps> = ({ maintenance }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full text-center border-2 border-amber-500/50 shadow-xl">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-4 p-4 bg-amber-500/10 rounded-full">
            <Wrench className="h-12 w-12 text-amber-500 animate-pulse" />
          </div>
          <CardTitle className="text-2xl text-foreground">{maintenance.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-base">{maintenance.message}</p>
          
          {maintenance.planned_end_time && (
            <div className="bg-muted p-4 rounded-lg border">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <p className="font-medium text-sm text-muted-foreground">
                  Planowane zakończenie prac:
                </p>
              </div>
              <p className="text-xl font-bold text-primary">
                {format(new Date(maintenance.planned_end_time), "d MMMM yyyy, HH:mm", { locale: pl })}
              </p>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground pt-2">
            Przepraszamy za utrudnienia. Strona będzie dostępna wkrótce.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceBanner;
