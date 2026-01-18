import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { SpecialistCalculator as SpecialistCalculatorComponent } from "@/components/specialist-calculator";
import { useSpecialistCalculatorAccess } from "@/hooks/useSpecialistCalculatorSettings";
import { Skeleton } from "@/components/ui/skeleton";

const SpecialistCalculatorPage = () => {
  const { data: accessData, isLoading: accessLoading } = useSpecialistCalculatorAccess();

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Sprawdź potencjał swojego zasięgu</h1>
          <p className="text-muted-foreground text-sm">
            Wprowadź liczbę klientów, aby zobaczyć symulację przychodów w perspektywie 6-miesięcznej kuracji. 
            Wyliczenia oparte na modelu Pure Life / Eqology (Omega-3).
          </p>
        </div>

        {/* Content */}
        {accessLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
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
