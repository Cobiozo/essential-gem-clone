import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Lock } from "lucide-react";
import { SpecialistCalculator as SpecialistCalculatorComponent } from "@/components/specialist-calculator";
import { useSpecialistCalculatorAccess } from "@/hooks/useSpecialistCalculatorSettings";
import { Skeleton } from "@/components/ui/skeleton";

const SpecialistCalculatorPage = () => {
  const { data: accessData, isLoading: accessLoading } = useSpecialistCalculatorAccess();

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Calculator className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Kalkulator dla Specjalistów</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Sprawdź potencjał swoich zarobków w programie afiliacyjnym Pure Life. 
            Przesuń suwak, aby zobaczyć szacowane przychody za 6 miesięcy.
          </p>
        </div>

        {/* Content */}
        {accessLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : accessData?.hasAccess ? (
          <SpecialistCalculatorComponent />
        ) : (
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <CardTitle className="text-xl">Brak dostępu</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                {accessData?.reason === 'disabled' 
                  ? 'Kalkulator jest obecnie wyłączony.'
                  : 'Nie masz uprawnień do korzystania z tego kalkulatora. Skontaktuj się z administratorem.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SpecialistCalculatorPage;
