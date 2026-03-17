import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { ASSESSMENT_STEPS } from './assessmentData';

interface SkillsRadarChartProps {
  scores: Record<string, number>;
  size?: number;
}

const SHORT_LABELS: Record<string, string> = {
  why: 'Dlaczego',
  recruiting: 'Rekrutacja',
  compensation: 'Plan wynagrz.',
  mindset: 'Mindset',
  leadership: 'Przywództwo',
  finance: 'Finanse',
  speaking: 'Komunikacja',
  health: 'Zdrowie',
  duplication: 'Duplikacja',
  giving: 'Dawanie',
  sales: 'Sprzedaż',
  products: 'Produkty',
};

export const SkillsRadarChart: React.FC<SkillsRadarChartProps> = ({ scores }) => {
  const data = ASSESSMENT_STEPS.map((step) => ({
    subject: SHORT_LABELS[step.key] || step.key,
    value: scores[step.key] || 0,
    fullMark: 10,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 10]}
          tickCount={6}
          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Radar
          name="Umiejętności"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};
