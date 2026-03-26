import React, { useState, useEffect, useRef } from 'react';
import { Users } from 'lucide-react';

interface AutoWebinarParticipantCountProps {
  min: number;
  max: number;
  label?: string;
}

export const AutoWebinarParticipantCount: React.FC<AutoWebinarParticipantCountProps> = ({ min, max, label }) => {
  const [count, setCount] = useState(() => Math.floor(Math.random() * (max - min + 1)) + min);
  const intervalRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const scheduleNext = () => {
      const delay = 10000 + Math.random() * 10000; // 10-20s
      intervalRef.current = setTimeout(() => {
        setCount(prev => {
          // Small delta: ±1 to ±5
          const delta = Math.floor(Math.random() * 5) + 1;
          const direction = Math.random() < 0.5 ? -1 : 1;
          const next = prev + delta * direction;
          return Math.max(min, Math.min(max, next));
        });
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => clearTimeout(intervalRef.current);
  }, [min, max]);

  return (
    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white/90 rounded-full px-3 py-1.5 text-sm font-medium">
      <Users className="h-4 w-4" />
      {label && <span>{label}</span>}
      <span>{count}</span>
    </div>
  );
};
