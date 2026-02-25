import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, X, Trash2, Download, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useMedicalChatStream } from '@/hooks/useMedicalChatStream';

export const MedicalChatWidget: React.FC = () => {
  const { user, isAdmin, isPartner, isClient, isSpecjalista } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const {
    resultsCount,
    setResultsCount,
    chatHistory,
  } = useMedicalChatStream();

  const [isSpinning, setIsSpinning] = useState(false);
  const hasAccess = user && (isAdmin || isPartner || isClient || isSpecjalista);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Timer-driven spin: 2s rotation, then 10s pause (12s cycle)
  useEffect(() => {
    setIsSpinning(true);
    const spinTimeout = setTimeout(() => setIsSpinning(false), 2000);

    const interval = setInterval(() => {
      setIsSpinning(true);
      setTimeout(() => setIsSpinning(false), 2000);
    }, 12000);

    return () => {
      clearTimeout(spinTimeout);
      clearInterval(interval);
    };
  }, []);

  if (!hasAccess) return null;
  if (location.pathname === '/omega-base') return null;

  const getTranslation = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      placeholder: {
        pl: 'Zadaj pytanie naukowe...',
        de: 'Stellen Sie eine wissenschaftliche Frage...',
        en: 'Ask a scientific question...',
        it: 'Fai una domanda scientifica...',
      },
      disclaimer: {
        pl: '⚠️ Ten asystent służy wyłącznie celom informacyjnym i nie zastępuje porady lekarskiej.',
        de: '⚠️ Dieser Assistent dient nur zu Informationszwecken und ersetzt keine ärztliche Beratung.',
        en: '⚠️ This assistant is for informational purposes only and does not replace medical advice.',
        it: '⚠️ Questo assistente è solo a scopo informativo e non sostituisce il parere medico.',
      },
      results: { pl: 'Wyniki:', de: 'Ergebnisse:', en: 'Results:', it: 'Risultati:' },
      history: { pl: 'Historia', de: 'Verlauf', en: 'History', it: 'Cronologia' },
      noHistory: { pl: 'Brak historii', de: 'Kein Verlauf', en: 'No history', it: 'Nessuna cronologia' },
    };
    return translations[key]?.[language] || translations[key]?.en || key;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      navigate(`/omega-base?q=${encodeURIComponent(inputValue.trim())}&results=${resultsCount}`);
      setInputValue('');
      setIsOpen(false);
    }
  };

  const handleHistorySelect = (query: string) => {
    navigate(`/omega-base?q=${encodeURIComponent(query)}&results=${resultsCount}`);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Full panel */}
      {isOpen && (
        <div
          className="fixed z-50 w-[340px] sm:w-[400px] animate-science-panel-open"
          style={{
            bottom: 'calc(max(4rem, env(safe-area-inset-bottom, 0px) + 3rem) + 5.5rem)',
            right: 'max(1rem, env(safe-area-inset-right, 0px))'
          }}
        >
          <div className="bg-[#121212]/95 backdrop-blur-xl border border-[#C5A059]/20 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#C5A059]/15">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C5A059] to-[#D4AF37] flex items-center justify-center">
                  <Search className="w-3.5 h-3.5 text-[#0A0A0A]" />
                </div>
                <span className="text-[#F5E050] font-semibold text-sm tracking-wide">PLC OMEGA BASE</span>
              </div>
              <div className="flex items-center gap-1">
                {/* History */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-1.5 rounded-lg hover:bg-[#C5A059]/10 text-[#C5A059]/60 hover:text-[#C5A059] transition-colors">
                      <History className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 bg-[#1A1A1A] border-[#C5A059]/20 p-2" align="end">
                    <p className="text-[#C5A059] text-xs font-medium px-2 py-1">{getTranslation('history')}</p>
                    <ScrollArea className="max-h-48">
                      {chatHistory.length === 0 ? (
                        <p className="text-[#C5A059]/40 text-xs px-2 py-2">{getTranslation('noHistory')}</p>
                      ) : (
                        chatHistory.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => handleHistorySelect(item.query)}
                            className="w-full text-left px-2 py-1.5 text-xs text-[#F5F5F5]/80 hover:bg-[#C5A059]/10 rounded transition-colors truncate"
                          >
                            {item.query}
                          </button>
                        ))
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                {/* Download */}
                <button
                  onClick={() => navigate('/omega-base')}
                  className="p-1.5 rounded-lg hover:bg-[#C5A059]/10 text-[#C5A059]/60 hover:text-[#C5A059] transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                {/* Close */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[#C5A059]/10 text-[#C5A059]/60 hover:text-[#C5A059] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Results count row */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#C5A059]/10">
              <span className="text-[#C5A059]/70 text-xs">{getTranslation('results')}</span>
              <Select value={String(resultsCount)} onValueChange={(v) => setResultsCount(Number(v))}>
                <SelectTrigger className="w-20 h-7 text-xs bg-[#1A1A1A]/70 border-[#C5A059]/20 text-[#F5F5F5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#C5A059]/20">
                  {[5, 10, 15, 20, 25, 30].map(n => (
                    <SelectItem key={n} value={String(n)} className="text-[#F5F5F5] text-xs">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Disclaimer */}
            <div className="px-3 py-2 border-b border-[#C5A059]/10">
              <p className="text-[10px] text-[#C5A059]/60 leading-tight">
                {getTranslation('disclaimer')}
              </p>
            </div>

            {/* Empty chat area */}
            <div className="flex-1 min-h-[120px] max-h-[200px]" />

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-[#C5A059]/15 flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getTranslation('placeholder')}
                className="flex-1 bg-[#1A1A1A]/70 border-[#C5A059]/20 text-[#F5F5F5] placeholder:text-[#C5A059]/50 focus:border-[#C5A059]/50 focus:ring-[#C5A059]/20 focus-visible:ring-[#C5A059]/20 text-sm"
              />
              <Button type="submit" size="icon" disabled={!inputValue.trim()}
                className="bg-gradient-to-br from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#F5E050] text-[#0A0A0A] shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Floating button with omega-pulse-bounce animation */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed z-50 w-14 h-14 rounded-full 
          bg-gradient-to-br from-[#D4AF37]/90 via-[#C5A059]/85 to-[#B8860B]/80
          hover:from-[#F5E050]/95 hover:via-[#D4AF37]/90 hover:to-[#C5A059]/85
          text-[#0A0A0A] 
          border border-[#F5E050]/30
          backdrop-blur-sm
          flex items-center justify-center transition-all duration-300 
          hover:scale-110
          ${isSpinning ? 'animate-omega-coin-flip' : ''}"
        style={{
          bottom: 'max(4rem, calc(env(safe-area-inset-bottom, 0px) + 3rem))',
          right: 'max(1rem, env(safe-area-inset-right, 0px))',
          perspective: '600px',
          transformStyle: 'preserve-3d',
        }}
        aria-label="PLC Omega Base"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Search className="w-6 h-6" />}
      </button>
    </>
  );
};

export default MedicalChatWidget;
