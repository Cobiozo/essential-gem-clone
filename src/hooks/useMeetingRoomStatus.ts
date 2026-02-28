import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that checks which meeting rooms have active participants.
 * Uses a single query + Realtime subscription for live updates.
 */
export function useMeetingRoomStatus(roomIds: string[]): Set<string> {
  const [activeRoomIds, setActiveRoomIds] = useState<Set<string>>(new Set());
  const stableRoomIds = useRef<string[]>([]);

  // Only re-run when the actual room IDs change (not reference)
  const roomIdsKey = roomIds.sort().join(',');

  const fetchActiveRooms = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setActiveRoomIds(new Set());
      return;
    }

    const { data } = await supabase
      .from('meeting_room_participants')
      .select('room_id')
      .in('room_id', ids)
      .eq('is_active', true);

    if (data) {
      setActiveRoomIds(new Set(data.map(r => r.room_id)));
    }
  }, []);

  useEffect(() => {
    stableRoomIds.current = roomIds;
    fetchActiveRooms(roomIds);

    if (roomIds.length === 0) return;

    // Subscribe to changes in meeting_room_participants for these rooms
    const channel = supabase
      .channel('meeting-room-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_room_participants',
        },
        (payload) => {
          const roomId = (payload.new as any)?.room_id || (payload.old as any)?.room_id;
          if (roomId && stableRoomIds.current.includes(roomId)) {
            // Re-fetch to get accurate state
            fetchActiveRooms(stableRoomIds.current);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIdsKey, fetchActiveRooms]);

  return activeRoomIds;
}
