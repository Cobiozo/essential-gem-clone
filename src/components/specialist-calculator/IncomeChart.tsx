import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart3 } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { SpecialistVolumeThreshold } from "@/hooks/useSpecialistCalculatorSettings";

interface IncomeChartProps {
  clients: number;
  baseCommissionEur: number;
  passivePerMonthEur: number;
  passiveMonths: number;
  retentionBonusEur: number;
  retentionMonthsCount: number;
  thresholds: SpecialistVolumeThreshold[];
}

export function IncomeChart({
  clients,
  baseCommissionEur,
  passivePerMonthEur,
  passiveMonths,
  retentionBonusEur,
  retentionMonthsCount,
  thresholds
}: IncomeChartProps) {
  const { formatAmount, symbol, convert } = useCurrency();
  const { tf } = useLanguage();
  
  const commission = clients * baseCommissionEur;
  const passiveIncome = clients * passivePerMonthEur * passiveMonths;
  const retentionBonus = clients * retentionBonusEur * retentionMonthsCount;
  const volumeBonus = thresholds
    .filter(t => clients >= t.threshold_clients)
    .reduce((sum, t) => sum + t.bonus_amount, 0);

  const data = [
    { name: tf('calc.spec.chartCommission', 'Prowizja'), value: convert(commission), color: "hsl(var(--chart-1))" },
    { name: tf('calc.spec.chartPassive', 'Pasywny'), value: convert(passiveIncome), color: "hsl(var(--chart-2))" },
    { name: tf('calc.spec.chartRetention', 'Przedłużenie'), value: convert(retentionBonus), color: "hsl(var(--chart-3))" },
    { name: tf('calc.spec.chartBonuses', 'Premie'), value: convert(volumeBonus), color: "hsl(var(--chart-4))" }
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          {tf('calc.spec.incomeStructure', 'Struktura przychodu')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
              <XAxis type="number" tickFormatter={(value) => `${value} ${symbol}`} />
              <YAxis type="category" dataKey="name" width={75} />
              <Tooltip 
                formatter={(value: number) => [formatAmount(value, false) + ` ${symbol}`, tf('calc.spec.amount', 'Kwota')]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
