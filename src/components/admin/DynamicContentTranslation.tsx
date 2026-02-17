import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslationJobs } from '@/hooks/useTranslationJobs';
import { Bot, Loader2, Save, BookOpen, Database, Heart } from 'lucide-react';

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

export const DynamicContentTranslation: React.FC = () => {
  const { toast } = useToast();
  const { startJob } = useTranslationJobs();

  const [activeSection, setActiveSection] = useState('training');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

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

  // Load content based on active section
  useEffect(() => {
    if (activeSection === 'training') loadTrainingData();
    else if (activeSection === 'knowledge') loadKnowledgeData();
    else if (activeSection === 'healthy') loadHealthyData();
  }, [activeSection]);

  // Load translations when language changes
  useEffect(() => {
    if (!selectedLanguage) return;
    if (activeSection === 'training') loadTrainingTranslations();
    else if (activeSection === 'knowledge') loadKnowledgeTranslations();
    else if (activeSection === 'healthy') loadHealthyTranslations();
  }, [selectedLanguage, activeSection]);

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

  const renderItemEditor = (
    item: TranslationItem,
    translations: Record<string, Record<string, string>>,
    setter: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>,
    table: string,
    fkColumn: string,
    fields: { key: string; label: string; multiline?: boolean }[]
  ) => {
    const t = translations[item.id] || {};
    return (
      <Card key={item.id} className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-medium text-sm">{item.title}</span>
              {item.description && (
                <span className="text-xs text-muted-foreground ml-2">— {item.description?.substring(0, 60)}...</span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={saving === item.id}
              onClick={() => saveTranslation(table, fkColumn, item.id, t)}
            >
              {saving === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              <span className="ml-1">Zapisz</span>
            </Button>
          </div>
          <div className="grid gap-2 mt-2">
            {fields.map(f => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                {f.multiline ? (
                  <Textarea
                    value={t[f.key] || ''}
                    onChange={e => updateTranslation(setter, item.id, f.key, e.target.value)}
                    rows={3}
                    className="text-sm"
                    placeholder={`${f.label} (${selectedLanguage.toUpperCase()})`}
                  />
                ) : (
                  <Input
                    value={t[f.key] || ''}
                    onChange={e => updateTranslation(setter, item.id, f.key, e.target.value)}
                    className="text-sm"
                    placeholder={`${f.label} (${selectedLanguage.toUpperCase()})`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (languages.length === 0) {
    return <div className="text-muted-foreground text-sm p-4">Brak aktywnych języków do tłumaczenia (poza polskim).</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-48">
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

        <Button variant="outline" size="sm" onClick={handleAiTranslate}>
          <Bot className="w-4 h-4 mr-2" />
          Tłumacz AI ({activeSection === 'training' ? 'Szkolenia' : activeSection === 'knowledge' ? 'Zasoby' : 'Zdrowa Wiedza'})
        </Button>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList>
          <TabsTrigger value="training">
            <BookOpen className="w-4 h-4 mr-1" />
            Szkolenia
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <Database className="w-4 h-4 mr-1" />
            Baza wiedzy
          </TabsTrigger>
          <TabsTrigger value="healthy">
            <Heart className="w-4 h-4 mr-1" />
            Zdrowa Wiedza
          </TabsTrigger>
        </TabsList>

        <TabsContent value="training">
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Moduły szkoleniowe ({modules.length})</h4>
              {modules.map(m => renderItemEditor(m, moduleTranslations, setModuleTranslations, 'training_module_translations', 'module_id', [
                { key: 'title', label: 'Tytuł' },
                { key: 'description', label: 'Opis', multiline: true },
              ]))}
              <h4 className="font-medium text-sm text-muted-foreground mt-6">Lekcje ({lessons.length})</h4>
              {lessons.map(l => renderItemEditor(l, lessonTranslations, setLessonTranslations, 'training_lesson_translations', 'lesson_id', [
                { key: 'title', label: 'Tytuł' },
                { key: 'content', label: 'Treść', multiline: true },
                { key: 'media_alt_text', label: 'Alt text' },
              ]))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="knowledge">
          <ScrollArea className="max-h-[600px]">
            <h4 className="font-medium text-sm text-muted-foreground">Zasoby ({resources.length})</h4>
            {resources.map(r => renderItemEditor(r, resourceTranslations, setResourceTranslations, 'knowledge_resource_translations', 'resource_id', [
              { key: 'title', label: 'Tytuł' },
              { key: 'description', label: 'Opis', multiline: true },
              { key: 'context_of_use', label: 'Kontekst użycia', multiline: true },
            ]))}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="healthy">
          <ScrollArea className="max-h-[600px]">
            <h4 className="font-medium text-sm text-muted-foreground">Materiały ({hkItems.length})</h4>
            {hkItems.map(item => renderItemEditor(item, hkTranslations, setHkTranslations, 'healthy_knowledge_translations', 'item_id', [
              { key: 'title', label: 'Tytuł' },
              { key: 'description', label: 'Opis', multiline: true },
              { key: 'text_content', label: 'Treść', multiline: true },
            ]))}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
