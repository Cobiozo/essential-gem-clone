import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

const SpecialistCalculator = () => {
  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Calculator className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Kalkulator dla Specjalistów</CardTitle>
            <p className="text-muted-foreground mt-2">
              Sprawdź potencjał swojego zasięgu w programie afiliacyjnym
            </p>
          </CardHeader>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              Kalkulator jest w trakcie przygotowania...
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SpecialistCalculator;
