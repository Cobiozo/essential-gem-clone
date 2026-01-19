import { useState, useEffect } from 'react';
import { useCalculatorSettings } from '@/hooks/useCalculatorSettings';
import { ParametersPanel } from './ParametersPanel';
import { TotalResultCard } from './TotalResultCard';
import { IncomeBreakdown } from './IncomeBreakdown';
import { VolumeBonusProgress } from './VolumeBonusProgress';
import { FranchiseInfoCard } from './FranchiseInfoCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import pureLifeLogo from '@/assets/pure-life-logo-new.png';

export function CommissionCalculator() {
  const { data, isLoading, error } = useCalculatorSettings();

  const [followers, setFollowers] = useState(5000);
  const [conversionRate, setConversionRate] = useState(2);

  useEffect(() => {
    if (data?.settings) {
      setFollowers(data.settings.default_followers || 5000);
      setConversionRate(data.settings.default_conversion || 2);
    }
  }, [data?.settings]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 xl:grid-cols-[280px_1fr_320px] lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80 lg:col-span-2 xl:col-span-1" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">
          Błąd ładowania kalkulatora. Spróbuj ponownie później.
        </p>
      </div>
    );
  }

  const { settings, thresholds } = data;
  const clients = Math.round(followers * (conversionRate / 100));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 to-emerald-700 text-white p-4 sm:p-6 rounded-xl">
        <div className="flex items-center gap-3">
          <img src={pureLifeLogo} alt="Pure Life" className="h-10 w-auto" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              Pure Life <span className="font-light">Kalkulator</span>
            </h1>
            <p className="text-emerald-200 text-xs sm:text-sm">
              Symulacja przychodów z systemu afiliacyjnego (Model Omega-3)
            </p>
          </div>
        </div>
        <Badge className="bg-white/20 text-white border-0 hover:bg-white/30 self-start sm:self-auto">
          Model: 6-miesięczna kuracja
        </Badge>
      </div>

      {/* Main 3-column grid */}
      <div className="grid gap-4 xl:grid-cols-[280px_1fr_320px] lg:grid-cols-2">
        {/* Left column - Parameters */}
        <div className="space-y-4">
          <ParametersPanel
            followers={followers}
            conversionRate={conversionRate}
            onFollowersChange={setFollowers}
            onConversionChange={setConversionRate}
            followersMin={settings.min_followers || 1000}
            followersMax={settings.max_followers || 2000000}
            conversionMin={settings.min_conversion || 0.1}
            conversionMax={settings.max_conversion || 5}
          />
        </div>

        {/* Middle column - Results + Income Breakdown */}
        <div className="space-y-4">
          <TotalResultCard
            clients={clients}
            baseCommission={settings.base_commission_per_client || 20}
            passivePerClientEur={settings.passive_per_client_eur || 5}
            passiveMonths={settings.passive_months || 5}
            extensionBonusPerClient={settings.extension_bonus_per_client || 10}
            extensionMonthsCount={settings.extension_months_count || 2}
            eurToPlnRate={settings.eur_to_pln_rate || 4.3}
            thresholds={thresholds}
            maxClients={Math.round((settings.max_followers || 2000000) * ((settings.max_conversion || 5) / 100))}
          />
          
          <IncomeBreakdown
            clients={clients}
            baseCommission={settings.base_commission_per_client || 20}
            passivePerClientEur={settings.passive_per_client_eur || 5}
            passiveMonths={settings.passive_months || 5}
            extensionBonusPerClient={settings.extension_bonus_per_client || 10}
            extensionMonthsCount={settings.extension_months_count || 2}
            thresholds={thresholds}
          />
        </div>

        {/* Right column - Volume Bonuses */}
        <div className="space-y-4 lg:col-span-2 xl:col-span-1">
          <VolumeBonusProgress
            clients={clients}
            thresholds={thresholds}
          />
          
          <FranchiseInfoCard />
        </div>
      </div>
    </div>
  );
}
