import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MeetingTimerProps {
  endTime: string | null; // ISO string
  hostUserId: string;
  currentUserId: string;
  isHost: boolean;
  isCoHost: boolean;
}

export const MeetingTimer: React.FC<MeetingTimerProps> = ({
  endTime,
  hostUserId,
  currentUserId,
  isHost,
  isCoHost,
}) => {
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isOvertime, setIsOvertime] = useState(false);
  const [collisionEvent, setCollisionEvent] = useState<string | null>(null);
  const notified15Ref = useRef(false);
  const notified5Ref = useRef(false);
  const collisionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer tick
  useEffect(() => {
    if (!endTime) return;
    const endMs = new Date(endTime).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.floor((endMs - now) / 1000);
      setTimeRemaining(diff);
      setIsOvertime(diff < 0);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  // Notifications for host/co-host
  useEffect(() => {
    if (timeRemaining === null || (!isHost && !isCoHost)) return;

    const minutesLeft = timeRemaining / 60;

    if (minutesLeft <= 15 && minutesLeft > 14 && !notified15Ref.current) {
      notified15Ref.current = true;
      toast({
        title: '⏱️ 15 minut do końca',
        description: 'Do planowanego końca spotkania pozostało 15 minut.',
      });
    }

    if (minutesLeft <= 5 && minutesLeft > 4 && !notified5Ref.current) {
      notified5Ref.current = true;
      toast({
        title: '⚠️ 5 minut do końca',
        description: 'Do planowanego końca spotkania pozostało 5 minut.',
        variant: 'destructive',
      });
    }
  }, [timeRemaining, isHost, isCoHost, toast]);

  // Collision detection after overtime (only for host)
  const checkCollisions = useCallback(async () => {
    if (!isHost) return;
    try {
      const now = new Date().toISOString();
      const in30min = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from('events')
        .select('title, start_time')
        .eq('created_by', hostUserId)
        .eq('use_internal_meeting', true)
        .gte('start_time', now)
        .lte('start_time', in30min)
        .order('start_time', { ascending: true })
        .limit(1);

      if (data && data.length > 0) {
        const mins = Math.ceil((new Date(data[0].start_time).getTime() - Date.now()) / 60000);
        setCollisionEvent(`${data[0].title} (za ${mins} min)`);
      } else {
        setCollisionEvent(null);
      }
    } catch (err) {
      console.warn('[MeetingTimer] Collision check error:', err);
    }
  }, [isHost, hostUserId]);

  useEffect(() => {
    if (!isOvertime || !isHost) {
      if (collisionCheckRef.current) clearInterval(collisionCheckRef.current);
      return;
    }
    checkCollisions();
    collisionCheckRef.current = setInterval(checkCollisions, 60000);
    return () => {
      if (collisionCheckRef.current) clearInterval(collisionCheckRef.current);
    };
  }, [isOvertime, isHost, checkCollisions]);

  if (!endTime || timeRemaining === null) return null;

  const absSeconds = Math.abs(timeRemaining);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = absSeconds % 60;
  const timeStr = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
        isOvertime
          ? 'bg-red-600/20 text-red-400'
          : timeRemaining < 300
          ? 'bg-orange-600/20 text-orange-400'
          : 'bg-zinc-800 text-zinc-400'
      }`}>
        <Clock className="h-3 w-3" />
        <span>{isOvertime ? '+' : ''}{timeStr}</span>
      </div>

      {/* Collision alert - only for host */}
      {collisionEvent && isHost && (
        <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-600/30 text-red-300">
          <AlertTriangle className="h-3 w-3" />
          <span className="truncate max-w-[200px]">Kolizja: {collisionEvent}</span>
        </div>
      )}
    </div>
  );
};
