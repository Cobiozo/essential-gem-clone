import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, X, Trash2, ExternalLink, Download, History, ChevronDown, Globe, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMedicalChatStream, MedicalChatMessage } from '@/hooks/useMedicalChatStream';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

type ExportLanguage = 'pl' | 'de' | 'en' | 'it';

const TRANSLATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-content`;

export const MedicalChatWidget: React.FC = () => {
  const { user, isAdmin, isPartner, isClient, isSpecjalista } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportLanguage, setExportLanguage] = useState<ExportLanguage>('en');
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

  const SUMMARIZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/medical-assistant`;

  const exportTranslations: Record<string, Record<ExportLanguage, string>> = {
    title: {
      pl: 'PURE SCIENCE SEARCH AI - Podsumowanie',
      de: 'PURE SCIENCE SEARCH AI - Zusammenfassung',
      en: 'PURE SCIENCE SEARCH AI - Summary',
      it: 'PURE SCIENCE SEARCH AI - Riepilogo',
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
    summary: {
      pl: 'Podsumowanie dialogu',
      de: 'Dialogzusammenfassung',
      en: 'Dialog Summary',
      it: 'Riepilogo del dialogo',
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
        it: 'PURE SCIENCE SEARCH AI',
      },
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
      thinking: {
        pl: 'Analizuję literaturę naukową...',
        de: 'Analysiere wissenschaftliche Literatur...',
        en: 'Analyzing scientific literature...',
        it: 'Analizzando la letteratura scientifica...',
      },
      results: {
        pl: 'Wyniki',
        de: 'Ergebnisse',
        en: 'Results',
        it: 'Risultati',
      },
      max: {
        pl: 'Maks.',
        de: 'Max.',
        en: 'Max.',
        it: 'Max.',
      },
      download: {
        pl: 'Pobierz',
        de: 'Herunterladen',
        en: 'Download',
        it: 'Scarica',
      },
      downloadPdf: {
        pl: 'Pobierz PDF',
        de: 'PDF herunterladen',
        en: 'Download PDF',
        it: 'Scarica PDF',
      },
      downloadDoc: {
        pl: 'Pobierz DOC',
        de: 'DOC herunterladen',
        en: 'Download DOC',
        it: 'Scarica DOC',
      },
      history: {
        pl: 'Historia',
        de: 'Verlauf',
        en: 'History',
        it: 'Cronologia',
      },
      noHistory: {
        pl: 'Brak historii',
        de: 'Kein Verlauf',
        en: 'No history',
        it: 'Nessuna cronologia',
      },
      exportSuccess: {
        pl: 'Eksport zakończony',
        de: 'Export abgeschlossen',
        en: 'Export completed',
        it: 'Esportazione completata',
      },
      exportError: {
        pl: 'Błąd eksportu',
        de: 'Exportfehler',
        en: 'Export error',
        it: 'Errore di esportazione',
      },
      generatingSummary: {
        pl: 'Generowanie podsumowania...',
        de: 'Zusammenfassung wird erstellt...',
        en: 'Generating summary...',
        it: 'Generazione riepilogo...',
      },
      translating: {
        pl: 'Tłumaczenie...',
        de: 'Übersetzen...',
        en: 'Translating...',
        it: 'Traduzione...',
      },
      translationRequired: {
        pl: 'Tłumaczenie nie powiodło się. Dokument nie może zostać wygenerowany.',
        de: 'Übersetzung fehlgeschlagen. Das Dokument kann nicht erstellt werden.',
        en: 'Translation failed. Document cannot be generated.',
        it: 'Traduzione fallita. Il documento non può essere generato.',
      },
      summaryError: {
        pl: 'Nie udało się wygenerować podsumowania dialogu.',
        de: 'Die Dialogzusammenfassung konnte nicht erstellt werden.',
        en: 'Failed to generate dialog summary.',
        it: 'Impossibile generare il riepilogo del dialogo.',
      },
    };
    return translations[key]?.[language] || translations[key]?.en || key;
  };

  // Generate a summary of the entire dialog (language-agnostic internal format)
  const generateDialogSummary = async (msgs: MedicalChatMessage[]): Promise<string | null> => {
    if (msgs.length === 0) return null;

    // Build dialog context for summarization
    const dialogText = msgs.map(m => 
      `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`
    ).join('\n\n');

    const summaryPrompt = `Summarize the following scientific/medical dialog. 
Include:
- Main questions asked by the user
- Key scientific findings and research cited
- Important conclusions and recommendations
- Any PubMed references mentioned (preserve DOIs and PMIDs)

Keep the summary comprehensive but concise. Preserve all scientific accuracy and citations.

DIALOG:
${dialogText}

Provide a structured summary:`;

    try {
      const response = await fetch(SUMMARIZE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          query: summaryPrompt,
          language: 'en', // Generate summary in English first (language-agnostic)
          resultsCount: 0, // No PubMed search needed for summary
          isSummaryRequest: true, // Flag for edge function to handle differently
        }),
      });

      if (!response.ok) {
        console.error('Summary generation failed:', response.status);
        return null;
      }

      // Read streaming response
      const reader = response.body?.getReader();
      if (!reader) return null;

      let summary = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) summary += content;
            } catch (e) {
              // Skip parse errors
            }
          }
        }
      }

      return summary || null;
    } catch (err) {
      console.error('Summary generation error:', err);
      return null;
    }
  };

  // Translate content to target language - MANDATORY when languages differ
  const translateContent = async (
    content: string, 
    targetLang: ExportLanguage,
    sourceLang: string = 'en'
  ): Promise<{ content: string; translated: boolean; error?: string }> => {
    // If languages match, no translation needed
    if (sourceLang === targetLang) {
      return { content, translated: false };
    }

    try {
      const response = await fetch(TRANSLATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          content,
          targetLanguage: targetLang,
          sourceLanguage: sourceLang,
        }),
      });

      if (!response.ok) {
        return { content: '', translated: false, error: 'translationRequired' };
      }

      const data = await response.json();
      
      if (!data.translatedContent) {
        return { content: '', translated: false, error: 'translationRequired' };
      }

      return { content: data.translatedContent, translated: true };
    } catch (err) {
      console.error('Translation error:', err);
      return { content: '', translated: false, error: 'translationRequired' };
    }
  };

  const generatePdf = (msgs: MedicalChatMessage[], lang: ExportLanguage) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = 20;
    const marginRight = 20;
    const marginTop = 25;
    const marginBottom = 25;
    const maxWidth = pageWidth - marginLeft - marginRight;
    let yPos = marginTop;

    const locales: Record<ExportLanguage, string> = {
      pl: 'pl-PL',
      de: 'de-DE',
      en: 'en-US',
      it: 'it-IT',
    };

    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 82, 147);
    pdf.text(exportTranslations.title[lang], marginLeft, yPos);
    yPos += 7;

    // Date
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${exportTranslations.generatedOn[lang]}: ${new Date().toLocaleDateString(locales[lang])}`, marginLeft, yPos);
    yPos += 10;

    // Separator line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(marginLeft, yPos, pageWidth - marginRight, yPos);
    yPos += 8;

    // Messages
    msgs.forEach((message) => {
      const prefix = message.role === 'user' 
        ? `${exportTranslations.question[lang]}: ` 
        : `${exportTranslations.answer[lang]}: `;
      
      // Clean content - remove markdown formatting but keep structure
      let cleanContent = message.content
        .replace(/\*\*/g, '')
        .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '$1 ($2)')
        .replace(/#{1,6}\s/g, '')
        .replace(/---/g, '—');
      
      // Split by paragraphs for better formatting
      const paragraphs = cleanContent.split(/\n\n+/);
      
      pdf.setFontSize(10);
      
      // Add prefix for first paragraph
      if (message.role === 'user') {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 82, 147);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 40);
      }

      paragraphs.forEach((para, index) => {
        const textToWrite = index === 0 ? prefix + para.trim() : para.trim();
        if (!textToWrite) return;
        
        const lines = pdf.splitTextToSize(textToWrite, maxWidth);
        const lineHeight = 4.5;
        const blockHeight = lines.length * lineHeight;
        
        // Check if we need a new page
        if (yPos + blockHeight > pageHeight - marginBottom) {
          pdf.addPage();
          yPos = marginTop;
        }
        
        pdf.text(lines, marginLeft, yPos);
        yPos += blockHeight + 3;
      });
      
      yPos += 6; // Space between messages
    });

    // Disclaimer at bottom
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(120, 120, 120);
    const disclaimer = exportTranslations.disclaimer[lang];
    const disclaimerLines = pdf.splitTextToSize(disclaimer, maxWidth);
    
    if (yPos + disclaimerLines.length * 4 + 10 > pageHeight - marginBottom) {
      pdf.addPage();
      yPos = marginTop;
    }
    
    // Add separator before disclaimer
    yPos += 5;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(marginLeft, yPos, pageWidth - marginRight, yPos);
    yPos += 6;
    
    pdf.text(disclaimerLines, marginLeft, yPos);

    pdf.save(`pure-science-search-${lang}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const generatePdfFromSummary = (summary: string, lang: ExportLanguage) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = 20;
    const marginRight = 20;
    const marginTop = 25;
    const marginBottom = 25;
    const maxWidth = pageWidth - marginLeft - marginRight;
    let yPos = marginTop;

    const locales: Record<ExportLanguage, string> = {
      pl: 'pl-PL',
      de: 'de-DE',
      en: 'en-US',
      it: 'it-IT',
    };

    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 82, 147);
    pdf.text(exportTranslations.title[lang], marginLeft, yPos);
    yPos += 7;

    // Date
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${exportTranslations.generatedOn[lang]}: ${new Date().toLocaleDateString(locales[lang])}`, marginLeft, yPos);
    yPos += 10;

    // Separator line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(marginLeft, yPos, pageWidth - marginRight, yPos);
    yPos += 8;

    // Summary header
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 82, 147);
    pdf.text(exportTranslations.summary[lang], marginLeft, yPos);
    yPos += 8;

    // Summary content
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40, 40, 40);

    // Clean content - remove markdown formatting but keep structure
    let cleanContent = summary
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '$1 ($2)')
      .replace(/#{1,6}\s/g, '')
      .replace(/---/g, '—');

    // Split by paragraphs for better formatting
    const paragraphs = cleanContent.split(/\n\n+/);

    paragraphs.forEach((para) => {
      const textToWrite = para.trim();
      if (!textToWrite) return;
      
      const lines = pdf.splitTextToSize(textToWrite, maxWidth);
      const lineHeight = 4.5;
      const blockHeight = lines.length * lineHeight;
      
      // Check if we need a new page
      if (yPos + blockHeight > pageHeight - marginBottom) {
        pdf.addPage();
        yPos = marginTop;
      }
      
      pdf.text(lines, marginLeft, yPos);
      yPos += blockHeight + 3;
    });

    // Disclaimer at bottom
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(120, 120, 120);
    const disclaimer = exportTranslations.disclaimer[lang];
    const disclaimerLines = pdf.splitTextToSize(disclaimer, maxWidth);
    
    if (yPos + disclaimerLines.length * 4 + 10 > pageHeight - marginBottom) {
      pdf.addPage();
      yPos = marginTop;
    }
    
    // Add separator before disclaimer
    yPos += 5;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(marginLeft, yPos, pageWidth - marginRight, yPos);
    yPos += 6;
    
    pdf.text(disclaimerLines, marginLeft, yPos);

    pdf.save(`pure-science-search-${lang}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportToPdf = async (lang: ExportLanguage) => {
    if (messages.length === 0) return;
    
    setIsExporting(true);
    try {
      // Step 1: Generate summary of entire dialog (in English - language-agnostic)
      const summary = await generateDialogSummary(messages);
      
      if (!summary) {
        toast({
          title: getTranslation('exportError'),
          description: getTranslation('summaryError'),
          variant: 'destructive',
        });
        return;
      }

      // Step 2: Translate summary to user's chosen document language (MANDATORY)
      const result = await translateContent(summary, lang, 'en');
      
      // If translation was required but failed, show error and don't generate document
      if (result.error) {
        toast({
          title: getTranslation('exportError'),
          description: getTranslation('translationRequired'),
          variant: 'destructive',
        });
        return;
      }

      // Step 3: Generate PDF from translated summary ONLY
      generatePdfFromSummary(result.translated ? result.content : summary, lang);
      
      toast({
        title: getTranslation('exportSuccess'),
        description: `PDF (${lang.toUpperCase()})`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: getTranslation('exportError'),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const generateDoc = (msgs: MedicalChatMessage[], lang: ExportLanguage) => {
    const locales: Record<ExportLanguage, string> = {
      pl: 'pl-PL',
      de: 'de-DE',
      en: 'en-US',
      it: 'it-IT',
    };

    // Build HTML content for .doc file with proper A4 formatting
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${exportTranslations.title[lang]}</title>
        <style>
          @page { size: A4; margin: 2.5cm; }
          body { 
            font-family: Arial, sans-serif; 
            margin: 2.5cm; 
            line-height: 1.6; 
            font-size: 11pt;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          h1 { color: #005293; font-size: 16pt; margin-bottom: 5px; }
          .date { color: #666; font-size: 9pt; margin-bottom: 15px; }
          .separator { border-top: 1px solid #ccc; margin: 12px 0; }
          .question { color: #005293; font-weight: bold; margin-top: 12px; margin-bottom: 8px; }
          .answer { color: #333; margin-top: 8px; margin-bottom: 12px; text-align: justify; }
          .answer p { margin: 8px 0; }
          .disclaimer { color: #888; font-style: italic; font-size: 9pt; margin-top: 25px; padding-top: 12px; border-top: 1px solid #ccc; }
          a { color: #0066cc; word-break: break-all; }
        </style>
      </head>
      <body>
        <h1>${exportTranslations.title[lang]}</h1>
        <div class="date">${exportTranslations.generatedOn[lang]}: ${new Date().toLocaleDateString(locales[lang])}</div>
        <div class="separator"></div>
    `;

    msgs.forEach((message) => {
      const prefix = message.role === 'user' 
        ? exportTranslations.question[lang]
        : exportTranslations.answer[lang];
      
      // Convert markdown to HTML with proper paragraph handling
      let htmlMessage = message.content
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/#{1,6}\s(.+)/g, '<strong>$1</strong>')
        .replace(/---/g, '<hr>')
        .split(/\n\n+/)
        .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
      
      if (message.role === 'user') {
        htmlContent += `<div class="question">${prefix}: ${htmlMessage}</div>`;
      } else {
        htmlContent += `<div class="answer">${prefix}: ${htmlMessage}</div>`;
      }
    });

    htmlContent += `
        <div class="disclaimer">${exportTranslations.disclaimer[lang]}</div>
      </body>
      </html>
    `;

    // Create and download .doc file
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pure-science-search-${lang}-${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateDocFromSummary = (summary: string, lang: ExportLanguage) => {
    const locales: Record<ExportLanguage, string> = {
      pl: 'pl-PL',
      de: 'de-DE',
      en: 'en-US',
      it: 'it-IT',
    };

    // Convert markdown to HTML with proper paragraph handling
    let htmlSummary = summary
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/#{1,6}\s(.+)/g, '<strong>$1</strong>')
      .replace(/---/g, '<hr>')
      .split(/\n\n+/)
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    // Build HTML content for .doc file with proper A4 formatting
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${exportTranslations.title[lang]}</title>
        <style>
          @page { size: A4; margin: 2.5cm; }
          body { 
            font-family: Arial, sans-serif; 
            margin: 2.5cm; 
            line-height: 1.6; 
            font-size: 11pt;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          h1 { color: #005293; font-size: 16pt; margin-bottom: 5px; }
          h2 { color: #005293; font-size: 14pt; margin-top: 15px; margin-bottom: 10px; }
          .date { color: #666; font-size: 9pt; margin-bottom: 15px; }
          .separator { border-top: 1px solid #ccc; margin: 12px 0; }
          .summary { color: #333; margin-top: 8px; margin-bottom: 12px; text-align: justify; }
          .summary p { margin: 8px 0; }
          .disclaimer { color: #888; font-style: italic; font-size: 9pt; margin-top: 25px; padding-top: 12px; border-top: 1px solid #ccc; }
          a { color: #0066cc; word-break: break-all; }
        </style>
      </head>
      <body>
        <h1>${exportTranslations.title[lang]}</h1>
        <div class="date">${exportTranslations.generatedOn[lang]}: ${new Date().toLocaleDateString(locales[lang])}</div>
        <div class="separator"></div>
        <h2>${exportTranslations.summary[lang]}</h2>
        <div class="summary">${htmlSummary}</div>
        <div class="disclaimer">${exportTranslations.disclaimer[lang]}</div>
      </body>
      </html>
    `;

    // Create and download .doc file
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pure-science-search-${lang}-${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToDoc = async (lang: ExportLanguage) => {
    if (messages.length === 0) return;
    
    setIsExporting(true);
    try {
      // Step 1: Generate summary of entire dialog (in English - language-agnostic)
      const summary = await generateDialogSummary(messages);
      
      if (!summary) {
        toast({
          title: getTranslation('exportError'),
          description: getTranslation('summaryError'),
          variant: 'destructive',
        });
        return;
      }

      // Step 2: Translate summary to user's chosen document language (MANDATORY)
      const result = await translateContent(summary, lang, 'en');
      
      // If translation was required but failed, show error and don't generate document
      if (result.error) {
        toast({
          title: getTranslation('exportError'),
          description: getTranslation('translationRequired'),
          variant: 'destructive',
        });
        return;
      }

      // Step 3: Generate DOC from translated summary ONLY
      generateDocFromSummary(result.translated ? result.content : summary, lang);
      
      toast({
        title: getTranslation('exportSuccess'),
        description: `DOC (${lang.toUpperCase()})`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: getTranslation('exportError'),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
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

  const exportLanguageOptions: { value: ExportLanguage; label: string; flag: string }[] = [
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

              {/* Download with format and language selection */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                    disabled={messages.length === 0 || isExporting}
                    title={isExporting ? getTranslation('translating') : getTranslation('download')}
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  <DropdownMenuLabel className="text-xs flex items-center gap-1">
                    <FileText className="w-3 h-3" /> PDF
                  </DropdownMenuLabel>
                  {exportLanguageOptions.map((option) => (
                    <DropdownMenuItem
                      key={`pdf-${option.value}`}
                      onClick={() => exportToPdf(option.value)}
                      className="flex items-center gap-2 pl-4"
                    >
                      <span>{option.flag}</span>
                      <span>{option.label}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs flex items-center gap-1">
                    <FileText className="w-3 h-3" /> DOC
                  </DropdownMenuLabel>
                  {exportLanguageOptions.map((option) => (
                    <DropdownMenuItem
                      key={`doc-${option.value}`}
                      onClick={() => exportToDoc(option.value)}
                      className="flex items-center gap-2 pl-4"
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
