import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface AutoWebinarCountdownProps {
  secondsToNext: number;
  label?: string;
}

export const AutoWebinarCountdown: React.FC<AutoWebinarCountdownProps> = ({ 
  secondsToNext, 
  label = 'Następny webinar za' 
}) => {
  const [remaining, setRemaining] = useState(secondsToNext);

  useEffect(() => {
    setRemaining(secondsToNext);
  }, [secondsToNext]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
      <Clock className="h-5 w-5 text-primary animate-pulse" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold font-mono text-primary">
          {hours > 0 && `${pad(hours)}:`}{pad(minutes)}:{pad(seconds)}
        </p>
      </div>
    </div>
  );
};
