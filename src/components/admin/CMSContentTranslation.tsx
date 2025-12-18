import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { I18nLanguage } from '@/hooks/useTranslations';
import { useTranslationJobs } from '@/hooks/useTranslationJobs';
import { 
  Search, Bot, Loader2, ChevronRight, ChevronDown, FileText, 
  Pencil, Save, X, RefreshCw, Languages, AlertTriangle, CheckCircle2, StopCircle, LayoutGrid
} from 'lucide-react';

interface CMSContentTranslationProps {
  languages: I18nLanguage[];
  defaultLang: string;
}

interface Page {
  id: string;
  title: string;
  slug: string;
}

interface CMSItem {
  id: string;
  page_id: string;
  section_id: string;
  type: string;
  title: string | null;
  description: string | null;
  cells: any;
  position: number;
}

interface CMSSection {
  id: string;
  page_id: string;
  title: string | null;
  description: string | null;
  collapsible_header: string | null;
  position: number;
  section_type: string | null;
}

interface CMSItemTranslation {
  id?: string;
  item_id: string;
  language_code: string;
  title: string | null;
  description: string | null;
  cells: any;
}

interface CMSSectionTranslation {
  id?: string;
  section_id: string;
  language_code: string;
  title: string | null;
  description: string | null;
  collapsible_header: string | null;
}

