// Threshold logic for Omega test values

export type ThresholdLevel = 'optimal' | 'improving' | 'critical';

export interface ThresholdResult {
  level: ThresholdLevel;
  color: string;       // Tailwind text class
  bgColor: string;     // Tailwind bg class
  label: string;       // Polish status label
  dotColor: string;    // For indicators
}

export const getRatioThreshold = (value: number | null): ThresholdResult => {
  if (value === null) return { level: 'critical', color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Brak danych', dotColor: 'bg-muted-foreground' };
  if (value <= 3.0) return { level: 'optimal', color: 'text-green-400', bgColor: 'bg-green-400/10', label: 'Optymalny', dotColor: 'bg-green-400' };
  if (value <= 5.0) return { level: 'improving', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', label: 'W poprawie', dotColor: 'bg-yellow-400' };
  return { level: 'critical', color: 'text-red-400', bgColor: 'bg-red-400/10', label: 'Krytyczny', dotColor: 'bg-red-400' };
};

export const getIndexThreshold = (value: number | null): ThresholdResult => {
  if (value === null) return { level: 'critical', color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Brak danych', dotColor: 'bg-muted-foreground' };
  if (value >= 8.0) return { level: 'optimal', color: 'text-green-400', bgColor: 'bg-green-400/10', label: 'Optymalny', dotColor: 'bg-green-400' };
  if (value >= 4.0) return { level: 'improving', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', label: 'W poprawie', dotColor: 'bg-yellow-400' };
  return { level: 'critical', color: 'text-red-400', bgColor: 'bg-red-400/10', label: 'Krytyczny', dotColor: 'bg-red-400' };
};
