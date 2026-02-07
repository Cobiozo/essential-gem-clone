import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface TrainingDonutChartProps {
  progress: number;
  size?: number;
  isCompleted?: boolean;
}

export const TrainingDonutChart: React.FC<TrainingDonutChartProps> = ({ 
  progress, 
  size = 48,
  isCompleted = false,
}) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (isCompleted) {
    return (
      <div 
        className="flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600"
        style={{ width: size, height: size }}
      >
        <CheckCircle2 className="h-5 w-5 text-white" />
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(43, 74%, 49%)" />
            <stop offset="100%" stopColor="hsl(43, 85%, 67%)" />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-muted"
          strokeWidth="4"
          fill="transparent"
        />
        {/* Progress circle with gold gradient */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#goldGradient)"
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Percentage in center */}
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
        {progress}%
      </span>
    </div>
  );
};

export default TrainingDonutChart;
