import React from 'react';

interface GaugeProps {
  value: number | null;
  min: number;
  max: number;
  label: string;
  unit: string;
  targetLabel: string;
  colorFrom: string;
  colorTo: string;
  reverse?: boolean;
}

const GaugeChart: React.FC<GaugeProps> = ({ value, min, max, label, unit, targetLabel, colorFrom, colorTo, reverse }) => {
  const displayValue = value ?? min;
  const clampedValue = Math.max(min, Math.min(max, displayValue));
  const percentage = ((clampedValue - min) / (max - min)) * 100;
  const angle = -90 + (percentage / 100) * 180;
  
  // For ratio: lower is better (reverse), for index: higher is better
  const isGood = reverse ? displayValue <= 5 : displayValue >= 8;
  const isOk = reverse ? displayValue <= 10 : displayValue >= 5;
  const statusColor = isGood ? 'hsl(142, 71%, 45%)' : isOk ? 'hsl(48, 96%, 53%)' : 'hsl(0, 84%, 60%)';

  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      <div className="relative w-40 h-24 overflow-hidden">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <defs>
            <linearGradient id={`gauge-grad-${label.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colorFrom} />
              <stop offset="100%" stopColor={colorTo} />
            </linearGradient>
          </defs>
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Colored arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={`url(#gauge-grad-${label.replace(/\s/g, '')})`}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(percentage / 100) * 251.2} 251.2`}
          />
          {/* Needle */}
          <g transform={`rotate(${angle}, 100, 100)`}>
            <line x1="100" y1="100" x2="100" y2="30" stroke={statusColor} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="100" r="5" fill={statusColor} />
          </g>
          {/* Value text */}
          <text x="100" y="92" textAnchor="middle" fill={statusColor} fontSize="22" fontWeight="bold">
            {value !== null ? (reverse ? `${displayValue}:1` : `${displayValue}%`) : '—'}
          </text>
        </svg>
      </div>
      <span className="text-[10px] text-muted-foreground">{targetLabel}</span>
    </div>
  );
};

interface OmegaGaugeChartsProps {
  omega6_3_ratio: number | null;
  omega3_index: number | null;
}

export const OmegaGaugeCharts: React.FC<OmegaGaugeChartsProps> = ({ omega6_3_ratio, omega3_index }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <GaugeChart
        value={omega6_3_ratio}
        min={1}
        max={25}
        label="Stosunek Omega-6:3"
        unit=":1"
        targetLabel="Cel: ≤3:1 (AA/EPA)"
        colorFrom="hsl(0, 84%, 60%)"
        colorTo="hsl(142, 71%, 45%)"
        reverse
      />
      <GaugeChart
        value={omega3_index}
        min={0}
        max={12}
        label="Indeks Omega-3 %"
        unit="%"
        targetLabel="Cel: ≥8% (ΣEPA+DHA)"
        colorFrom="hsl(0, 84%, 60%)"
        colorTo="hsl(210, 100%, 52%)"
      />
    </div>
  );
};