export const CMSContentTranslation: React.FC<CMSContentTranslationProps> = ({
  languages,
  defaultLang
}) => {
  const { toast } = useToast();
  const { activeJob, isLoading: jobLoading, progress, startJob, cancelJob, clearJob } = useTranslationJobs();
  
  // State
  const [pages, setPages] = useState<Page[]>([]);
  const [items, setItems] = useState<CMSItem[]>([]);
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [translations, setTranslations] = useState<CMSItemTranslation[]>([]);
  const [sectionTranslations, setSectionTranslations] = useState<CMSSectionTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(defaultLang === 'pl' ? 'de' : 'pl');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'items' | 'sections'>('items');
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  
  // Edit state
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; description: string; collapsible_header?: string }>({ title: '', description: '' });
  const [saving, setSaving] = useState(false);
  
  // AI Translation dialog
  const [aiDialog, setAiDialog] = useState(false);
  const [aiTranslatingSingle, setAiTranslatingSingle] = useState(false);
  const [aiTranslateMode, setAiTranslateMode] = useState<'all' | 'missing'>('missing');

  // Check if there's an active CMS job
  const activeCMSJob = activeJob?.job_type === 'cms' && 
    (activeJob.status === 'pending' || activeJob.status === 'processing');

  // Refresh translations when job completes
  useEffect(() => {
    if (activeJob?.job_type === 'cms' && activeJob.status === 'completed') {
      fetchData();
    }
  }, [activeJob?.status]);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch pages
      const { data: pagesData, error: pagesError } = await supabase
        .from('pages')
        .select('id, title, slug')
        .eq('is_active', true)
        .order('position');
      
      if (pagesError) throw pagesError;
      setPages(pagesData || []);

      // Fetch CMS items with translatable content
      const { data: itemsData, error: itemsError } = await supabase
        .from('cms_items')
        .select('id, page_id, section_id, type, title, description, cells, position')
        .eq('is_active', true)
        .order('position');
      
      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Fetch CMS sections with translatable content
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('id, page_id, title, description, collapsible_header, position, section_type')
        .eq('is_active', true)
        .order('position');
      
      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);

      // Fetch existing item translations
      const { data: translationsData, error: translationsError } = await supabase
        .from('cms_item_translations')
        .select('*');
      
      if (translationsError) {
        console.error('Error fetching item translations:', translationsError);
      } else {
        setTranslations(translationsData || []);
      }

      // Fetch existing section translations
      const { data: sectionTranslationsData, error: sectionTranslationsError } = await supabase
        .from('cms_section_translations')
        .select('*');
      
      if (sectionTranslationsError) {
        console.error('Error fetching section translations:', sectionTranslationsError);
      } else {
        setSectionTranslations(sectionTranslationsData || []);
      }

    } catch (error: any) {
      toast({ title: 'Błąd', description: 'Nie udało się załadować danych', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Filter items by page, search, and missing filter
  const filteredItems = useMemo(() => {
    let result = items;
    
    if (selectedPage) {
      result = result.filter(item => item.page_id === selectedPage);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.title?.toLowerCase().includes(query)) ||
        (item.description?.toLowerCase().includes(query)) ||
        item.type.toLowerCase().includes(query)
      );
    }
    
    // Only show items with translatable content
    result = result.filter(item => item.title || item.description || (item.cells && item.cells.length > 0));
    
    // Filter by missing translations
    if (showOnlyMissing) {
      result = result.filter(item => {
        const t = translations.find(tr => tr.item_id === item.id && tr.language_code === selectedLanguage);
        return !t?.title && !t?.description;
      });
    }
    
    return result;
  }, [items, selectedPage, searchQuery, showOnlyMissing, translations, selectedLanguage]);

  // Filter sections by page, search, and missing filter
  const filteredSections = useMemo(() => {
    let result = sections;
    
    if (selectedPage) {
      result = result.filter(section => section.page_id === selectedPage);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(section => 
        (section.title?.toLowerCase().includes(query)) ||
        (section.description?.toLowerCase().includes(query))
      );
    }
    
    // Only show sections with translatable content
    result = result.filter(section => section.title || section.description || section.collapsible_header);
    
    // Filter by missing translations
    if (showOnlyMissing) {
      result = result.filter(section => {
        const t = sectionTranslations.find(tr => tr.section_id === section.id && tr.language_code === selectedLanguage);
        return !t?.title && !t?.description && !t?.collapsible_header;
      });
    }
    
    return result;
  }, [sections, selectedPage, searchQuery, showOnlyMissing, sectionTranslations, selectedLanguage]);

  // Group items by page
  const itemsByPage = useMemo(() => {
    const groups: Record<string, CMSItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.page_id]) groups[item.page_id] = [];
      groups[item.page_id].push(item);
    }
    return groups;
  }, [filteredItems]);

  // Group sections by page
  const sectionsByPage = useMemo(() => {
    const groups: Record<string, CMSSection[]> = {};
    for (const section of filteredSections) {
      if (!groups[section.page_id]) groups[section.page_id] = [];
      groups[section.page_id].push(section);
    }
    return groups;
  }, [filteredSections]);

  // Get translation for item from database
  const getTranslation = useCallback((itemId: string, langCode: string): CMSItemTranslation | null => {
    return translations.find(t => t.item_id === itemId && t.language_code === langCode) || null;
  }, [translations]);

  // Get translation for section from database
  const getSectionTranslation = useCallback((sectionId: string, langCode: string): CMSSectionTranslation | null => {
    return sectionTranslations.find(t => t.section_id === sectionId && t.language_code === langCode) || null;
  }, [sectionTranslations]);

  // Toggle item expansion
  const toggleItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Start editing item
  const startEditing = (item: CMSItem) => {
    const translation = getTranslation(item.id, selectedLanguage);
    setEditingItem(item.id);
    setEditingSection(null);
    setEditForm({
      title: translation?.title || '',
      description: translation?.description || ''
    });
  };

  // Start editing section
  const startEditingSection = (section: CMSSection) => {
    const translation = getSectionTranslation(section.id, selectedLanguage);
    setEditingSection(section.id);
    setEditingItem(null);
    setEditForm({
      title: translation?.title || '',
      description: translation?.description || '',
      collapsible_header: translation?.collapsible_header || ''
    });
  };

  // Save item translation to database
  const saveTranslation = async (itemId: string) => {
    setSaving(true);
    try {
      const existingTranslation = getTranslation(itemId, selectedLanguage);
      
      const translationData = {
        item_id: itemId,
        language_code: selectedLanguage,
        title: editForm.title || null,
        description: editForm.description || null,
        cells: null,
        updated_at: new Date().toISOString()
      };

      if (existingTranslation?.id) {
        const { error } = await supabase
          .from('cms_item_translations')
          .update(translationData)
          .eq('id', existingTranslation.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cms_item_translations')
          .insert(translationData);
        
        if (error) throw error;
      }

      const { data: updatedTranslations } = await supabase
        .from('cms_item_translations')
        .select('*');
      
      if (updatedTranslations) {
        setTranslations(updatedTranslations);
      }
      
      toast({ title: 'Zapisano', description: 'Tłumaczenie zostało zapisane' });
      setEditingItem(null);
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Save section translation to database
  const saveSectionTranslation = async (sectionId: string) => {
    setSaving(true);
    try {
      const existingTranslation = getSectionTranslation(sectionId, selectedLanguage);
      
      const translationData = {
        section_id: sectionId,
        language_code: selectedLanguage,
        title: editForm.title || null,
        description: editForm.description || null,
        collapsible_header: editForm.collapsible_header || null,
        updated_at: new Date().toISOString()
      };

      if (existingTranslation?.id) {
        const { error } = await supabase
          .from('cms_section_translations')
          .update(translationData)
          .eq('id', existingTranslation.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cms_section_translations')
          .insert(translationData);
        
        if (error) throw error;
      }

      const { data: updatedTranslations } = await supabase
        .from('cms_section_translations')
        .select('*');
      
      if (updatedTranslations) {
        setSectionTranslations(updatedTranslations);
      }
      
      toast({ title: 'Zapisano', description: 'Tłumaczenie sekcji zostało zapisane' });
      setEditingSection(null);
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // AI translate single item (synchronous for quick single translations)
  const translateSingleWithAI = async (item: CMSItem) => {
    if (!item.title && !item.description) return;
    
    setAiTranslatingSingle(true);
    try {
      const targetLang = languages.find(l => l.code === selectedLanguage);
      
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: {
          content: item.title || item.description,
          targetLanguage: targetLang?.name || selectedLanguage,
          sourceLanguage: 'Polish'
        }
      });
      
      if (error) throw error;
      
      const translatedContent = data.translated || data.content;
      
      // Save to database
      const existingTranslation = getTranslation(item.id, selectedLanguage);
      const translationData = {
        item_id: item.id,
        language_code: selectedLanguage,
        title: item.title ? translatedContent : null,
        description: item.description && !item.title ? translatedContent : null,
        cells: null,
        updated_at: new Date().toISOString()
      };

      if (existingTranslation?.id) {
        await supabase
          .from('cms_item_translations')
          .update(translationData)
          .eq('id', existingTranslation.id);
      } else {
        await supabase
          .from('cms_item_translations')
          .insert(translationData);
      }

      // Refresh translations
      const { data: updatedTranslations } = await supabase
        .from('cms_item_translations')
        .select('*');
      
      if (updatedTranslations) {
        setTranslations(updatedTranslations);
      }
      
      toast({ title: 'Sukces', description: 'Element został przetłumaczony i zapisany' });
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setAiTranslatingSingle(false);
    }
  };

  // AI translate single section
  const translateSectionWithAI = async (section: CMSSection) => {
    if (!section.title && !section.description && !section.collapsible_header) return;
    
    setAiTranslatingSingle(true);
    try {
      const targetLang = languages.find(l => l.code === selectedLanguage);
      
      // Translate all fields that have content
      const translationResults: { title?: string; description?: string; collapsible_header?: string } = {};
      
      if (section.title) {
        const { data, error } = await supabase.functions.invoke('translate-content', {
          body: {
            content: section.title,
            targetLanguage: targetLang?.name || selectedLanguage,
            sourceLanguage: 'Polish'
          }
        });
        if (error) throw error;
        translationResults.title = data.translated || data.content;
      }
      
      if (section.description) {
        const { data, error } = await supabase.functions.invoke('translate-content', {
          body: {
            content: section.description,
            targetLanguage: targetLang?.name || selectedLanguage,
            sourceLanguage: 'Polish'
          }
        });
        if (error) throw error;
        translationResults.description = data.translated || data.content;
      }
      
      if (section.collapsible_header) {
        const { data, error } = await supabase.functions.invoke('translate-content', {
          body: {
            content: section.collapsible_header,
            targetLanguage: targetLang?.name || selectedLanguage,
            sourceLanguage: 'Polish'
          }
        });
        if (error) throw error;
        translationResults.collapsible_header = data.translated || data.content;
      }
      
      // Save to database
      const existingTranslation = getSectionTranslation(section.id, selectedLanguage);
      const translationData = {
        section_id: section.id,
        language_code: selectedLanguage,
        title: translationResults.title || null,
        description: translationResults.description || null,
        collapsible_header: translationResults.collapsible_header || null,
        updated_at: new Date().toISOString()
      };

      if (existingTranslation?.id) {
        await supabase
          .from('cms_section_translations')
          .update(translationData)
          .eq('id', existingTranslation.id);
      } else {
        await supabase
          .from('cms_section_translations')
          .insert(translationData);
      }

      // Refresh translations
      const { data: updatedTranslations } = await supabase
        .from('cms_section_translations')
        .select('*');
      
      if (updatedTranslations) {
        setSectionTranslations(updatedTranslations);
      }
      
      toast({ title: 'Sukces', description: 'Sekcja została przetłumaczona i zapisana' });
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setAiTranslatingSingle(false);
    }
  };

  // Start background job for all translations
  const startBackgroundTranslation = async () => {
    setAiDialog(false);
    
    await startJob(
      defaultLang,
      selectedLanguage,
      aiTranslateMode,
      'cms',
      selectedPage
    );
  };

  // Stats
  const stats = useMemo(() => {
    const total = filteredItems.filter(item => item.title || item.description).length;
    const translated = filteredItems.filter(item => {
      const t = getTranslation(item.id, selectedLanguage);
      return t?.title || t?.description;
    }).length;
    return { total, translated, percentage: total > 0 ? Math.round((translated / total) * 100) : 0 };
  }, [filteredItems, selectedLanguage, getTranslation]);

  // Count missing translations
  const missingCount = useMemo(() => {
    return filteredItems.filter(item => {
      const t = getTranslation(item.id, selectedLanguage);
      return (item.title || item.description) && (!t?.title && !t?.description);
    }).length;
  }, [filteredItems, selectedLanguage, getTranslation]);

  // Count all translatable items
  const allTranslatableCount = useMemo(() => {
    return filteredItems.filter(item => item.title || item.description).length;
  }, [filteredItems]);

  // Section stats
  const sectionStats = useMemo(() => {
    const total = filteredSections.filter(section => section.title || section.description).length;
    const translated = filteredSections.filter(section => {
      const t = getSectionTranslation(section.id, selectedLanguage);
      return t?.title || t?.description;
    }).length;
    return { total, translated, percentage: total > 0 ? Math.round((translated / total) * 100) : 0 };
  }, [filteredSections, selectedLanguage, getSectionTranslation]);

  // Count missing section translations
  const missingSectionCount = useMemo(() => {
    return filteredSections.filter(section => {
      const t = getSectionTranslation(section.id, selectedLanguage);
      return (section.title || section.description) && (!t?.title && !t?.description);
    }).length;
  }, [filteredSections, selectedLanguage, getSectionTranslation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Ładowanie treści CMS...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Background Job Progress Banner */}
      {activeCMSJob && (
        <Alert className="border-primary/50 bg-primary/5">
          <Loader2 className="w-4 h-4 animate-spin" />
          <AlertDescription className="flex items-center justify-between w-full">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">
                  Tłumaczenie CMS w tle: {activeJob.processed_keys} / {activeJob.total_keys}
                </span>
                <Badge variant="secondary">{progress}%</Badge>
              </div>
              <Progress value={progress} className="h-2 w-full max-w-xs" />
            </div>
            <Button variant="outline" size="sm" onClick={cancelJob}>
              <StopCircle className="w-4 h-4 mr-1" />
              Anuluj
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Job Completed Banner */}
      {activeJob?.job_type === 'cms' && activeJob.status === 'completed' && (
        <Alert className="border-green-500/50 bg-green-500/5">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>
              Tłumaczenie zakończone! Przetłumaczono {activeJob.processed_keys} elementów
              {activeJob.errors > 0 && ` (${activeJob.errors} błędów)`}
            </span>
            <Button variant="ghost" size="sm" onClick={clearJob}>
              <X className="w-4 h-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Job Failed Banner */}
      {activeJob?.job_type === 'cms' && activeJob.status === 'failed' && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>
              Błąd tłumaczenia: {activeJob.error_message || 'Nieznany błąd'}
            </span>
            <Button variant="ghost" size="sm" onClick={clearJob}>
              <X className="w-4 h-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedPage || 'all'} onValueChange={v => setSelectedPage(v === 'all' ? null : v)}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Wszystkie strony" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie strony</SelectItem>
            {pages.map(page => (
              <SelectItem key={page.id} value={page.id}>
                {page.title} ({page.slug})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj treści..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Language flags */}
        <div className="flex items-center gap-1 border rounded-md px-2 py-1">
          {languages.filter(l => l.code !== defaultLang).map(lang => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={`px-2 py-1 rounded text-xl transition-all ${
                selectedLanguage === lang.code 
                  ? 'bg-primary/10 ring-2 ring-primary' 
                  : 'hover:bg-muted'
              }`}
              title={lang.native_name || lang.name}
            >
              {lang.flag_emoji}
            </button>
          ))}
        </div>
        
        <Button 
          onClick={() => setAiDialog(true)}
          disabled={activeCMSJob || jobLoading || allTranslatableCount === 0}
        >
          <Bot className="w-4 h-4 mr-2" />
          Tłumacz z AI
        </Button>
      </div>

      {/* View Mode Toggle + Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <Button 
            variant={viewMode === 'items' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('items')}
          >
            <FileText className="w-4 h-4 mr-1" />
            Elementy ({stats.translated}/{stats.total})
          </Button>
          <Button 
            variant={viewMode === 'sections' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('sections')}
          >
            <LayoutGrid className="w-4 h-4 mr-1" />
            Sekcje ({sectionStats.translated}/{sectionStats.total})
          </Button>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <Checkbox 
            id="only-missing"
            checked={showOnlyMissing}
            onCheckedChange={(checked) => setShowOnlyMissing(checked === true)}
          />
          <Label htmlFor="only-missing" className="text-sm cursor-pointer">
            Tylko nieprzetłumaczone
          </Label>
        </div>
      </div>

      {/* Stats */}
      <Card className="bg-muted/30">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {viewMode === 'items' ? (
                    <><strong>{stats.translated}</strong> / {stats.total} elementów</>
                  ) : (
                    <><strong>{sectionStats.translated}</strong> / {sectionStats.total} sekcji</>
                  )}
                </span>
              </div>
              <Badge variant={(viewMode === 'items' ? stats : sectionStats).percentage === 100 ? 'default' : 'secondary'}>
                {(viewMode === 'items' ? stats : sectionStats).percentage}%
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <Progress value={(viewMode === 'items' ? stats : sectionStats).percentage} className="h-1.5 mt-2" />
        </CardContent>
      </Card>

      {/* Content list */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {viewMode === 'items' ? (
            // Render items
            <>
              {Object.entries(itemsByPage).map(([pageId, pageItems]) => {
                const page = pages.find(p => p.id === pageId);
                
                return (
                  <Card key={pageId}>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {page?.title || 'Strona'}
                        <Badge variant="outline" className="ml-auto">
                          {pageItems.length} elementów
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      <div className="space-y-1">
                        {pageItems.map(item => {
                          const translation = getTranslation(item.id, selectedLanguage);
                          const isExpanded = expandedItems.has(item.id);
                          const isEditing = editingItem === item.id;
                          const hasTranslation = translation?.title || translation?.description;
                          
                          return (
                            <div key={item.id} className="border rounded-md">
                              <Collapsible open={isExpanded} onOpenChange={() => toggleItem(item.id)}>
                                <CollapsibleTrigger className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {item.type}
                                  </Badge>
                                  <span className="flex-1 text-left text-sm truncate">
                                    {item.title || item.description?.substring(0, 50) || 'Bez tytułu'}
                                  </span>
                                  {hasTranslation ? (
                                    <Badge className="bg-green-500/20 text-green-600">
                                      <CheckCircle2 className="w-3 h-3" />
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-yellow-600">
                                      <AlertTriangle className="w-3 h-3" />
                                    </Badge>
                                  )}
                                </CollapsibleTrigger>
                                
                                <CollapsibleContent>
                                  <div className="px-3 pb-3 pt-1 space-y-3 border-t">
                                    {/* Original content */}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                          🇵🇱 Oryginał (Polski)
                                        </Label>
                                        {item.title && (
                                          <p className="text-sm font-medium mt-1">{item.title}</p>
                                        )}
                                        {item.description && (
                                          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                                            {item.description}
                                          </p>
                                        )}
                                      </div>
                                      
                                      {/* Translation */}
                                      <div>
                                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                          {languages.find(l => l.code === selectedLanguage)?.flag_emoji} Tłumaczenie
                                        </Label>
                                        
                                        {isEditing ? (
                                          <div className="space-y-2 mt-1">
                                            {item.title && (
                                              <Input
                                                value={editForm.title}
                                                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                                placeholder="Tytuł..."
                                                className="text-sm"
                                              />
                                            )}
                                            {item.description && (
                                              <Textarea
                                                value={editForm.description}
                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                placeholder="Opis..."
                                                rows={2}
                                                className="text-sm"
                                              />
                                            )}
                                            <div className="flex gap-2">
                                              <Button 
                                                size="sm" 
                                                onClick={() => saveTranslation(item.id)}
                                                disabled={saving}
                                              >
                                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                <span className="ml-1">Zapisz</span>
                                              </Button>
                                              <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => setEditingItem(null)}
                                              >
                                                <X className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="mt-1">
                                            {hasTranslation ? (
                                              <>
                                                {translation?.title && (
                                                  <p className="text-sm font-medium">{translation.title}</p>
                                                )}
                                                {translation?.description && (
                                                  <p className="text-sm text-muted-foreground line-clamp-3">
                                                    {translation.description}
                                                  </p>
                                                )}
                                              </>
                                            ) : (
                                              <p className="text-sm text-muted-foreground italic">
                                                Brak tłumaczenia
                                              </p>
                                            )}
                                            <div className="flex gap-2 mt-2">
                                              <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => startEditing(item)}
                                              >
                                                <Pencil className="w-3 h-3 mr-1" />
                                                Edytuj
                                              </Button>
                                              <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => translateSingleWithAI(item)}
                                                disabled={aiTranslatingSingle || activeCMSJob}
                                              >
                                                {aiTranslatingSingle ? (
                                                  <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                  <Bot className="w-3 h-3 mr-1" />
                                                )}
                                                AI
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {filteredItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Languages className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Brak elementów do tłumaczenia</p>
                </div>
              )}
            </>
          ) : (
            // Render sections
            <>
              {Object.entries(sectionsByPage).map(([pageId, pageSections]) => {
                const page = pages.find(p => p.id === pageId);
                
                return (
                  <Card key={pageId}>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4" />
                        {page?.title || 'Strona'}
                        <Badge variant="outline" className="ml-auto">
                          {pageSections.length} sekcji
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      <div className="space-y-1">
                        {pageSections.map(section => {
                          const translation = getSectionTranslation(section.id, selectedLanguage);
                          const isExpanded = expandedSections.has(section.id);
                          const isEditing = editingSection === section.id;
                          const hasTranslation = translation?.title || translation?.description || translation?.collapsible_header;
                          
                          return (
                            <div key={section.id} className="border rounded-md">
                              <Collapsible open={isExpanded} onOpenChange={() => toggleSection(section.id)}>
                                <CollapsibleTrigger className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {section.section_type || 'sekcja'}
                                  </Badge>
                                  <span className="flex-1 text-left text-sm truncate">
                                    {section.title || section.collapsible_header || section.description?.substring(0, 50) || 'Bez tytułu'}
                                  </span>
                                  {hasTranslation ? (
                                    <Badge className="bg-green-500/20 text-green-600">
                                      <CheckCircle2 className="w-3 h-3" />
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-yellow-600">
                                      <AlertTriangle className="w-3 h-3" />
                                    </Badge>
                                  )}
                                </CollapsibleTrigger>
                                
                                <CollapsibleContent>
                                  <div className="px-3 pb-3 pt-1 space-y-3 border-t">
                                    {/* Original content */}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                          🇵🇱 Oryginał (Polski)
                                        </Label>
                                        {section.title && (
                                          <div className="mt-1">
                                            <span className="text-xs text-muted-foreground">Tytuł:</span>
                                            <p className="text-sm font-medium">{section.title}</p>
                                          </div>
                                        )}
                                        {section.description && (
                                          <div className="mt-1">
                                            <span className="text-xs text-muted-foreground">Opis:</span>
                                            <p className="text-sm text-muted-foreground line-clamp-3">
                                              {section.description}
                                            </p>
                                          </div>
                                        )}
                                        {section.collapsible_header && (
                                          <div className="mt-1">
                                            <span className="text-xs text-muted-foreground">Nagłówek:</span>
                                            <p className="text-sm">{section.collapsible_header}</p>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Translation */}
                                      <div>
                                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                          {languages.find(l => l.code === selectedLanguage)?.flag_emoji} Tłumaczenie
                                        </Label>
                                        
                                        {isEditing ? (
                                          <div className="space-y-2 mt-1">
                                            {section.title && (
                                              <div>
                                                <span className="text-xs text-muted-foreground">Tytuł:</span>
                                                <Input
                                                  value={editForm.title}
                                                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                                  placeholder="Tytuł..."
                                                  className="text-sm"
                                                />
                                              </div>
                                            )}
                                            {section.description && (
                                              <div>
                                                <span className="text-xs text-muted-foreground">Opis:</span>
                                                <Textarea
                                                  value={editForm.description}
                                                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                  placeholder="Opis..."
                                                  rows={2}
                                                  className="text-sm"
                                                />
                                              </div>
                                            )}
                                            {section.collapsible_header && (
                                              <div>
                                                <span className="text-xs text-muted-foreground">Nagłówek:</span>
                                                <Input
                                                  value={editForm.collapsible_header || ''}
                                                  onChange={e => setEditForm({ ...editForm, collapsible_header: e.target.value })}
                                                  placeholder="Nagłówek..."
                                                  className="text-sm"
                                                />
                                              </div>
                                            )}
                                            <div className="flex gap-2">
                                              <Button 
                                                size="sm" 
                                                onClick={() => saveSectionTranslation(section.id)}
                                                disabled={saving}
                                              >
                                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                <span className="ml-1">Zapisz</span>
                                              </Button>
                                              <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => setEditingSection(null)}
                                              >
                                                <X className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="mt-1">
                                            {hasTranslation ? (
                                              <>
                                                {translation?.title && (
                                                  <div className="mt-1">
                                                    <span className="text-xs text-muted-foreground">Tytuł:</span>
                                                    <p className="text-sm font-medium">{translation.title}</p>
                                                  </div>
                                                )}
                                                {translation?.description && (
                                                  <div className="mt-1">
                                                    <span className="text-xs text-muted-foreground">Opis:</span>
                                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                                      {translation.description}
                                                    </p>
                                                  </div>
                                                )}
                                                {translation?.collapsible_header && (
                                                  <div className="mt-1">
                                                    <span className="text-xs text-muted-foreground">Nagłówek:</span>
                                                    <p className="text-sm">{translation.collapsible_header}</p>
                                                  </div>
                                                )}
                                              </>
                                            ) : (
                                              <p className="text-sm text-muted-foreground italic">
                                                Brak tłumaczenia
                                              </p>
                                            )}
                                            <div className="flex gap-2 mt-2">
                                              <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => startEditingSection(section)}
                                              >
                                                <Pencil className="w-3 h-3 mr-1" />
                                                Edytuj
                                              </Button>
                                              <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => translateSectionWithAI(section)}
                                                disabled={aiTranslatingSingle || activeCMSJob}
                                              >
                                                {aiTranslatingSingle ? (
                                                  <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                  <Bot className="w-3 h-3 mr-1" />
                                                )}
                                                AI
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {filteredSections.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <LayoutGrid className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Brak sekcji do tłumaczenia</p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* AI Translate All Dialog */}
      <Dialog open={aiDialog} onOpenChange={setAiDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Automatyczne tłumaczenie AI
            </DialogTitle>
            <DialogDescription>
              Przetłumacz wszystkie brakujące treści CMS do języka {languages.find(l => l.code === selectedLanguage)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Mode selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tryb tłumaczenia</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAiTranslateMode('missing')}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    aiTranslateMode === 'missing'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium text-sm">Tylko brakujące</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Tłumaczy tylko treści bez tłumaczenia
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAiTranslateMode('all')}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    aiTranslateMode === 'all'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium text-sm">Wszystkie treści</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Nadpisuje istniejące tłumaczenia
                  </div>
                </button>
              </div>
            </div>

            {/* Alert when all items are already translated */}
            {aiTranslateMode === 'missing' && missingCount === 0 && missingSectionCount === 0 && (allTranslatableCount > 0 || sectionStats.total > 0) && (
              <Alert className="border-yellow-500/50 bg-yellow-500/5">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-sm">
                  Wszystkie treści mają już tłumaczenia. Wybierz tryb <strong>"Wszystkie treści"</strong> aby przetłumaczyć je ponownie.
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-muted/50 p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Informacje:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                <li>Tłumaczenie wykorzystuje AI (Google Gemini)</li>
                <li>Proces działa w tle - możesz zamknąć to okno</li>
                <li>Postęp jest zapisywany - po odświeżeniu strony tłumaczenie będzie kontynuowane</li>
                <li>Tłumaczenie obejmuje zarówno elementy jak i sekcje CMS</li>
                {aiTranslateMode === 'missing' 
                  ? <li>Tylko treści bez istniejącego tłumaczenia będą przetłumaczone</li>
                  : <li className="text-yellow-600">Istniejące tłumaczenia zostaną nadpisane!</li>
                }
              </ul>
            </div>
            
            {/* Combined stats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {aiTranslateMode === 'missing' ? 'Elementy do przetłumaczenia:' : 'Wszystkie elementy:'}
                </span>
                <Badge variant={aiTranslateMode === 'missing' && missingCount === 0 ? 'secondary' : 'default'}>
                  {aiTranslateMode === 'missing' ? missingCount : allTranslatableCount}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  {aiTranslateMode === 'missing' ? 'Sekcje do przetłumaczenia:' : 'Wszystkie sekcje:'}
                </span>
                <Badge variant={aiTranslateMode === 'missing' && missingSectionCount === 0 ? 'secondary' : 'default'}>
                  {aiTranslateMode === 'missing' ? missingSectionCount : sectionStats.total}
                </Badge>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm font-medium">Łącznie:</span>
                <Badge variant={aiTranslateMode === 'missing' && (missingCount + missingSectionCount) === 0 ? 'destructive' : 'secondary'}>
                  {aiTranslateMode === 'missing' 
                    ? missingCount + missingSectionCount 
                    : allTranslatableCount + sectionStats.total}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialog(false)}>
              Anuluj
            </Button>
            <Button 
              onClick={startBackgroundTranslation} 
              disabled={jobLoading || (aiTranslateMode === 'missing' ? (missingCount + missingSectionCount) === 0 : (allTranslatableCount + sectionStats.total) === 0)}
            >
              {jobLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uruchamianie...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  Rozpocznij w tle
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CMSContentTranslation;
