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
// html2canvas and jsPDF imported dynamically when exporting



type ExportLanguage = 'pl' | 'de' | 'en' | 'it';

const TRANSLATE_URL = 'https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/translate-content';

// Cache structure for unified document content
interface CachedDocumentContent {
  content: DocumentContent;
  lang: ExportLanguage;
  messagesHash: string;
}

// DOC content structure - single source of truth for all export formats
interface DocumentContent {
  title: string;
  date: string;
  summaryHeader: string;
  summaryHtml: string; // HTML used for all formats (DOC, PDF, HTML)
  disclaimer: string;
  lang: ExportLanguage;
}

export const MedicalChatWidget: React.FC = () => {
  const { user, isAdmin, isPartner, isClient, isSpecjalista } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportLanguage, setExportLanguage] = useState<ExportLanguage>('en');
  const [cachedDocContent, setCachedDocContent] = useState<CachedDocumentContent | null>(null);
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

  // Clear messages and invalidate document cache
  const handleClearMessages = () => {
    clearMessages();
    setCachedDocContent(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const SUMMARIZE_URL = 'https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/medical-assistant';

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
      downloadHtml: {
        pl: 'Dokument webowy (HTML)',
        de: 'Webdokument (HTML)',
        en: 'Web Document (HTML)',
        it: 'Documento web (HTML)',
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
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA`,
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
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA`,
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

  // Generate document content structure from translated summary
  const generateDocumentContent = (summary: string, lang: ExportLanguage): DocumentContent => {
    const locales: Record<ExportLanguage, string> = {
      pl: 'pl-PL',
      de: 'de-DE',
      en: 'en-US',
      it: 'it-IT',
    };

    // HTML for all formats (DOC, PDF, HTML) - single source of truth
    const htmlSummary = summary
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/#{1,6}\s(.+)/g, '<strong>$1</strong>')
      .replace(/---/g, '<hr>')
      .split(/\n\n+/)
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    return {
      title: exportTranslations.title[lang],
      date: `${exportTranslations.generatedOn[lang]}: ${new Date().toLocaleDateString(locales[lang])}`,
      summaryHeader: exportTranslations.summary[lang],
      summaryHtml: htmlSummary,
      disclaimer: exportTranslations.disclaimer[lang],
      lang,
    };
  };

  // Generate hash for messages to detect changes
  const getMessagesHash = (msgs: MedicalChatMessage[]): string => {
    return JSON.stringify(msgs.map(m => m.content)).slice(0, 200);
  };

  // UNIFIED: Get or generate document content (single source for all exports)
  const getOrGenerateDocContent = async (lang: ExportLanguage): Promise<DocumentContent | null> => {
    const currentHash = getMessagesHash(messages);
    
    // Check if cache is valid (same messages and language)
    if (cachedDocContent && 
        cachedDocContent.lang === lang && 
        cachedDocContent.messagesHash === currentHash) {
      console.log('Using cached document content');
      return cachedDocContent.content;
    }
    
    console.log('Generating new document content...');
    
    // Step 1: Generate summary of entire dialog (in English - language-agnostic)
    const summary = await generateDialogSummary(messages);
    if (!summary) {
      toast({
        title: getTranslation('exportError'),
        description: getTranslation('summaryError'),
        variant: 'destructive',
      });
      return null;
    }
    
    // Step 2: Translate summary to user's chosen document language (MANDATORY if different)
    const result = await translateContent(summary, lang, 'en');
    
    if (result.error) {
      toast({
        title: getTranslation('exportError'),
        description: getTranslation('translationRequired'),
        variant: 'destructive',
      });
      return null;
    }
    
    const translatedSummary = result.translated ? result.content : summary;
    
    // Step 3: Generate document content structure (single source of truth)
    const docContent = generateDocumentContent(translatedSummary, lang);
    
    // Cache the result
    setCachedDocContent({
      content: docContent,
      lang,
      messagesHash: currentHash,
    });
    
    console.log('Document content cached successfully');
    return docContent;
  };

  // Generate DOC from document content - returns the HTML content
  const generateDocFromContent = (docContent: DocumentContent): string => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${docContent.title}</title>
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
        <h1>${docContent.title}</h1>
        <div class="date">${docContent.date}</div>
        <div class="separator"></div>
        <h2>${docContent.summaryHeader}</h2>
        <div class="summary">${docContent.summaryHtml}</div>
        <div class="disclaimer">${docContent.disclaimer}</div>
      </body>
      </html>
    `;
    return htmlContent;
  };

  // Save DOC file
  const saveDocFile = (htmlContent: string, lang: ExportLanguage) => {
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

  // Generate responsive HTML document (A4 on desktop, responsive on mobile)
  const generateResponsiveHtml = (docContent: DocumentContent): string => {
    return `<!DOCTYPE html>
<html lang="${docContent.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docContent.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    
    .document {
      background: white;
      margin: 0 auto;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 4px;
    }
    
    /* A4 format on desktop */
    @media (min-width: 900px) {
      .document {
        width: 210mm;
        min-height: 297mm;
        padding: 25mm;
      }
    }
    
    /* Responsive on mobile */
    @media (max-width: 899px) {
      body { padding: 10px; }
      .document {
        padding: 20px;
        width: 100%;
        max-width: 100%;
      }
    }
    
    @media print {
      body { background: white; padding: 0; }
      .document {
        box-shadow: none;
        width: 100%;
        padding: 0;
      }
    }
    
    h1 {
      color: #005293;
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      word-wrap: break-word;
    }
    
    .date {
      color: #666;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    
    .separator {
      border-top: 1px solid #e5e5e5;
      margin: 1rem 0;
    }
    
    h2 {
      color: #005293;
      font-size: 1.25rem;
      margin: 1.5rem 0 1rem;
    }
    
    .content {
      text-align: justify;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .content p {
      margin: 0.75rem 0;
    }
    
    .content a {
      color: #0066cc;
      text-decoration: underline;
      word-break: break-all;
    }
    
    .content a:hover {
      color: #004499;
    }
    
    .content strong {
      font-weight: 600;
    }
    
    .disclaimer {
      color: #888;
      font-style: italic;
      font-size: 0.875rem;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e5e5;
    }
  </style>
</head>
<body>
  <article class="document">
    <header>
      <h1>${docContent.title}</h1>
      <div class="date">${docContent.date}</div>
    </header>
    <div class="separator"></div>
    <main>
      <h2>${docContent.summaryHeader}</h2>
      <div class="content">${docContent.summaryHtml}</div>
    </main>
    <footer class="disclaimer">${docContent.disclaimer}</footer>
  </article>
</body>
</html>`;
  };

  // Save HTML file
  const saveHtmlFile = (htmlContent: string, lang: ExportLanguage) => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pure-science-search-${lang}-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Render HTML content to PDF with proper text wrapping and clickable links
  // Generate PDF body HTML optimized for A4
  const generatePdfBody = (docContent: DocumentContent): string => {
    return `
      <div style="
        font-family: 'Segoe UI', Arial, Helvetica, sans-serif; 
        font-size: 11pt;
        line-height: 1.5;
        color: #333;
        padding: 0;
        margin: 0;
        width: 100%;
        box-sizing: border-box;
      ">
        <h1 style="color: #005293; font-size: 16pt; margin: 0 0 5px 0; font-weight: bold;">${docContent.title}</h1>
        <div style="color: #666; font-size: 9pt; margin-bottom: 12px;">${docContent.date}</div>
        <hr style="border: none; border-top: 1px solid #ccc; margin: 10px 0;">
        <h2 style="color: #005293; font-size: 13pt; margin: 12px 0 8px 0; font-weight: bold;">${docContent.summaryHeader}</h2>
        <div style="
          color: #333; 
          text-align: justify;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        ">${docContent.summaryHtml}</div>
        <div style="color: #888; font-style: italic; font-size: 8pt; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc;">${docContent.disclaimer}</div>
      </div>
    `;
  };

  // Generate PDF using html2canvas + jsPDF directly for full control
  const generatePdfFromHtml = async (docContent: DocumentContent) => {
    const bodyContent = generatePdfBody(docContent);
    
    // OVERLAY for UX - HIGHER z-index than container, fully opaque to hide flash
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; left: 0; top: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,1);
      z-index: 1000000;
      display: flex; align-items: center; justify-content: center;
      font-family: sans-serif; font-size: 18px; color: #666;
    `;
    overlay.innerHTML = '<div>Generowanie PDF...</div>';
    document.body.appendChild(overlay);
    
    // CONTAINER - fixed size A4 width (794px at 96dpi) - LOWER z-index than overlay
    const container = document.createElement('div');
    container.innerHTML = bodyContent;
    container.style.cssText = `
      position: fixed;
      left: 0; top: 0;
      width: 794px;
      background: white;
      box-sizing: border-box;
      padding: 40px 60px;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      z-index: 999999;
    `;
    document.body.appendChild(container);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Container size:', container.offsetWidth, container.offsetHeight);
    
    try {
      // Dynamic import of heavy libraries
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      
      // 1. CAPTURE WITH HTML2CANVAS
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: container.offsetWidth,
        height: container.offsetHeight,
      });
      
      console.log('Canvas size:', canvas.width, canvas.height);
      
      // 2. CREATE PDF WITH PROPER PAGINATION (slice canvas per page)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 15;
      const marginY = 15;
      const contentWidth = pageWidth - 2 * marginX;
      const contentHeight = pageHeight - 2 * marginY;

      // Calculate dimensions
      const imgWidth = contentWidth;
      const scale = imgWidth / canvas.width;

      // Height per page in canvas pixels
      const pageHeightPx = contentHeight / scale;

      let yOffset = 0;
      let pageNum = 0;

      while (yOffset < canvas.height) {
        if (pageNum > 0) {
          pdf.addPage();
        }
        
        // Calculate slice height for this page
        const sliceHeight = Math.min(pageHeightPx, canvas.height - yOffset);
        
        // Create temporary canvas for this page slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const pageCtx = pageCanvas.getContext('2d');
        
        if (pageCtx) {
          // Copy slice from original canvas
          pageCtx.drawImage(
            canvas,
            0, yOffset,                   // source x, y
            canvas.width, sliceHeight,    // source width, height
            0, 0,                         // dest x, y
            canvas.width, sliceHeight     // dest width, height
          );
          
          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          const sliceImgHeight = sliceHeight * scale;
          
          // Add image with TOP margin on every page
          pdf.addImage(pageImgData, 'JPEG', marginX, marginY, imgWidth, sliceImgHeight);
        }
        
        yOffset += pageHeightPx;
        pageNum++;
      }
      
      // 3. SAVE
      const filename = `pure-science-search-${docContent.lang}-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
      
      console.log('PDF saved successfully');
      
    } finally {
      document.body.removeChild(container);
      document.body.removeChild(overlay);
    }
  };

  // UNIFIED EXPORT: Uses cached document content for all formats
  const exportToPdf = async (lang: ExportLanguage) => {
    if (messages.length === 0) return;
    
    setIsExporting(true);
    try {
      const docContent = await getOrGenerateDocContent(lang);
      if (!docContent) return;
      
      await generatePdfFromHtml(docContent);
      
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

  const exportToHtml = async (lang: ExportLanguage) => {
    if (messages.length === 0) return;
    
    setIsExporting(true);
    try {
      const docContent = await getOrGenerateDocContent(lang);
      if (!docContent) return;
      
      const htmlContent = generateResponsiveHtml(docContent);
      saveHtmlFile(htmlContent, lang);
      
      toast({
        title: getTranslation('exportSuccess'),
        description: `HTML (${lang.toUpperCase()})`,
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

  const exportToDoc = async (lang: ExportLanguage) => {
    if (messages.length === 0) return;
    
    setIsExporting(true);
    try {
      const docContent = await getOrGenerateDocContent(lang);
      if (!docContent) return;
      
      const docHtml = generateDocFromContent(docContent);
      saveDocFile(docHtml, lang);
      
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
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuLabel className="text-xs flex items-center gap-1">
                    <Globe className="w-3 h-3" /> HTML (główny)
                  </DropdownMenuLabel>
                  {exportLanguageOptions.map((option) => (
                    <DropdownMenuItem
                      key={`html-${option.value}`}
                      onClick={() => exportToHtml(option.value)}
                      className="flex items-center gap-2 pl-4"
                    >
                      <span>{option.flag}</span>
                      <span>{option.label}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
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
                onClick={handleClearMessages}
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

export default MedicalChatWidget;
