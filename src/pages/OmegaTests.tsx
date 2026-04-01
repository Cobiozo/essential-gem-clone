import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useOmegaTests } from '@/hooks/useOmegaTests';
import { OmegaGaugeCharts } from '@/components/omega-tests/OmegaGaugeCharts';
import { OmegaTestForm } from '@/components/omega-tests/OmegaTestForm';
import { OmegaTrendChart } from '@/components/omega-tests/OmegaTrendChart';
import { OmegaSpectrumChart } from '@/components/omega-tests/OmegaSpectrumChart';
import { OmegaTestHistory } from '@/components/omega-tests/OmegaTestHistory';
import { VitalityProgress } from '@/components/omega-tests/VitalityProgress';
import { Droplets } from 'lucide-react';

const OmegaTests: React.FC = () => {
  const { tests, isLoading, addTest, updateTest, deleteTest, latestTest } = useOmegaTests();

  return (
    <DashboardLayout title="Moje Testy" backTo={{ label: 'Strona główna', path: '/dashboard' }}>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Droplets className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">
              Dziennik Optymalizacji Omega
            </h1>
            <p className="text-xs text-muted-foreground">
              Protokół 6-miesięczny oparty o cykl życia krwinek czerwonych (120 dni)
            </p>
          </div>
        </div>

        {/* Section A: Protocol Timeline — full width */}
        <VitalityProgress tests={tests} />

        {/* Main grid: Section B (center) + Section C (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Section B: KPI Cards + Charts */}
          <div className="lg:col-span-8 space-y-4">
            <OmegaGaugeCharts
              omega6_3_ratio={latestTest?.omega6_3_ratio ?? null}
              omega3_index={latestTest?.omega3_index ?? null}
            />
            <OmegaTrendChart tests={tests} />
            <OmegaSpectrumChart tests={tests} />
          </div>

          {/* Section C: Form + History */}
          <div className="lg:col-span-4 space-y-4">
            <OmegaTestForm
              onSubmit={(data) => addTest.mutate(data)}
              isLoading={addTest.isPending}
            />
            <OmegaTestHistory
              tests={tests}
              onDelete={(id) => deleteTest.mutate(id)}
              onEdit={(id, data) => updateTest.mutate({ id, ...data })}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OmegaTests;
