import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { SpecialistCalculator as SpecialistCalculatorComponent } from "@/components/specialist-calculator";
import { useSpecialistCalculatorAccess } from "@/hooks/useSpecialistCalculatorSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { ExchangeRateWidget } from "@/components/calculator/ExchangeRateWidget";
import pureLifeLogo from "@/assets/pure-life-logo-new.png";

const SpecialistCalculatorPage = () => {
  const { data: accessData, isLoading: accessLoading } = useSpecialistCalculatorAccess();

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Header - matching influencer calculator style */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 to-emerald-700 text-white p-4 sm:p-6 rounded-xl mb-6">
          <div className="flex items-center gap-3">
            <img src={pureLifeLogo} alt="Pure Life" className="h-10 w-auto" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                Pure Life <span className="font-light">Kalkulator</span>
              </h1>
              <p className="text-emerald-200 text-xs sm:text-sm">
                Wprowadź liczbę klientów, aby zobaczyć symulację przychodów w perspektywie 6-miesięcznej kuracji.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <ExchangeRateWidget />
            <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
              Model: Afiliacyjny Omega-3
            </Badge>
          </div>
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
