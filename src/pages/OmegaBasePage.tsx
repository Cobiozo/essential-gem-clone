import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, X, Trash2, ExternalLink, Download, History, ChevronDown, Globe, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMedicalChatStream, MedicalChatMessage } from '@/hooks/useMedicalChatStream';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

type ExportLanguage = 'pl' | 'de' | 'en' | 'it';

const TRANSLATE_URL = 'https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/translate-content';
const SUMMARIZE_URL = 'https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/medical-assistant';

interface CachedDocumentContent {
  content: DocumentContent;
  lang: ExportLanguage;
  messagesHash: string;
}

interface DocumentContent {
  title: string;
  date: string;
  summaryHeader: string;
  summaryHtml: string;
  disclaimer: string;
  lang: ExportLanguage;
}

const OmegaBasePage: React.FC = () => {
  const { user, isAdmin, isPartner, isClient, isSpecjalista } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportLanguage, setExportLanguage] = useState<ExportLanguage>('en');
  const [cachedDocContent, setCachedDocContent] = useState<CachedDocumentContent | null>(null);
  const [initialQuerySent, setInitialQuerySent] = useState(false);
  const { 
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
  } = useMedicalChatStream();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastAssistantRef = useRef<HTMLDivElement>(null);
  const prevMessagesLenRef = useRef(0);
  const { t, language } = useLanguage();

  const hasAccess = user && (isAdmin || isPartner || isClient || isSpecjalista);

  const SESSION_KEY = 'omega-base-session';

  // Read results param and send initial query from URL params (with sessionStorage cache)
  useEffect(() => {
    const resultsParam = searchParams.get('results');
    if (resultsParam) {
      const num = Number(resultsParam);
      if (!isNaN(num) && num > 0) setResultsCount(num);
    }
    const q = searchParams.get('q');
    if (q && !initialQuerySent && !isLoading) {
      setInitialQuerySent(true);
      // Check sessionStorage cache
      try {
        const cached = sessionStorage.getItem(SESSION_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.query === q && parsed.messages?.length > 0) {
            setMessagesDirectly(parsed.messages);
            if (parsed.resultsCount) setResultsCount(parsed.resultsCount);
            return;
          }
        }
      } catch {}
      sendMessage(q);
    }
  }, [searchParams, initialQuerySent, isLoading, sendMessage, setResultsCount, setMessagesDirectly]);

  // Save messages to sessionStorage when they change
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && messages.length > 0 && messages.some(m => m.content)) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          query: q,
          messages,
          resultsCount,
        }));
      } catch {}
    }
  }, [messages, resultsCount, searchParams]);

  // Smart scroll
  useEffect(() => {
    if (messages.length > prevMessagesLenRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'assistant' && lastAssistantRef.current) {
        lastAssistantRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (lastMsg?.role === 'user') {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
      prevMessagesLenRef.current = messages.length;
    }
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  if (!hasAccess) {
    navigate('/dashboard');
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleClearMessages = () => {
    clearMessages();
    setCachedDocContent(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const exportTranslations: Record<string, Record<ExportLanguage, string>> = {
    title: {
      pl: 'PLC OMEGA BASE - Podsumowanie',
      de: 'PLC OMEGA BASE - Zusammenfassung',
      en: 'PLC OMEGA BASE - Summary',
      it: 'PLC OMEGA BASE - Riepilogo',
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
      title: { pl: 'PLC OMEGA BASE', de: 'PLC OMEGA BASE', en: 'PLC OMEGA BASE', it: 'PLC OMEGA BASE' },
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
      results: { pl: 'Wyniki', de: 'Ergebnisse', en: 'Results', it: 'Risultati' },
      max: { pl: 'Maks.', de: 'Max.', en: 'Max.', it: 'Max.' },
      download: { pl: 'Pobierz', de: 'Herunterladen', en: 'Download', it: 'Scarica' },
      history: { pl: 'Historia', de: 'Verlauf', en: 'History', it: 'Cronologia' },
      noHistory: { pl: 'Brak historii', de: 'Kein Verlauf', en: 'No history', it: 'Nessuna cronologia' },
      exportSuccess: { pl: 'Eksport zakończony', de: 'Export abgeschlossen', en: 'Export completed', it: 'Esportazione completata' },
      exportError: { pl: 'Błąd eksportu', de: 'Exportfehler', en: 'Export error', it: 'Errore di esportazione' },
      translating: { pl: 'Tłumaczenie...', de: 'Übersetzen...', en: 'Translating...', it: 'Traduzione...' },
      translationRequired: {
        pl: 'Tłumaczenie nie powiodło się.',
        de: 'Übersetzung fehlgeschlagen.',
        en: 'Translation failed.',
        it: 'Traduzione fallita.',
      },
      summaryError: {
        pl: 'Nie udało się wygenerować podsumowania.',
        de: 'Zusammenfassung konnte nicht erstellt werden.',
        en: 'Failed to generate summary.',
        it: 'Impossibile generare il riepilogo.',
      },
      back: { pl: 'Powrót', de: 'Zurück', en: 'Back', it: 'Indietro' },
    };
    return translations[key]?.[language] || translations[key]?.en || key;
  };

  // --- Export logic (same as original MedicalChatWidget) ---
  const generateDialogSummary = async (msgs: MedicalChatMessage[]): Promise<string | null> => {
    if (msgs.length === 0) return null;
    const dialogText = msgs.map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`).join('\n\n');
    const summaryPrompt = `Summarize the following scientific/medical dialog. Include main questions, key findings, conclusions, PubMed references. Keep it concise.\n\nDIALOG:\n${dialogText}\n\nProvide a structured summary:`;
    try {
      const response = await fetch(SUMMARIZE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA`,
        },
        body: JSON.stringify({ query: summaryPrompt, language: 'en', resultsCount: 0, isSummaryRequest: true }),
      });
      if (!response.ok) return null;
      const reader = response.body?.getReader();
      if (!reader) return null;
      let summary = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try { const p = JSON.parse(data); const c = p.choices?.[0]?.delta?.content; if (c) summary += c; } catch {}
          }
        }
      }
      return summary || null;
    } catch { return null; }
  };

  const translateContent = async (content: string, targetLang: ExportLanguage, sourceLang = 'en') => {
    if (sourceLang === targetLang) return { content, translated: false };
    try {
      const r = await fetch(TRANSLATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA` },
        body: JSON.stringify({ content, targetLanguage: targetLang, sourceLanguage: sourceLang }),
      });
      if (!r.ok) return { content: '', translated: false, error: 'translationRequired' };
      const d = await r.json();
      if (!d.translatedContent) return { content: '', translated: false, error: 'translationRequired' };
      return { content: d.translatedContent, translated: true };
    } catch { return { content: '', translated: false, error: 'translationRequired' }; }
  };

  const generateDocumentContent = (summary: string, lang: ExportLanguage): DocumentContent => {
    const locales: Record<ExportLanguage, string> = { pl: 'pl-PL', de: 'de-DE', en: 'en-US', it: 'it-IT' };
    const htmlSummary = summary
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/#{1,6}\s(.+)/g, '<strong>$1</strong>')
      .replace(/---/g, '<hr>')
      .split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    return {
      title: exportTranslations.title[lang],
      date: `${exportTranslations.generatedOn[lang]}: ${new Date().toLocaleDateString(locales[lang])}`,
      summaryHeader: exportTranslations.summary[lang],
      summaryHtml: htmlSummary,
      disclaimer: exportTranslations.disclaimer[lang],
      lang,
    };
  };

  const getMessagesHash = (msgs: MedicalChatMessage[]) => JSON.stringify(msgs.map(m => m.content)).slice(0, 200);

  const getOrGenerateDocContent = async (lang: ExportLanguage): Promise<DocumentContent | null> => {
    const currentHash = getMessagesHash(messages);
    if (cachedDocContent && cachedDocContent.lang === lang && cachedDocContent.messagesHash === currentHash) return cachedDocContent.content;
    const summary = await generateDialogSummary(messages);
    if (!summary) { toast({ title: getTranslation('exportError'), description: getTranslation('summaryError'), variant: 'destructive' }); return null; }
    const result = await translateContent(summary, lang, 'en');
    if (result.error) { toast({ title: getTranslation('exportError'), description: getTranslation('translationRequired'), variant: 'destructive' }); return null; }
    const translatedSummary = result.translated ? result.content : summary;
    const docContent = generateDocumentContent(translatedSummary, lang);
    setCachedDocContent({ content: docContent, lang, messagesHash: currentHash });
    return docContent;
  };

  const generateDocFromContent = (dc: DocumentContent) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${dc.title}</title><style>@page{size:A4;margin:2.5cm}body{font-family:Arial,sans-serif;margin:2.5cm;line-height:1.6;font-size:11pt}h1{color:#005293;font-size:16pt}h2{color:#005293;font-size:14pt}.date{color:#666;font-size:9pt}.summary{text-align:justify}.disclaimer{color:#888;font-style:italic;font-size:9pt;margin-top:25px;padding-top:12px;border-top:1px solid #ccc}a{color:#0066cc}</style></head><body><h1>${dc.title}</h1><div class="date">${dc.date}</div><hr><h2>${dc.summaryHeader}</h2><div class="summary">${dc.summaryHtml}</div><div class="disclaimer">${dc.disclaimer}</div></body></html>`;

  const saveDocFile = (html: string, lang: ExportLanguage) => {
    const b = new Blob([html], { type: 'application/msword' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u; a.download = `plc-omega-base-${lang}-${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  };

  const generateResponsiveHtml = (dc: DocumentContent) => `<!DOCTYPE html><html lang="${dc.lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${dc.title}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f5f5f5;padding:20px;line-height:1.6;color:#333}.document{background:white;margin:0 auto;padding:40px;box-shadow:0 2px 10px rgba(0,0,0,.1);border-radius:4px}@media(min-width:900px){.document{width:210mm;min-height:297mm;padding:25mm}}@media(max-width:899px){body{padding:10px}.document{padding:20px;width:100%}}h1{color:#005293;font-size:1.5rem;margin-bottom:.5rem}h2{color:#005293;font-size:1.25rem;margin:1.5rem 0 1rem}.date{color:#666;font-size:.875rem}.content{text-align:justify}.content a{color:#0066cc;text-decoration:underline}.disclaimer{color:#888;font-style:italic;font-size:.875rem;margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e5e5}</style></head><body><article class="document"><h1>${dc.title}</h1><div class="date">${dc.date}</div><hr><h2>${dc.summaryHeader}</h2><div class="content">${dc.summaryHtml}</div><footer class="disclaimer">${dc.disclaimer}</footer></article></body></html>`;

  const saveHtmlFile = (html: string, lang: ExportLanguage) => {
    const b = new Blob([html], { type: 'text/html;charset=utf-8' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u; a.download = `plc-omega-base-${lang}-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  };

  const generatePdfBody = (dc: DocumentContent) => `<div style="font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;line-height:1.5;color:#333;width:100%"><h1 style="color:#005293;font-size:16pt;margin:0 0 5px">${dc.title}</h1><div style="color:#666;font-size:9pt;margin-bottom:12px">${dc.date}</div><hr style="border:none;border-top:1px solid #ccc;margin:10px 0"><h2 style="color:#005293;font-size:13pt;margin:12px 0 8px">${dc.summaryHeader}</h2><div style="text-align:justify;word-wrap:break-word">${dc.summaryHtml}</div><div style="color:#888;font-style:italic;font-size:8pt;margin-top:20px;padding-top:10px;border-top:1px solid #ccc">${dc.disclaimer}</div></div>`;

  const generatePdfFromHtml = async (dc: DocumentContent) => {
    const bodyContent = generatePdfBody(dc);
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(255,255,255,1);z-index:1000000;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:18px;color:#666';
    overlay.innerHTML = '<div>Generowanie PDF...</div>';
    document.body.appendChild(overlay);
    const container = document.createElement('div');
    container.innerHTML = bodyContent;
    container.style.cssText = 'position:fixed;left:0;top:0;width:794px;background:white;padding:40px 60px;font-family:"Segoe UI",Arial,sans-serif;font-size:12px;line-height:1.5;z-index:999999';
    document.body.appendChild(container);
    await new Promise(r => setTimeout(r, 500));
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: container.offsetWidth, height: container.offsetHeight });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = 210, ph = 297, mx = 15, my = 15, cw = pw - 2 * mx, ch = ph - 2 * my;
      const iw = cw, sc = iw / canvas.width, phpx = ch / sc;
      let yo = 0, pn = 0;
      while (yo < canvas.height) {
        if (pn > 0) pdf.addPage();
        const sh = Math.min(phpx, canvas.height - yo);
        const pc = document.createElement('canvas'); pc.width = canvas.width; pc.height = sh;
        const ctx = pc.getContext('2d');
        if (ctx) { ctx.drawImage(canvas, 0, yo, canvas.width, sh, 0, 0, canvas.width, sh); pdf.addImage(pc.toDataURL('image/jpeg', 0.95), 'JPEG', mx, my, iw, sh * sc); }
        yo += phpx; pn++;
      }
      pdf.save(`plc-omega-base-${dc.lang}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally { document.body.removeChild(container); document.body.removeChild(overlay); }
  };

  const exportTo = async (format: 'pdf' | 'doc' | 'html', lang: ExportLanguage) => {
    if (messages.length === 0) return;
    setIsExporting(true);
    try {
      const dc = await getOrGenerateDocContent(lang);
      if (!dc) return;
      if (format === 'pdf') await generatePdfFromHtml(dc);
      else if (format === 'doc') { saveDocFile(generateDocFromContent(dc), lang); }
      else { saveHtmlFile(generateResponsiveHtml(dc), lang); }
      toast({ title: getTranslation('exportSuccess'), description: `${format.toUpperCase()} (${lang.toUpperCase()})` });
    } catch (err) {
      console.error('Export error:', err);
      toast({ title: getTranslation('exportError'), variant: 'destructive' });
    } finally { setIsExporting(false); }
  };

  // Render message content with clickable links (markdown + bare URLs)
  const renderMessageContent = (content: string) => {
    // First convert markdown links, then bare URLs
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    const urlRegex = /(https?:\/\/[^\s<>\[\]()]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        // Process text between markdown links for bare URLs
        const textBetween = content.slice(lastIndex, match.index);
        parts.push(...renderBareUrls(textBetween, `pre-${match.index}`));
      }
      const mdUrl = match[2];
      parts.push(
        <a key={`md-${match.index}`} href={mdUrl} target="_blank" rel="noopener noreferrer"
          onClick={(e) => { e.preventDefault(); window.open(mdUrl, '_blank', 'noopener,noreferrer'); }}
          className="text-[#D4AF37] hover:text-[#F5E050] underline underline-offset-2 inline-flex items-center gap-1">
          {match[1]}<ExternalLink className="w-3 h-3" />
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(...renderBareUrls(content.slice(lastIndex), `end-${lastIndex}`));
    }

    return parts.length > 0 ? parts : (
      <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
    );
  };

  // Convert bare URLs to clickable links
  const renderBareUrls = (text: string, keyPrefix: string): React.ReactNode[] => {
    const urlRegex = /(https?:\/\/[^\s<>\[\]()]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let m;
    while ((m = urlRegex.exec(text)) !== null) {
      if (m.index > lastIdx) {
        parts.push(
          <span key={`${keyPrefix}-t-${lastIdx}`} dangerouslySetInnerHTML={{
            __html: text.slice(lastIdx, m.index).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
          }} />
        );
      }
      const bareUrl = m[0];
      parts.push(
        <a key={`${keyPrefix}-u-${m.index}`} href={bareUrl} target="_blank" rel="noopener noreferrer"
          onClick={(e) => { e.preventDefault(); window.open(bareUrl, '_blank', 'noopener,noreferrer'); }}
          className="text-[#D4AF37] hover:text-[#F5E050] underline underline-offset-2 inline-flex items-center gap-1 break-all">
          {bareUrl.length > 60 ? bareUrl.slice(0, 57) + '...' : bareUrl}<ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      );
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < text.length) {
      parts.push(
        <span key={`${keyPrefix}-t-${lastIdx}`} dangerouslySetInnerHTML={{
          __html: text.slice(lastIdx).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
        }} />
      );
    }
    return parts;
  };

  const resultsOptions = [
    { value: 1, label: '1' }, { value: 5, label: '5' }, { value: 10, label: '10' },
    { value: 20, label: '20' }, { value: 30, label: '30' }, { value: 40, label: '40' },
    { value: 50, label: '50' }, { value: 0, label: getTranslation('max') },
  ];

  const exportLanguageOptions: { value: ExportLanguage; label: string; flag: string }[] = [
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'pl', label: 'Polski', flag: '🇵🇱' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#0A0A0A] border-b border-[#C5A059]/30 px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 text-[#C5A059]/70 hover:text-[#D4AF37] hover:bg-[#C5A059]/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Search className="w-5 h-5 text-[#C5A059]" />
          <span className="font-bold text-base md:text-lg tracking-wider bg-gradient-to-r from-[#D4AF37] via-[#F5E050] to-[#C5A059] bg-clip-text text-transparent">
            PLC OMEGA BASE
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* History */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#C5A059]/70 hover:text-[#D4AF37] hover:bg-[#C5A059]/10" title={getTranslation('history')}>
                <History className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 bg-[#121212]/95 backdrop-blur-xl border-[#C5A059]/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)]" align="end">
              <div className="p-2 border-b border-[#C5A059]/20 font-medium text-sm text-[#D4AF37]">{getTranslation('history')}</div>
              <ScrollArea className="max-h-60">
                {chatHistory.length === 0 ? (
                  <div className="p-3 text-sm text-[#C5A059]/50 text-center">{getTranslation('noHistory')}</div>
                ) : chatHistory.map((entry) => (
                  <button key={entry.id} className="w-full text-left p-2 hover:bg-[#C5A059]/10 text-sm border-b border-[#C5A059]/10 last:border-0 text-[#E0E0E0]" onClick={() => loadFromHistory(entry)}>
                    <div className="font-medium truncate">{entry.query}</div>
                    <div className="text-xs text-[#C5A059]/50">{new Date(entry.created_at).toLocaleDateString(language)}</div>
                  </button>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Download */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#C5A059]/70 hover:text-[#D4AF37] hover:bg-[#C5A059]/10" disabled={messages.length === 0 || isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> : <Download className="w-4 h-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px] bg-[#121212]/95 backdrop-blur-xl border-[#C5A059]/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
              <DropdownMenuLabel className="text-xs flex items-center gap-1 text-[#D4AF37]"><Globe className="w-3 h-3" /> HTML</DropdownMenuLabel>
              {exportLanguageOptions.map(o => <DropdownMenuItem key={`html-${o.value}`} onClick={() => exportTo('html', o.value)} className="flex items-center gap-2 pl-4 text-[#E0E0E0] hover:bg-[#C5A059]/15 hover:text-[#D4AF37] focus:bg-[#C5A059]/15 focus:text-[#D4AF37]"><span>{o.flag}</span><span>{o.label}</span></DropdownMenuItem>)}
              <DropdownMenuSeparator className="bg-[#C5A059]/20" />
              <DropdownMenuLabel className="text-xs flex items-center gap-1 text-[#D4AF37]"><FileText className="w-3 h-3" /> PDF</DropdownMenuLabel>
              {exportLanguageOptions.map(o => <DropdownMenuItem key={`pdf-${o.value}`} onClick={() => exportTo('pdf', o.value)} className="flex items-center gap-2 pl-4 text-[#E0E0E0] hover:bg-[#C5A059]/15 hover:text-[#D4AF37] focus:bg-[#C5A059]/15 focus:text-[#D4AF37]"><span>{o.flag}</span><span>{o.label}</span></DropdownMenuItem>)}
              <DropdownMenuSeparator className="bg-[#C5A059]/20" />
              <DropdownMenuLabel className="text-xs flex items-center gap-1 text-[#D4AF37]"><FileText className="w-3 h-3" /> DOC</DropdownMenuLabel>
              {exportLanguageOptions.map(o => <DropdownMenuItem key={`doc-${o.value}`} onClick={() => exportTo('doc', o.value)} className="flex items-center gap-2 pl-4 text-[#E0E0E0] hover:bg-[#C5A059]/15 hover:text-[#D4AF37] focus:bg-[#C5A059]/15 focus:text-[#D4AF37]"><span>{o.flag}</span><span>{o.label}</span></DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Results count */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1 bg-[#1A1A1A]/70 border-[#C5A059]/20 text-[#C5A059] hover:bg-[#C5A059]/10 hover:text-[#D4AF37]">
                {resultsCount === 0 ? getTranslation('max') : resultsCount}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#121212]/95 backdrop-blur-xl border-[#C5A059]/20">
              {resultsOptions.map(o => (
                <DropdownMenuItem key={o.value} onClick={() => setResultsCount(o.value)}
                  className={`text-[#E0E0E0] hover:bg-[#C5A059]/15 hover:text-[#D4AF37] focus:bg-[#C5A059]/15 focus:text-[#D4AF37] ${resultsCount === o.value ? 'bg-[#C5A059]/15 text-[#D4AF37]' : ''}`}>
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear */}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#C5A059]/70 hover:text-[#D4AF37] hover:bg-[#C5A059]/10" onClick={handleClearMessages}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-[#C5A059]/5 border-b border-[#C5A059]/15 px-4 md:px-6 py-2 text-xs text-[#D4AF37]/90 shrink-0">
        {getTranslation('disclaimer')}
      </div>

      {/* Messages area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 md:px-6 py-4 bg-[#0A0A0A]/30">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => {
            const isLastAssistant = message.role === 'assistant' && index === messages.length - 1;
            return (
              <div key={index} ref={isLastAssistant ? lastAssistantRef : undefined}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] md:max-w-[75%] rounded-lg px-4 py-3 text-sm break-words ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-[#1A1A1A]/95 to-[#121212]/90 border-r-[3px] border-[#C5A059] text-[#F5F5F5] shadow-[0_2px_8px_rgba(0,0,0,0.4)]'
                    : 'bg-[#1A1A1A]/60 backdrop-blur-sm border border-[#C5A059]/10 text-[#E0E0E0]'
                }`} style={{ overflowWrap: 'anywhere' }}>
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm prose-invert max-w-none [&_a]:text-[#D4AF37] [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-[#F5E050]">
                      {renderMessageContent(message.content)}
                    </div>
                  ) : (
                    <span style={{ wordBreak: 'break-word' }}>{message.content}</span>
                  )}
                </div>
              </div>
            );
          })}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#1A1A1A]/60 backdrop-blur-sm border border-[#C5A059]/10 rounded-lg px-3 py-2 text-sm text-[#C5A059]/70 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#C5A059] rounded-full animate-pulse-gold" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#C5A059] rounded-full animate-pulse-gold" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#C5A059] rounded-full animate-pulse-gold" style={{ animationDelay: '300ms' }} />
                </div>
                <span>{getTranslation('thinking')}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-950/30 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-sm">{error}</div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 md:px-6 border-t border-[#C5A059]/15 bg-[#0A0A0A]/50 shrink-0">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getTranslation('placeholder')}
            disabled={isLoading}
            className="flex-1 bg-[#1A1A1A]/70 border-[#C5A059]/20 text-[#F5F5F5] placeholder:text-[#C5A059]/50 focus:border-[#C5A059]/50 focus:ring-[#C5A059]/20 focus-visible:ring-[#C5A059]/20"
          />
          <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()}
            className="bg-gradient-to-br from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#F5E050] text-[#0A0A0A] shadow-[0_2px_8px_rgba(197,160,89,0.3)] hover:shadow-[0_4px_12px_rgba(212,175,55,0.4)] disabled:from-[#C5A059]/30 disabled:to-[#C5A059]/30">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OmegaBasePage;
