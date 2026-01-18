import { useState, useEffect } from "react";
import { useSpecialistCalculatorSettings } from "@/hooks/useSpecialistCalculatorSettings";
import { ClientSlider } from "./ClientSlider";
import { ResultCards } from "./ResultCards";
import { TotalSummary } from "./TotalSummary";
import { IncomeChart } from "./IncomeChart";
import { ThresholdProgress } from "./ThresholdProgress";
import { FranchiseUpsell } from "./FranchiseUpsell";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SpecialistCalculator() {
  const { data, isLoading, error } = useSpecialistCalculatorSettings();
  const [clients, setClients] = useState(50);

  useEffect(() => {
    if (data?.settings?.default_clients) {
      setClients(data.settings.default_clients);
    }
  }, [data?.settings?.default_clients]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Błąd</AlertTitle>
        <AlertDescription>
          Nie udało się załadować ustawień kalkulatora. Spróbuj odświeżyć stronę.
        </AlertDescription>
      </Alert>
    );
  }

  const { settings, thresholds } = data;

  return (
    <div className="space-y-6">
      {/* Client Slider */}
      <ClientSlider
        clients={clients}
        onClientsChange={setClients}
        minClients={settings.min_clients || 1}
        maxClients={settings.max_clients || 500}
      />

      {/* Result Cards */}
      <ResultCards
        clients={clients}
        baseCommissionEur={settings.base_commission_eur || 20}
        passivePerMonthEur={settings.passive_per_month_eur || 5}
        passiveMonths={settings.passive_months || 5}
        retentionBonusEur={settings.retention_bonus_eur || 10}
        retentionMonthsCount={settings.retention_months_count || 2}
        thresholds={thresholds}
        eurToPlnRate={settings.eur_to_pln_rate || 4.3}
      />

      {/* Total Summary */}
      <TotalSummary
        clients={clients}
        baseCommissionEur={settings.base_commission_eur || 20}
        passivePerMonthEur={settings.passive_per_month_eur || 5}
        passiveMonths={settings.passive_months || 5}
        retentionBonusEur={settings.retention_bonus_eur || 10}
        retentionMonthsCount={settings.retention_months_count || 2}
        thresholds={thresholds}
        eurToPlnRate={settings.eur_to_pln_rate || 4.3}
      />

      {/* Charts and Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncomeChart
          clients={clients}
          baseCommissionEur={settings.base_commission_eur || 20}
          passivePerMonthEur={settings.passive_per_month_eur || 5}
          passiveMonths={settings.passive_months || 5}
          retentionBonusEur={settings.retention_bonus_eur || 10}
          retentionMonthsCount={settings.retention_months_count || 2}
          thresholds={thresholds}
        />
        <ThresholdProgress
          clients={clients}
          thresholds={thresholds}
        />
      </div>

      {/* Franchise Upsell */}
      <FranchiseUpsell />
    </div>
  );
}
