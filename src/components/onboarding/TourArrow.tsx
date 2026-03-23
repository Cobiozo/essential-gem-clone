import React, { useMemo } from 'react';

interface TourArrowProps {
  tooltipRect: { top: number; left: number; width: number; height: number };
  highlightRect: { top: number; left: number; width: number; height: number };
  position: 'top' | 'bottom' | 'left' | 'right';
}

export const TourArrow: React.FC<TourArrowProps> = ({
  tooltipRect,
  highlightRect,
  position,
}) => {
  const arrowPath = useMemo(() => {
    // Calculate start (from tooltip edge) and end (to highlight center edge)
    let startX: number, startY: number, endX: number, endY: number;
    // highlightRect uses scrollY-based coords, convert to viewport for SVG
    const hlTop = highlightRect.top - window.scrollY;
    const hlLeft = highlightRect.left;

    switch (position) {
      case 'bottom':
        // Tooltip is below highlight → arrow from top of tooltip to bottom of highlight
        startX = tooltipRect.left + tooltipRect.width / 2;
        startY = tooltipRect.top;
        endX = hlLeft + highlightRect.width / 2;
        endY = hlTop + highlightRect.height;
        break;
      case 'top':
        // Tooltip is above → arrow from bottom of tooltip to top of highlight
        startX = tooltipRect.left + tooltipRect.width / 2;
        startY = tooltipRect.top + tooltipRect.height;
        endX = hlLeft + highlightRect.width / 2;
        endY = hlTop;
        break;
      case 'left':
        // Tooltip is to the left → arrow from right of tooltip to left of highlight
        startX = tooltipRect.left + tooltipRect.width;
        startY = tooltipRect.top + tooltipRect.height / 2;
        endX = hlLeft;
        endY = hlTop + highlightRect.height / 2;
        break;
      case 'right':
        // Tooltip is to the right → arrow from left of tooltip to right of highlight
        startX = tooltipRect.left;
        startY = tooltipRect.top + tooltipRect.height / 2;
        endX = hlLeft + highlightRect.width;
        endY = hlTop + highlightRect.height / 2;
        break;
    }

    // Bezier control points for a nice curve
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    let cx1: number, cy1: number, cx2: number, cy2: number;

    if (position === 'bottom' || position === 'top') {
      cx1 = startX;
      cy1 = midY;
      cx2 = endX;
      cy2 = midY;
    } else {
      cx1 = midX;
      cy1 = startY;
      cx2 = midX;
      cy2 = endY;
    }

    return { startX, startY, endX, endY, cx1, cy1, cx2, cy2 };
  }, [tooltipRect, highlightRect, position]);

  const { startX, startY, endX, endY, cx1, cy1, cx2, cy2 } = arrowPath;

  // Calculate arrowhead angle at end point
  const angle = Math.atan2(endY - cy2, endX - cx2);
  const arrowLen = 12;
  const arrowAngle = Math.PI / 6;

  const arrow1X = endX - arrowLen * Math.cos(angle - arrowAngle);
  const arrow1Y = endY - arrowLen * Math.sin(angle - arrowAngle);
  const arrow2X = endX - arrowLen * Math.cos(angle + arrowAngle);
  const arrow2Y = endY - arrowLen * Math.sin(angle + arrowAngle);

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-[9999]"
      style={{ overflow: 'visible' }}
    >
      {/* Glow effect */}
      <path
        d={`M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeOpacity="0.3"
        strokeLinecap="round"
      />
      {/* Main line */}
      <path
        d={`M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="8 4"
        className="animate-pulse"
      />
      {/* Arrowhead */}
      <polygon
        points={`${endX},${endY} ${arrow1X},${arrow1Y} ${arrow2X},${arrow2Y}`}
        fill="hsl(var(--primary))"
        className="animate-pulse"
      />
      {/* Dot at arrowhead */}
      <circle
        cx={endX}
        cy={endY}
        r="5"
        fill="hsl(var(--primary))"
        className="animate-ping"
        style={{ transformOrigin: `${endX}px ${endY}px` }}
      />
    </svg>
  );
};
