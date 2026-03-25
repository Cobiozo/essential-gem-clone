import React, { useState, useEffect, useRef } from 'react';
import { Users } from 'lucide-react';

interface AutoWebinarParticipantCountProps {
  min: number;
  max: number;
}

export const AutoWebinarParticipantCount: React.FC<AutoWebinarParticipantCountProps> = ({ min, max }) => {
  const [count, setCount] = useState(() => Math.floor(Math.random() * (max - min + 1)) + min);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const tick = () => {
      setCount(Math.floor(Math.random() * (max - min + 1)) + min);
    };

    const scheduleNext = () => {
      const delay = 10000 + Math.random() * 10000; // 10-20s
      intervalRef.current = setTimeout(() => {
        tick();
        scheduleNext();
      }, delay) as unknown as ReturnType<typeof setInterval>;
    };

    scheduleNext();
    return () => clearTimeout(intervalRef.current as unknown as number);
  }, [min, max]);

  return (
    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white/90 rounded-full px-3 py-1.5 text-sm font-medium">
      <Users className="h-4 w-4" />
      <span>{count}</span>
    </div>
  );
};
