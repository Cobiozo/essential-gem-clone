import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { SpecialistCalculator as SpecialistCalculatorComponent } from "@/components/specialist-calculator";
import { useSpecialistCalculatorAccess, useSpecialistCalculatorSettings } from "@/hooks/useSpecialistCalculatorSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { ExchangeRateWidget } from "@/components/calculator/ExchangeRateWidget";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import pureLifeLogo from "@/assets/pure-life-logo-new.png";

const SpecialistCalculatorPage = () => {
  const { data: accessData, isLoading: accessLoading } = useSpecialistCalculatorAccess();
  const { data: settingsData } = useSpecialistCalculatorSettings();
  
  const eurToPlnRate = settingsData?.settings?.eur_to_pln_rate || 4.3;

  return (
    <DashboardLayout>
      <CurrencyProvider eurToPlnRate={eurToPlnRate}>
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
            <div className="flex flex-col items-end gap-1.5">
              <ExchangeRateWidget />
              <Badge className="bg-white/20 text-white border-0 hover:bg-white/30 text-[10px] px-2 py-0.5">
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
      </CurrencyProvider>
    </DashboardLayout>
  );
};

export default SpecialistCalculatorPage;
