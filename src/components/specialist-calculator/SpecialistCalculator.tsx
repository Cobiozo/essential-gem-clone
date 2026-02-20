import { useState, useEffect } from "react";
import { useSpecialistCalculatorSettings } from "@/hooks/useSpecialistCalculatorSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ClientSlider } from "./ClientSlider";
import { ResultCards } from "./ResultCards";
import { BottomSection } from "./BottomSection";
import { FranchiseUpsell } from "./FranchiseUpsell";
import { Disclaimer } from "./Disclaimer";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SpecialistCalculator() {
  const { data, isLoading, error } = useSpecialistCalculatorSettings();
  const { tf } = useLanguage();
  const [clients, setClients] = useState(50);

  useEffect(() => {
    if (data?.settings?.default_clients) {
      setClients(data.settings.default_clients);
    }
  }, [data?.settings?.default_clients]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{tf('common.error', 'Błąd')}</AlertTitle>
        <AlertDescription>
          {tf('calc.spec.loadError', 'Nie udało się załadować ustawień kalkulatora. Spróbuj odświeżyć stronę.')}
        </AlertDescription>
      </Alert>
    );
  }

  const { settings, thresholds } = data;

  return (
    <CurrencyProvider eurToPlnRate={settings.eur_to_pln_rate || 4.3}>
      <div className="space-y-6">
        <ClientSlider
          clients={clients}
          onClientsChange={setClients}
          minClients={settings.min_clients || 1}
          maxClients={settings.max_clients || 15000}
        />

        <ResultCards
          clients={clients}
          baseCommissionEur={settings.base_commission_eur || 20}
          passivePerMonthEur={settings.passive_per_month_eur || 5}
          passiveMonths={settings.passive_months || 5}
          retentionBonusEur={settings.retention_bonus_eur || 10}
          retentionMonthsCount={settings.retention_months_count || 2}
          thresholds={thresholds}
        />

        <BottomSection
          clients={clients}
          baseCommissionEur={settings.base_commission_eur || 20}
          passivePerMonthEur={settings.passive_per_month_eur || 5}
          passiveMonths={settings.passive_months || 5}
          retentionBonusEur={settings.retention_bonus_eur || 10}
          retentionMonthsCount={settings.retention_months_count || 2}
          thresholds={thresholds}
          eurToPlnRate={settings.eur_to_pln_rate || 4.3}
        />

        <FranchiseUpsell />

        <Disclaimer />
      </div>
    </CurrencyProvider>
  );
}
