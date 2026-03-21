import React from 'react';
import { getRatioThreshold, getIndexThreshold } from './OmegaThresholds';
import { Scale, Droplets } from 'lucide-react';

interface OmegaGaugeChartsProps {
  omega6_3_ratio: number | null;
  omega3_index: number | null;
}

export const OmegaGaugeCharts: React.FC<OmegaGaugeChartsProps> = ({ omega6_3_ratio, omega3_index }) => {
  const ratioThreshold = getRatioThreshold(omega6_3_ratio);
  const indexThreshold = getIndexThreshold(omega3_index);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Ratio KPI */}
      <div className={`p-5 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm ${ratioThreshold.bgColor}`}>
        <div className="flex items-center gap-2 mb-3">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Twój Balans Omega-6:3</span>
        </div>
        <div className={`text-4xl font-bold ${ratioThreshold.color} tracking-tight`}>
          {omega6_3_ratio !== null ? `${omega6_3_ratio}:1` : '—'}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className={`h-2 w-2 rounded-full ${ratioThreshold.dotColor}`} />
          <span className={`text-xs font-medium ${ratioThreshold.color}`}>{ratioThreshold.label}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Cel: ≤3:1 (AA/EPA)</p>
      </div>

      {/* Index KPI */}
      <div className={`p-5 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm ${indexThreshold.bgColor}`}>
        <div className="flex items-center gap-2 mb-3">
          <Droplets className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Twój Indeks Omega-3</span>
        </div>
        <div className={`text-4xl font-bold ${indexThreshold.color} tracking-tight`}>
          {omega3_index !== null ? `${omega3_index}%` : '—'}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className={`h-2 w-2 rounded-full ${indexThreshold.dotColor}`} />
          <span className={`text-xs font-medium ${indexThreshold.color}`}>{indexThreshold.label}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Cel: ≥8% (ΣEPA+DHA)</p>
      </div>
    </div>
  );
};
