import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

/**
 * Countdown to 22:00 Europe/Warsaw, deadline relative to a specific challenge day.
 *
 * - dayOffset = 0 (default, current day) → deadline = TOMORROW 22:00 Warsaw
 * - dayOffset = -1 (previous day) → deadline = TODAY 22:00 Warsaw
 * - dayOffset = -2 → deadline = YESTERDAY 22:00 Warsaw (always expired)
 */
export const DayCountdown = ({
  forDay,
  dayOffset = 0,
  compact = false,
}: {
  forDay: number;
  dayOffset?: number;
  compact?: boolean;
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const deadline = computeDeadline(dayOffset);
  const diff = deadline - now;
  const expired = diff <= 0;

  const fmt = formatRemaining(Math.max(0, diff));
  return (
    <div className={`inline-flex items-center gap-2 ${compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"} rounded-full font-medium border ${
      expired ? "bg-destructive/10 text-destructive border-destructive/30"
      : diff < 3 * 3600 * 1000 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
      : "bg-muted text-muted-foreground border-border"
    }`}>
      {expired ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
      {expired
        ? `Czas minął — Dzień ${forDay} zamknięty`
        : <>Pozostało <span className="tabular-nums font-semibold">{fmt}</span> na zaliczenie Dnia {forDay}</>}
    </div>
  );
};

function computeDeadline(dayOffset: number): number {
  // Compute Warsaw "now" wall-clock, then deadline = (today + 1 + dayOffset) at 22:00 Warsaw.
  const nowInWarsawStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" });
  const warsawNow = new Date(nowInWarsawStr);
  const deadline = new Date(warsawNow);
  deadline.setDate(warsawNow.getDate() + 1 + dayOffset);
  deadline.setHours(22, 0, 0, 0);
  const driftMs = warsawNow.getTime() - Date.now();
  return deadline.getTime() - driftMs;
}

function formatRemaining(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}
