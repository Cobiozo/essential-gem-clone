import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AutoWebinarFakeMessage } from '@/types/autoWebinar';

export interface ChatMessage {
  id: string;
  author_name: string;
  content: string;
  timestamp: Date;
  isFake: boolean;
}

export function useAutoWebinarFakeChat(configId: string | null, startOffset: number, isPlaying: boolean) {
  const [fakeMessages, setFakeMessages] = useState<AutoWebinarFakeMessage[]>([]);
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [userMessages, setUserMessages] = useState<ChatMessage[]>([]);
  const shownIdsRef = useRef<Set<string>>(new Set());

  // Fetch fake messages
  useEffect(() => {
    if (!configId) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('auto_webinar_fake_messages')
        .select('*')
        .eq('config_id', configId)
        .order('appear_at_minute', { ascending: true })
        .order('sort_order', { ascending: true });
      setFakeMessages((data as AutoWebinarFakeMessage[]) || []);
    };
    fetchMessages();
  }, [configId]);

  // Update visible messages based on startOffset
  useEffect(() => {
    if (!isPlaying || startOffset < 0) return;

    const currentMinute = Math.floor(startOffset / 60);
    const newVisible: ChatMessage[] = [];

    for (const msg of fakeMessages) {
      if (msg.appear_at_minute <= currentMinute && !shownIdsRef.current.has(msg.id)) {
        shownIdsRef.current.add(msg.id);
        newVisible.push({
          id: msg.id,
          author_name: msg.author_name,
          content: msg.content,
          timestamp: new Date(),
          isFake: true,
        });
      }
    }

    if (newVisible.length > 0) {
      setVisibleMessages(prev => [...prev, ...newVisible]);
    }
  }, [startOffset, fakeMessages, isPlaying]);

  // Reset when video changes
  useEffect(() => {
    shownIdsRef.current.clear();
    setVisibleMessages([]);
    setUserMessages([]);
  }, [configId]);

  const allMessages = [...visibleMessages, ...userMessages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const sendMessage = (content: string, authorName: string = 'Ty') => {
    const msg: ChatMessage = {
      id: `user-${Date.now()}`,
      author_name: authorName,
      content,
      timestamp: new Date(),
      isFake: false,
    };
    setUserMessages(prev => [...prev, msg]);
  };

  return { messages: allMessages, sendMessage };
}
