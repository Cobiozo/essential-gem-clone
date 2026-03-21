import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { OmegaTest } from '@/hooks/useOmegaTests';
import { format, parseISO } from 'date-fns';

interface OmegaTrendChartProps {
  tests: OmegaTest[];
}

export const OmegaTrendChart: React.FC<OmegaTrendChartProps> = ({ tests }) => {
  const data = tests.map(t => ({
    date: format(parseISO(t.test_date), 'dd.MM.yy'),
    'Stosunek O6:O3': t.omega6_3_ratio,
    'Indeks Omega-3': t.omega3_index,
  }));

  if (data.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm h-[280px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Dodaj wyniki testów, aby zobaczyć trendy</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">Historia Zmian (Test 1 vs Test 2)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis
            yAxisId="left"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            label={{ value: 'Ratio ↓', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            label={{ value: 'Index % ↑', angle: 90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Line yAxisId="left" type="monotone" dataKey="Stosunek O6:O3" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line yAxisId="right" type="monotone" dataKey="Indeks Omega-3" stroke="hsl(210, 100%, 52%)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
