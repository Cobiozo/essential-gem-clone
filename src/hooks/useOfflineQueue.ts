import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'offline_contacts_queue';
const MAX_QUEUE_SIZE = 50;

interface QueueItem {
  id: string;
  data: Record<string, any>;
  timestamp: number;
}

const readQueue = (): QueueItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: QueueItem[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

export const useOfflineQueue = (onSyncComplete?: () => void) => {
  const { toast } = useToast();
  const [pendingCount, setPendingCount] = useState(() => readQueue().length);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(() => {
    setPendingCount(readQueue().length);
  }, []);

  const enqueue = useCallback((contactData: Record<string, any>) => {
    const queue = readQueue();
    if (queue.length >= MAX_QUEUE_SIZE) {
      toast({
        title: 'Kolejka pełna',
        description: `Maksymalnie ${MAX_QUEUE_SIZE} kontaktów może czekać na synchronizację`,
        variant: 'destructive',
      });
      return false;
    }
    queue.push({
      id: crypto.randomUUID(),
      data: contactData,
      timestamp: Date.now(),
    });
    writeQueue(queue);
    refreshCount();
    return true;
  }, [toast, refreshCount]);

  const sync = useCallback(async (userId: string) => {
    if (syncingRef.current) return;
    const queue = readQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    let synced = 0;
    let failed = 0;
    const remaining: QueueItem[] = [];

    for (const item of queue) {
      try {
        const insertPayload = { ...item.data, user_id: userId } as any;
        const { data, error } = await supabase
          .from('team_contacts')
          .insert(insertPayload)
          .select()
          .single();

        if (error) {
          // Network error — keep in queue
          if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
            remaining.push(item);
          } else {
            // DB error — discard
            failed++;
            console.error('Offline sync DB error:', error);
          }
        } else {
          synced++;
          // Add history entry
          try {
            await supabase.from('team_contacts_history').insert({
              contact_id: data.id,
              change_type: 'created',
              new_values: data as any,
              changed_by: userId,
            });
          } catch {}
        }
      } catch {
        remaining.push(item);
      }
    }

    writeQueue(remaining);
    refreshCount();
    syncingRef.current = false;

    if (synced > 0) {
      toast({
        title: 'Synchronizacja zakończona',
        description: `Zsynchronizowano ${synced} kontakt(ów)${failed > 0 ? `, ${failed} z błędami` : ''}`,
      });
      onSyncComplete?.();
    } else if (failed > 0) {
      toast({
        title: 'Błędy synchronizacji',
        description: `${failed} kontakt(ów) nie udało się zsynchronizować`,
        variant: 'destructive',
      });
    }
  }, [toast, refreshCount, onSyncComplete]);

  // Listen for online event
  useEffect(() => {
    const handler = () => {
      // Get current user and sync
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          sync(data.user.id);
        }
      });
    };

    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [sync]);

  return { pendingCount, enqueue, sync, refreshCount };
};
