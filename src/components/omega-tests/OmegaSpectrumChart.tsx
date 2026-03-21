import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { OmegaTest } from '@/hooks/useOmegaTests';
import { format, parseISO } from 'date-fns';

interface OmegaSpectrumChartProps {
  tests: OmegaTest[];
}

export const OmegaSpectrumChart: React.FC<OmegaSpectrumChartProps> = ({ tests }) => {
  const data = tests
    .filter(t => t.aa !== null || t.epa !== null || t.dha !== null || t.la !== null)
    .map(t => ({
      date: format(parseISO(t.test_date), 'dd.MM.yy'),
      AA: t.aa ?? 0,
      EPA: t.epa ?? 0,
      DHA: t.dha ?? 0,
      LA: t.la ?? 0,
    }));

  if (data.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm h-[280px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Dodaj szczegółowe wyniki (AA, EPA, DHA, LA), aby zobaczyć spektrum</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">Ewolucja Pełnego Spektrum Błony Komórkowej</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Area type="monotone" dataKey="LA" stackId="1" stroke="hsl(280, 67%, 51%)" fill="hsl(280, 67%, 51%)" fillOpacity={0.6} />
          <Area type="monotone" dataKey="AA" stackId="1" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.6} />
          <Area type="monotone" dataKey="EPA" stackId="1" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.6} />
          <Area type="monotone" dataKey="DHA" stackId="1" stroke="hsl(210, 100%, 52%)" fill="hsl(210, 100%, 52%)" fillOpacity={0.6} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
