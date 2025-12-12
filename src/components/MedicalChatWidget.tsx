import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, X, Trash2, ExternalLink, Download, History, ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMedicalChatStream } from '@/hooks/useMedicalChatStream';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import jsPDF from 'jspdf';

type PdfLanguage = 'pl' | 'de' | 'en' | 'it';

export const MedicalChatWidget: React.FC = () => {
  const { user, isAdmin, isPartner, isClient, isSpecjalista } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [pdfLanguage, setPdfLanguage] = useState<PdfLanguage>('en');
  const { 
    messages, 
    isLoading, 
    error, 
    sendMessage, 
    clearMessages,
    resultsCount,
    setResultsCount,
    chatHistory,
    loadFromHistory,
  } = useMedicalChatStream();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t, language } = useLanguage();

  // Only show widget for partner, client, specjalista or admin roles
  const hasAccess = user && (isAdmin || isPartner || isClient || isSpecjalista);

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

  // Early return AFTER all hooks
  if (!hasAccess) {
    return null;
  }

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

  const pdfTranslations: Record<string, Record<PdfLanguage, string>> = {
    title: {
      pl: 'PURE SCIENCE SEARCH AI - Wyniki',
      de: 'PURE SCIENCE SEARCH AI - Ergebnisse',
      en: 'PURE SCIENCE SEARCH AI - Results',
      it: 'PURE SCIENCE SEARCH AI - Risultati',
    },
    question: {
      pl: 'Pytanie',
      de: 'Frage',
      en: 'Question',
      it: 'Domanda',
    },
    answer: {
      pl: 'Odpowiedź',
      de: 'Antwort',
      en: 'Answer',
      it: 'Risposta',
    },
    disclaimer: {
      pl: 'Te informacje służą wyłącznie celom edukacyjnym i nie zastępują porady lekarskiej.',
      de: 'Diese Informationen dienen nur zu Bildungszwecken und ersetzen keine ärztliche Beratung.',
      en: 'This information is for educational purposes only and does not replace medical advice.',
      it: 'Queste informazioni sono solo a scopo educativo e non sostituiscono il parere medico.',
    },
    generatedOn: {
      pl: 'Wygenerowano',
      de: 'Erstellt am',
      en: 'Generated on',
      it: 'Generato il',
    },
  };

  const getTranslation = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      title: {
        pl: 'PURE SCIENCE SEARCH AI',
        de: 'PURE SCIENCE SEARCH AI',
        en: 'PURE SCIENCE SEARCH AI',
      },
      placeholder: {
        pl: 'Zadaj pytanie naukowe...',
        de: 'Stellen Sie eine wissenschaftliche Frage...',
        en: 'Ask a scientific question...',
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
      results: {
        pl: 'Wyniki',
        de: 'Ergebnisse',
        en: 'Results',
      },
      max: {
        pl: 'Maks.',
        de: 'Max.',
        en: 'Max.',
      },
      downloadPdf: {
        pl: 'Pobierz PDF',
        de: 'PDF herunterladen',
        en: 'Download PDF',
      },
      history: {
        pl: 'Historia',
        de: 'Verlauf',
        en: 'History',
      },
      noHistory: {
        pl: 'Brak historii',
        de: 'Kein Verlauf',
        en: 'No history',
      },
    };
    return translations[key]?.[language] || translations[key]?.en || key;
  };

  const exportToPdf = (lang: PdfLanguage) => {
    if (messages.length === 0) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - 2 * margin;
    let yPos = 20;

    const locales: Record<PdfLanguage, string> = {
      pl: 'pl-PL',
      de: 'de-DE',
      en: 'en-US',
      it: 'it-IT',
    };

    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 82, 147); // Blue color
    pdf.text(pdfTranslations.title[lang], margin, yPos);
    yPos += 8;

    // Date
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${pdfTranslations.generatedOn[lang]}: ${new Date().toLocaleDateString(locales[lang])}`, margin, yPos);
    yPos += 12;

    // Separator line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // Messages
    pdf.setTextColor(0, 0, 0);
    messages.forEach((message) => {
      const prefix = message.role === 'user' 
        ? `${pdfTranslations.question[lang]}: ` 
        : `${pdfTranslations.answer[lang]}: `;
      
      // Clean content - remove markdown formatting
      let cleanContent = message.content
        .replace(/\*\*/g, '')
        .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '$1 ($2)')
        .replace(/#{1,6}\s/g, '')
        .replace(/---/g, '');
      
      const text = prefix + cleanContent;
      
      pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(text, maxWidth);
      
      // Check if we need a new page
      if (yPos + lines.length * 5 > pdf.internal.pageSize.getHeight() - 30) {
        pdf.addPage();
        yPos = 20;
      }
      
      if (message.role === 'user') {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 82, 147);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(50, 50, 50);
      }
      
      pdf.text(lines, margin, yPos);
      yPos += lines.length * 5 + 10;
    });

    // Disclaimer at bottom
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(120, 120, 120);
    const disclaimer = pdfTranslations.disclaimer[lang];
    const disclaimerLines = pdf.splitTextToSize(disclaimer, maxWidth);
    
    if (yPos + disclaimerLines.length * 4 > pdf.internal.pageSize.getHeight() - 15) {
      pdf.addPage();
      yPos = 20;
    }
    
    // Add separator before disclaimer
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    pdf.text(disclaimerLines, margin, yPos);

    pdf.save(`pure-science-search-${lang}-${new Date().toISOString().slice(0, 10)}.pdf`);
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

  const resultsOptions = [
    { value: 1, label: '1' },
    { value: 5, label: '5' },
    { value: 10, label: '10' },
    { value: 20, label: '20' },
    { value: 30, label: '30' },
    { value: 40, label: '40' },
    { value: 50, label: '50' },
    { value: 0, label: getTranslation('max') },
  ];

  const pdfLanguageOptions: { value: PdfLanguage; label: string; flag: string }[] = [
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'pl', label: 'Polski', flag: '🇵🇱' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  ];

  return (
    <>
      {/* Toggle Button - positioned above the support chat */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
        aria-label={getTranslation('title')}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Search className="w-6 h-6" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-40 right-4 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-12rem)] bg-background border border-border rounded-lg shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              <span className="font-semibold text-sm">{getTranslation('title')}</span>
            </div>
            <div className="flex items-center gap-1">
              {/* History */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                    title={getTranslation('history')}
                  >
                    <History className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end">
                  <div className="p-2 border-b font-medium text-sm">{getTranslation('history')}</div>
                  <ScrollArea className="max-h-60">
                    {chatHistory.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        {getTranslation('noHistory')}
                      </div>
                    ) : (
                      chatHistory.map((entry) => (
                        <button
                          key={entry.id}
                          className="w-full text-left p-2 hover:bg-muted text-sm border-b last:border-0"
                          onClick={() => loadFromHistory(entry)}
                        >
                          <div className="font-medium truncate">{entry.query}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString(language)}
                          </div>
                        </button>
                      ))
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Download PDF with language selection */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                    disabled={messages.length === 0}
                    title={getTranslation('downloadPdf')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[140px]">
                  {pdfLanguageOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => exportToPdf(option.value)}
                      className="flex items-center gap-2"
                    >
                      <span>{option.flag}</span>
                      <span>{option.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear */}
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
          </div>

          {/* Settings bar */}
          <div className="bg-muted/50 px-3 py-2 flex items-center justify-between text-xs border-b shrink-0">
            <span className="text-muted-foreground">{getTranslation('results')}:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  {resultsCount === 0 ? getTranslation('max') : resultsCount}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {resultsOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setResultsCount(option.value)}
                    className={resultsCount === option.value ? 'bg-accent' : ''}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
