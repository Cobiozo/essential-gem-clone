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
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-lg">
      <Clock className={cn(
        'h-4 w-4',
        isCritical ? 'text-destructive' : isWarning ? 'text-accent-foreground' : 'text-muted-foreground'
      )} />
      <span className={cn(
        'font-mono text-sm font-semibold tabular-nums',
        isCritical ? 'text-destructive' : isWarning ? 'text-accent-foreground' : 'text-foreground'
      )}>
        {formatTime(timeRemaining)}
      </span>
      <button
        onClick={onRefresh}
        className="rounded-lg p-1 transition-colors hover:bg-accent"
        title="Odśwież timer sesji"
      >
        <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  );
};

export default SessionTimer;
