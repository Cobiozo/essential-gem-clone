import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

export const MedicalChatWidget: React.FC = () => {
  const { user, isAdmin, isPartner, isClient, isSpecjalista } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { language } = useLanguage();

  const hasAccess = user && (isAdmin || isPartner || isClient || isSpecjalista);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!hasAccess) return null;

  const getPlaceholder = () => {
    const placeholders: Record<string, string> = {
      pl: 'Zadaj pytanie naukowe...',
      de: 'Stellen Sie eine wissenschaftliche Frage...',
      en: 'Ask a scientific question...',
      it: 'Fai una domanda scientifica...',
    };
    return placeholders[language] || placeholders.en;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      navigate(`/omega-base?q=${encodeURIComponent(inputValue.trim())}`);
      setInputValue('');
      setIsOpen(false);
    }
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
      {/* Quick input panel */}
      {isOpen && (
        <div
          className="fixed z-50 w-[320px] sm:w-[380px] animate-science-panel-open"
          style={{
            bottom: 'calc(max(4rem, env(safe-area-inset-bottom, 0px) + 3rem) + 5.5rem)',
            right: 'max(1rem, env(safe-area-inset-right, 0px))'
          }}
        >
          <form onSubmit={handleSubmit}
            className="bg-[#121212]/90 backdrop-blur-xl border border-[#C5A059]/20 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] p-3 flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className="flex-1 bg-[#1A1A1A]/70 border-[#C5A059]/20 text-[#F5F5F5] placeholder:text-[#C5A059]/50 focus:border-[#C5A059]/50 focus:ring-[#C5A059]/20 focus-visible:ring-[#C5A059]/20"
            />
            <Button type="submit" size="icon" disabled={!inputValue.trim()}
              className="bg-gradient-to-br from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#F5E050] text-[#0A0A0A] shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
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
          animate-omega-pulse-bounce"
        style={{
          bottom: 'max(4rem, calc(env(safe-area-inset-bottom, 0px) + 3rem))',
          right: 'max(1rem, env(safe-area-inset-right, 0px))'
        }}
        aria-label="PLC Omega Base"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Search className="w-6 h-6" />}
      </button>
    </>
  );
};

export default MedicalChatWidget;
