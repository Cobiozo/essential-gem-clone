import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ConvChannel = 'offline' | 'online';
export type ConvSubchannel =
  | 'face_to_face'
  | 'phone'
  | 'zoom'
  | 'whatsapp'
  | 'messenger'
  | 'other_messenger'
  | 'social_media';
export type PhoneResult = 'answered' | 'no_answer' | 'wrong_number' | 'out_of_range';

export interface ContactConversation {
  id: string; // local uuid (may be ephemeral until saved)
  persisted?: boolean;
  contact_date: string; // YYYY-MM-DD
  channel: ConvChannel | '';
  subchannel: ConvSubchannel | '';
  phone_result: PhoneResult | '' | null;
  next_contact_date: string | null;
  note: string | null;
  sort_index: number;
}

const newId = () => (crypto?.randomUUID?.() ?? `tmp-${Math.random().toString(36).slice(2)}`);

export const makeEmptyConversation = (sort_index = 0): ContactConversation => ({
  id: newId(),
  persisted: false,
  contact_date: new Date().toISOString().split('T')[0],
  channel: '',
  subchannel: '',
  phone_result: '',
  next_contact_date: null,
  note: null,
  sort_index,
});

export const useContactConversations = (contactId?: string | null) => {
  const [items, setItems] = useState<ContactConversation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!contactId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('team_contact_conversations')
      .select('*')
      .eq('contact_id', contactId)
      .order('sort_index', { ascending: true })
      .order('created_at', { ascending: true });
    if (!error && data) {
      setItems(
        data.map((row: any, idx: number) => ({
          id: row.id,
          persisted: true,
          contact_date: row.contact_date || '',
          channel: row.channel || '',
          subchannel: row.subchannel || '',
          phone_result: row.phone_result || '',
          next_contact_date: row.next_contact_date || null,
          note: row.note || null,
          sort_index: row.sort_index ?? idx,
        }))
      );
    }
    setLoading(false);
  }, [contactId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Persists the provided list to DB for a given contact_id/user_id. */
  const persist = useCallback(
    async (targetContactId: string, userId: string, list: ContactConversation[]) => {
      // Fetch existing to know what to delete
      const { data: existing } = await (supabase as any)
        .from('team_contact_conversations')
        .select('id')
        .eq('contact_id', targetContactId);
      const existingIds: string[] = (existing || []).map((r: any) => r.id);
      const keptIds = list.filter((i) => i.persisted).map((i) => i.id);
      const toDelete = existingIds.filter((id) => !keptIds.includes(id));
      if (toDelete.length) {
        await (supabase as any)
          .from('team_contact_conversations')
          .delete()
          .in('id', toDelete);
      }

      // Upserts
      const rows = list
        .filter((i) => i.channel && i.subchannel) // skip empty drafts
        .map((i, idx) => ({
          ...(i.persisted ? { id: i.id } : {}),
          contact_id: targetContactId,
          user_id: userId,
          contact_date: i.contact_date || null,
          channel: i.channel || null,
          subchannel: i.subchannel || null,
          phone_result: i.subchannel === 'phone' ? i.phone_result || null : null,
          next_contact_date: i.next_contact_date || null,
          note: i.note || null,
          sort_index: idx,
        }));
      if (rows.length) {
        const { error } = await (supabase as any)
          .from('team_contact_conversations')
          .upsert(rows);
        if (error) throw error;
      }
    },
    []
  );

  return { items, setItems, loading, reload: load, persist };
};
