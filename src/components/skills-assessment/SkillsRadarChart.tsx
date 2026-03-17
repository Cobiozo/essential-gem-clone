import React from 'react';
import { ASSESSMENT_STEPS } from './assessmentData';

interface SkillsRadarChartProps {
  scores: Record<string, number>;
  size?: number;
}

const CX = 250;
const CY = 250;
const MAX_R = 180;
const SEGMENTS = ASSESSMENT_STEPS.length;
const ANGLE_STEP = (2 * Math.PI) / SEGMENTS;
const GRID_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export const SkillsRadarChart: React.FC<SkillsRadarChartProps> = ({ scores }) => {
  const startOffset = -Math.PI / 2;

  return (
    <div className="w-full flex flex-col items-center">
      <h3 className="text-sm font-bold text-foreground mb-2">Twoje Koło Umiejętności</h3>
      <svg viewBox="0 0 500 500" className="w-full max-w-[500px]">
        {/* Grid circles */}
        {GRID_STEPS.map((step) => {
          const r = (step / 10) * MAX_R;
          return (
            <circle
              key={step}
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
              opacity={0.5}
            />
          );
        })}

        {/* Radial lines */}
        {ASSESSMENT_STEPS.map((_, i) => {
          const angle = startOffset + i * ANGLE_STEP;
          const end = polarToCartesian(CX, CY, MAX_R, angle);
          return (
            <line
              key={`line-${i}`}
              x1={CX}
              y1={CY}
              x2={end.x}
              y2={end.y}
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
              opacity={0.5}
            />
          );
        })}

        {/* Scale numbers on vertical axis */}
        {GRID_STEPS.map((step) => {
          const r = (step / 10) * MAX_R;
          return (
            <text
              key={`scale-${step}`}
              x={CX + 4}
              y={CY - r + 3}
              fontSize={8}
              fill="hsl(var(--muted-foreground))"
              opacity={0.7}
            >
              {step}
            </text>
          );
        })}

        {/* Colored wedges */}
        {ASSESSMENT_STEPS.map((step, i) => {
          const score = scores[step.key] || 0;
          const r = (score / 10) * MAX_R;
          if (r < 1) return null;
          const startAngle = startOffset + i * ANGLE_STEP;
          const endAngle = startAngle + ANGLE_STEP;
          const d = describeArc(CX, CY, r, startAngle, endAngle);
          return (
            <path
              key={step.key}
              d={d}
              fill={step.chartColor}
              fillOpacity={0.7}
              stroke={step.chartColor}
              strokeWidth={1.5}
            />
          );
        })}

        {/* Labels */}
        {ASSESSMENT_STEPS.map((step, i) => {
          const midAngle = startOffset + i * ANGLE_STEP + ANGLE_STEP / 2;
          const labelR = MAX_R + 28;
          const pos = polarToCartesian(CX, CY, labelR, midAngle);
          const lines = wrapText(step.title, 14);
          const anchor =
            Math.abs(pos.x - CX) < 10
              ? 'middle'
              : pos.x > CX
                ? 'start'
                : 'end';

          return (
            <text
              key={`label-${i}`}
              x={pos.x}
              y={pos.y - ((lines.length - 1) * 5)}
              textAnchor={anchor}
              fontSize={7}
              fontWeight={600}
              fill="hsl(var(--foreground))"
            >
              {lines.map((line, li) => (
                <tspan key={li} x={pos.x} dy={li === 0 ? 0 : 10}>
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
