import React, { useState, useRef, useEffect } from 'react';
import { Stethoscope, Send, X, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMedicalChatStream } from '@/hooks/useMedicalChatStream';
import { useLanguage } from '@/contexts/LanguageContext';

export const MedicalChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { messages, isLoading, error, sendMessage, clearMessages } = useMedicalChatStream();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t, language } = useLanguage();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getTranslation = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      title: {
        pl: 'Asystent Medyczny',
        de: 'Medizinischer Assistent',
        en: 'Medical Assistant',
      },
      placeholder: {
        pl: 'Zadaj pytanie medyczne...',
        de: 'Stellen Sie eine medizinische Frage...',
        en: 'Ask a medical question...',
      },
      disclaimer: {
        pl: '⚠️ Ten asystent służy wyłącznie celom informacyjnym i nie zastępuje porady lekarskiej.',
        de: '⚠️ Dieser Assistent dient nur zu Informationszwecken und ersetzt keine ärztliche Beratung.',
        en: '⚠️ This assistant is for informational purposes only and does not replace medical advice.',
      },
      thinking: {
        pl: 'Analizuję literaturę naukową...',
        de: 'Analysiere wissenschaftliche Literatur...',
        en: 'Analyzing scientific literature...',
      },
    };
    return translations[key]?.[language] || translations[key]?.en || key;
  };

  // Convert markdown links to clickable HTML
  const renderMessageContent = (content: string) => {
    // Convert markdown links [text](url) to HTML
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(
          <span key={lastIndex} dangerouslySetInnerHTML={{ 
            __html: content.slice(lastIndex, match.index)
              .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
              .replace(/\n/g, '<br/>') 
          }} />
        );
      }
      // Add the link
      parts.push(
        <a 
          key={match.index}
          href={match[2]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 underline inline-flex items-center gap-1"
        >
          {match[1]}
          <ExternalLink className="w-3 h-3" />
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={lastIndex} dangerouslySetInnerHTML={{ 
          __html: content.slice(lastIndex)
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>') 
        }} />
      );
    }

    return parts.length > 0 ? parts : (
      <span dangerouslySetInnerHTML={{ 
        __html: content
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br/>') 
      }} />
    );
  };

  return (
    <>
      {/* Toggle Button - positioned above the support chat */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
        aria-label={getTranslation('title')}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Stethoscope className="w-6 h-6" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-40 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-12rem)] bg-background border border-border rounded-lg shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              <span className="font-medium">{getTranslation('title')}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
              onClick={clearMessages}
              title={t('clear')}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 shrink-0">
            {getTranslation('disclaimer')}
          </div>

          {/* Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {renderMessageContent(message.content)}
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>{getTranslation('thinking')}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
                  {error}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getTranslation('placeholder')}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !inputValue.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
