import { useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface MedicalChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatHistoryEntry {
  id: string;
  query: string;
  response: string;
  results_count: number;
  created_at: string;
}

const MEDICAL_CHAT_URL = 'https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/medical-assistant';

export const useMedicalChatStream = () => {
  const [messages, setMessages] = useState<MedicalChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsCount, setResultsCount] = useState<number>(10);
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const { language } = useLanguage();
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount - abort any pending requests
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Load chat history on mount
  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  const loadChatHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('medical_chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setChatHistory(data || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const saveChatHistory = async (query: string, response: string) => {
    if (!user) return;
    
    try {
      // Insert new entry
      await supabase
        .from('medical_chat_history')
        .insert({
          user_id: user.id,
          query,
          response,
          results_count: resultsCount,
        });
      
      // Reload history to get updated list (keeps only last 10)
      await loadChatHistory();
    } catch (err) {
      console.error('Failed to save chat history:', err);
    }
  };

  const sendMessage = useCallback(async (userMessage: string, overrideResultsCount?: number) => {
    if (!userMessage.trim()) return;

    // Abort any previous pending request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const userMsg: MedicalChatMessage = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    const effectiveResultsCount = overrideResultsCount !== undefined ? overrideResultsCount : resultsCount;

    try {
      const response = await fetch(MEDICAL_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          language,
          resultsCount: effectiveResultsCount === 0 ? 100 : effectiveResultsCount, // 0 = max = 100
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Przekroczono limit zapytań. Spróbuj ponownie za chwilę.');
        }
        if (response.status === 402) {
          throw new Error('Wymagana płatność. Dodaj środki, aby kontynuować.');
        }
        throw new Error(`Error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process line by line
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg?.role === 'assistant') {
                  lastMsg.content = assistantContent;
                }
                return newMessages;
              });
            }
          } catch {
            // Incomplete JSON, put back and wait for more
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg?.role === 'assistant') {
                  lastMsg.content = assistantContent;
                }
                return newMessages;
              });
            }
          } catch { /* ignore */ }
        }
      }

      // Save to history
      if (assistantContent) {
        await saveChatHistory(userMessage, assistantContent);
      }
    } catch (err) {
      // Ignore abort errors - they're expected when component unmounts
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Medical chat error:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił błąd');
      // Remove the empty assistant message on error
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1 || prev[i].content !== ''));
    } finally {
      setIsLoading(false);
    }
  }, [messages, language, resultsCount, user]);

  const setMessagesDirectly = useCallback((msgs: MedicalChatMessage[]) => {
    setMessages(msgs);
    setError(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const loadFromHistory = useCallback((entry: ChatHistoryEntry) => {
    setMessages([
      { role: 'user', content: entry.query },
      { role: 'assistant', content: entry.response },
    ]);
  }, []);

  return { 
    messages, 
    isLoading, 
    error, 
    sendMessage, 
    clearMessages, 
    setMessagesDirectly,
    resultsCount, 
    setResultsCount,
    chatHistory,
    loadFromHistory,
  };
};
