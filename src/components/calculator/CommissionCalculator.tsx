import { useState, useEffect } from 'react';
import { useCalculatorSettings } from '@/hooks/useCalculatorSettings';
import { ParametersPanel } from './ParametersPanel';
import { ResultsPanel } from './ResultsPanel';
import { VolumeBonusProgress } from './VolumeBonusProgress';
import { FranchiseInfoCard } from './FranchiseInfoCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calculator } from 'lucide-react';

export function CommissionCalculator() {
  const { t } = useLanguage();
  const { data, isLoading, error } = useCalculatorSettings();

  const [followers, setFollowers] = useState(5000);
  const [conversionRate, setConversionRate] = useState(2);

  // Set defaults from settings when loaded
  useEffect(() => {
    if (data?.settings) {
      setFollowers(data.settings.default_followers || 5000);
      setConversionRate(data.settings.default_conversion || 2);
    }
  }, [data?.settings]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">
          {t('calculator.errorLoading') || 'Błąd ładowania kalkulatora. Spróbuj ponownie później.'}
        </p>
      </div>
    );
  }

  const { settings, thresholds } = data;
  const clients = Math.round(followers * (conversionRate / 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calculator className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">
            {t('calculator.title') || 'Kalkulator zarobków partnera'}
          </h1>
          <p className="text-muted-foreground">
            {t('calculator.subtitle') || 'Sprawdź potencjalne zarobki w modelu franczyzowym'}
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <ParametersPanel
            followers={followers}
            conversionRate={conversionRate}
            onFollowersChange={setFollowers}
            onConversionChange={setConversionRate}
            followersMin={settings.min_followers || 1000}
            followersMax={settings.max_followers || 100000}
            conversionMin={settings.min_conversion || 0.5}
            conversionMax={settings.max_conversion || 10}
          />
          
          <VolumeBonusProgress
            clients={clients}
            thresholds={thresholds}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <ResultsPanel
            clients={clients}
            baseCommission={settings.base_commission_per_client || 100}
            passiveRatePercentage={settings.passive_rate_percentage || 10}
            passiveMonths={settings.passive_months || 12}
            extensionBonusPerClient={settings.extension_bonus_per_client || 50}
            extensionMonthsCount={settings.extension_months_count || 2}
            eurToPlnRate={settings.eur_to_pln_rate || 4.3}
            thresholds={thresholds}
          />
          
          <FranchiseInfoCard />
        </div>
      </div>
    </div>
  );
}
