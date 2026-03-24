import { RefreshCw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionTimerProps {
  timeRemaining: number;
  onRefresh: () => void;
  hidden?: boolean;
}

const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const SessionTimer = ({ timeRemaining, onRefresh, hidden }: SessionTimerProps) => {
  if (hidden) return null;

  const isWarning = timeRemaining <= 300; // < 5 min
  const isCritical = timeRemaining <= 60;  // < 1 min

  return (
    <div className="flex items-center gap-1.5">
      <Clock className={cn(
        'h-3.5 w-3.5',
        isCritical ? 'text-destructive' : isWarning ? 'text-accent-foreground' : 'text-muted-foreground'
      )} />
      <span className={cn(
        'font-mono text-xs font-semibold tabular-nums',
        isCritical ? 'text-destructive' : isWarning ? 'text-accent-foreground' : 'text-muted-foreground'
      )}>
        {formatTime(timeRemaining)}
      </span>
      <button
        onClick={onRefresh}
        className="rounded p-0.5 transition-colors hover:bg-accent"
        title="Odśwież timer sesji"
      >
        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  );
};

export default SessionTimer;
