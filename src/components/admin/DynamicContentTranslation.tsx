import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslationJobs } from '@/hooks/useTranslationJobs';
import { Bot, Loader2, Save, Search, CheckCircle2, Circle, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface Language {
  code: string;
  name: string;
  flag_emoji: string;
  is_active: boolean;
}

interface TranslationItem {
  id: string;
  title: string;
  description?: string | null;
  [key: string]: any;
}

interface TranslationRow {
  id: string;
  language_code: string;
  [key: string]: any;
}

interface FieldDef {
  key: string;
  label: string;
  multiline?: boolean;
}

const ITEMS_PER_PAGE = 20;

export const DynamicContentTranslation: React.FC = () => {
  const { toast } = useToast();
  const { startJob, activeJob, progress } = useTranslationJobs();

  const [activeSection, setActiveSection] = useState('training');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Pagination
  const [visibleModules, setVisibleModules] = useState(ITEMS_PER_PAGE);
  const [visibleLessons, setVisibleLessons] = useState(ITEMS_PER_PAGE);
  const [visibleResources, setVisibleResources] = useState(ITEMS_PER_PAGE);
  const [visibleHk, setVisibleHk] = useState(ITEMS_PER_PAGE);

  // Data states
  const [modules, setModules] = useState<TranslationItem[]>([]);
  const [lessons, setLessons] = useState<TranslationItem[]>([]);
  const [resources, setResources] = useState<TranslationItem[]>([]);
  const [hkItems, setHkItems] = useState<TranslationItem[]>([]);

  // Translation states
  const [moduleTranslations, setModuleTranslations] = useState<Record<string, Record<string, string>>>({});
  const [lessonTranslations, setLessonTranslations] = useState<Record<string, Record<string, string>>>({});
  const [resourceTranslations, setResourceTranslations] = useState<Record<string, Record<string, string>>>({});
  const [hkTranslations, setHkTranslations] = useState<Record<string, Record<string, string>>>({});

  // Load languages
  useEffect(() => {
    supabase
      .from('i18n_languages')
      .select('code, name, flag_emoji, is_active')
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => {
        if (data) setLanguages(data.filter(l => l.code !== 'pl'));
      });
  }, []);

  useEffect(() => {
    if (activeSection === 'training') loadTrainingData();
    else if (activeSection === 'knowledge') loadKnowledgeData();
    else if (activeSection === 'healthy') loadHealthyData();
  }, [activeSection]);

  useEffect(() => {
    if (!selectedLanguage) return;
    if (activeSection === 'training') loadTrainingTranslations();
    else if (activeSection === 'knowledge') loadKnowledgeTranslations();
    else if (activeSection === 'healthy') loadHealthyTranslations();
  }, [selectedLanguage, activeSection]);

  // Reset pagination on search/section change
  useEffect(() => {
    setVisibleModules(ITEMS_PER_PAGE);
    setVisibleLessons(ITEMS_PER_PAGE);
    setVisibleResources(ITEMS_PER_PAGE);
    setVisibleHk(ITEMS_PER_PAGE);
  }, [debouncedSearch, activeSection]);

  const loadTrainingData = async () => {
    const [{ data: mods }, { data: less }] = await Promise.all([
      supabase.from('training_modules').select('id, title, description').eq('is_active', true).order('position'),
      supabase.from('training_lessons').select('id, title, content, media_alt_text, module_id').eq('is_active', true).order('position'),
    ]);
    setModules((mods as TranslationItem[]) || []);
    setLessons((less as TranslationItem[]) || []);
  };

  const loadTrainingTranslations = async () => {
    const [{ data: modT }, { data: lessT }] = await Promise.all([
      supabase.from('training_module_translations').select('*').eq('language_code', selectedLanguage),
      supabase.from('training_lesson_translations').select('*').eq('language_code', selectedLanguage),
    ]);
    setModuleTranslations(buildTranslationMap(modT as TranslationRow[] || [], 'module_id'));
    setLessonTranslations(buildTranslationMap(lessT as TranslationRow[] || [], 'lesson_id'));
  };

  const loadKnowledgeData = async () => {
    const { data } = await supabase.from('knowledge_resources').select('id, title, description, context_of_use').order('position');
    setResources((data as TranslationItem[]) || []);
  };

  const loadKnowledgeTranslations = async () => {
    const { data } = await supabase.from('knowledge_resource_translations').select('*').eq('language_code', selectedLanguage);
    setResourceTranslations(buildTranslationMap(data as TranslationRow[] || [], 'resource_id'));
  };

  const loadHealthyData = async () => {
    const { data } = await supabase.from('healthy_knowledge').select('id, title, description, text_content').eq('is_active', true).order('position');
    setHkItems((data as TranslationItem[]) || []);
  };

  const loadHealthyTranslations = async () => {
    const { data } = await supabase.from('healthy_knowledge_translations').select('*').eq('language_code', selectedLanguage);
    setHkTranslations(buildTranslationMap(data as TranslationRow[] || [], 'item_id'));
  };

  const buildTranslationMap = (rows: TranslationRow[], fkColumn: string): Record<string, Record<string, string>> => {
    const map: Record<string, Record<string, string>> = {};
    for (const row of rows) {
      const fkId = row[fkColumn];
      map[fkId] = {};
      for (const [key, value] of Object.entries(row)) {
        if (['id', 'language_code', 'created_at', 'updated_at', fkColumn].includes(key)) continue;
        if (value !== null) map[fkId][key] = value as string;
      }
    }
    return map;
  };

  const updateTranslation = (
    setter: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>,
    itemId: string,
    field: string,
    value: string
  ) => {
    setter(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [field]: value }
    }));
  };

  const saveTranslation = async (table: string, fkColumn: string, itemId: string, fields: Record<string, string>) => {
    setSaving(itemId);
    try {
      const payload = {
        [fkColumn]: itemId,
        language_code: selectedLanguage,
        ...fields,
        updated_at: new Date().toISOString(),
      };
      const { error } = await (supabase.from(table as any) as any)
        .upsert(payload, { onConflict: `${fkColumn},language_code` });
      if (error) throw error;
      toast({ title: 'Zapisano', description: 'Tłumaczenie zostało zapisane.' });
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleAiTranslate = async () => {
    const jobTypeMap: Record<string, string> = {
      training: 'training',
      knowledge: 'knowledge',
      healthy: 'healthy_knowledge',
    };
    const jobType = jobTypeMap[activeSection] || 'training';
    await startJob('pl', selectedLanguage, 'missing', jobType as any);
  };

  // Filter items by search
  const filterItems = (items: TranslationItem[]) => {
    if (!debouncedSearch) return items;
    const q = debouncedSearch.toLowerCase();
    return items.filter(item => item.title?.toLowerCase().includes(q));
  };

  // Check if item has translation
  const hasTranslation = (itemId: string, translations: Record<string, Record<string, string>>, fields: FieldDef[]) => {
    const t = translations[itemId];
    if (!t) return false;
    return fields.some(f => t[f.key] && t[f.key].trim() !== '');
  };

  // Count translated items
  const countTranslated = (items: TranslationItem[], translations: Record<string, Record<string, string>>, fields: FieldDef[]) => {
    return items.filter(item => hasTranslation(item.id, translations, fields)).length;
  };

  const moduleFields: FieldDef[] = [
    { key: 'title', label: 'Tytuł' },
    { key: 'description', label: 'Opis', multiline: true },
  ];
  const lessonFields: FieldDef[] = [
    { key: 'title', label: 'Tytuł' },
    { key: 'content', label: 'Treść', multiline: true },
    { key: 'media_alt_text', label: 'Alt text' },
  ];
  const resourceFields: FieldDef[] = [
    { key: 'title', label: 'Tytuł' },
    { key: 'description', label: 'Opis', multiline: true },
    { key: 'context_of_use', label: 'Kontekst użycia', multiline: true },
  ];
  const hkFields: FieldDef[] = [
    { key: 'title', label: 'Tytuł' },
    { key: 'description', label: 'Opis', multiline: true },
    { key: 'text_content', label: 'Treść', multiline: true },
  ];

  const renderItemList = (
    items: TranslationItem[],
    translations: Record<string, Record<string, string>>,
    setter: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>,
    table: string,
    fkColumn: string,
    fields: FieldDef[],
    visibleCount: number,
    setVisibleCount: React.Dispatch<React.SetStateAction<number>>,
    label: string,
  ) => {
    const filtered = filterItems(items);
    const translated = countTranslated(items, translations, fields);
    const shown = filtered.slice(0, visibleCount);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm text-muted-foreground">
            {label} ({filtered.length})
          </h4>
          <Badge variant={translated === items.length ? 'default' : 'secondary'} className="text-xs">
            {translated}/{items.length} przetłumaczonych
          </Badge>
        </div>

        <Accordion type="multiple" className="space-y-1">
          {shown.map(item => {
            const isTranslated = hasTranslation(item.id, translations, fields);
            const t = translations[item.id] || {};

            return (
              <AccordionItem key={item.id} value={item.id} className="border rounded-md px-3">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <div className="flex items-center gap-2 text-left flex-1 min-w-0">
                    {isTranslated ? (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">{item.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-2 pt-1 pb-2">
                    {fields.map(f => (
                      <div key={f.key}>
                        <Label className="text-xs text-muted-foreground">{f.label}</Label>
                        {f.multiline ? (
                          <Textarea
                            value={t[f.key] || ''}
                            onChange={e => updateTranslation(setter, item.id, f.key, e.target.value)}
                            rows={2}
                            className="text-sm mt-1"
                            placeholder={`${f.label} (${selectedLanguage.toUpperCase()})`}
                          />
                        ) : (
                          <Input
                            value={t[f.key] || ''}
                            onChange={e => updateTranslation(setter, item.id, f.key, e.target.value)}
                            className="text-sm mt-1"
                            placeholder={`${f.label} (${selectedLanguage.toUpperCase()})`}
                          />
                        )}
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-fit mt-1"
                      disabled={saving === item.id}
                      onClick={() => saveTranslation(table, fkColumn, item.id, t)}
                    >
                      {saving === item.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                      Zapisz
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {filtered.length > visibleCount && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
          >
            Pokaż więcej ({filtered.length - visibleCount} pozostałych)
          </Button>
        )}
      </div>
    );
  };

  if (languages.length === 0) {
    return <div className="text-muted-foreground text-sm p-4">Brak aktywnych języków do tłumaczenia (poza polskim).</div>;
  }

  const isJobActive = activeJob && (activeJob.status === 'pending' || activeJob.status === 'processing');

  return (
    <div className="space-y-3">
      {/* Compact progress bar */}
      {isJobActive && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {activeJob.processed_keys}/{activeJob.total_keys}
          </span>
        </div>
      )}

      {/* Controls - single row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map(l => (
              <SelectItem key={l.code} value={l.code}>
                {l.flag_emoji} {l.name} ({l.code.toUpperCase()})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="h-9" onClick={handleAiTranslate} disabled={!!isJobActive}>
          <Bot className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">Tłumacz AI</span>
        </Button>

        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Section switcher - segmented control */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {[
          { key: 'training', label: 'Szkolenia' },
          { key: 'knowledge', label: 'Baza wiedzy' },
          { key: 'healthy', label: 'Zdrowa Wiedza' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={cn(
              "flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors touch-action-manipulation min-h-[44px]",
              activeSection === s.key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeSection === 'training' && (
          <>
            {renderItemList(modules, moduleTranslations, setModuleTranslations, 'training_module_translations', 'module_id', moduleFields, visibleModules, setVisibleModules, 'Moduły szkoleniowe')}
            {renderItemList(lessons, lessonTranslations, setLessonTranslations, 'training_lesson_translations', 'lesson_id', lessonFields, visibleLessons, setVisibleLessons, 'Lekcje')}
          </>
        )}
        {activeSection === 'knowledge' && (
          renderItemList(resources, resourceTranslations, setResourceTranslations, 'knowledge_resource_translations', 'resource_id', resourceFields, visibleResources, setVisibleResources, 'Zasoby')
        )}
        {activeSection === 'healthy' && (
          renderItemList(hkItems, hkTranslations, setHkTranslations, 'healthy_knowledge_translations', 'item_id', hkFields, visibleHk, setVisibleHk, 'Materiały')
        )}
      </div>
    </div>
  );
};
