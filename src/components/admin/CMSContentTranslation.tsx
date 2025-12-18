import React, { useState, useEffect, useMemo } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { I18nLanguage } from '@/hooks/useTranslations';
import { 
  Search, Bot, Loader2, ChevronRight, ChevronDown, FileText, 
  Pencil, Save, X, RefreshCw, Languages, AlertTriangle
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

interface CMSItemTranslation {
  item_id: string;
  language_code: string;
  title: string | null;
  description: string | null;
  cells: any;
}

export const CMSContentTranslation: React.FC<CMSContentTranslationProps> = ({
  languages,
  defaultLang
}) => {
  const { toast } = useToast();
  
  // State
  const [pages, setPages] = useState<Page[]>([]);
  const [items, setItems] = useState<CMSItem[]>([]);
  const [translations, setTranslations] = useState<CMSItemTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(defaultLang === 'pl' ? 'de' : 'pl');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Edit state
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; description: string }>({ title: '', description: '' });
  const [saving, setSaving] = useState(false);
  
  // AI Translation state
  const [aiDialog, setAiDialog] = useState(false);
  const [aiTranslating, setAiTranslating] = useState(false);
  const [aiProgress, setAiProgress] = useState({ current: 0, total: 0 });

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

      // Fetch existing translations from cms_item_translations table (if exists)
      // For now, we'll store translations in a separate structure
      // This could be extended to use a dedicated table

    } catch (error: any) {
      toast({ title: 'Błąd', description: 'Nie udało się załadować danych', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Filter items by page and search
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
    
    return result;
  }, [items, selectedPage, searchQuery]);

  // Group items by page
  const itemsByPage = useMemo(() => {
    const groups: Record<string, CMSItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.page_id]) groups[item.page_id] = [];
      groups[item.page_id].push(item);
    }
    return groups;
  }, [filteredItems]);

  // Get translation for item (mock - would come from DB)
  const getTranslation = (itemId: string, langCode: string): CMSItemTranslation | null => {
    return translations.find(t => t.item_id === itemId && t.language_code === langCode) || null;
  };

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

  // Start editing
  const startEditing = (item: CMSItem) => {
    const translation = getTranslation(item.id, selectedLanguage);
    setEditingItem(item.id);
    setEditForm({
      title: translation?.title || '',
      description: translation?.description || ''
    });
  };

  // Save translation
  const saveTranslation = async (itemId: string) => {
    setSaving(true);
    try {
      // Update local state
      const newTranslations = translations.filter(
        t => !(t.item_id === itemId && t.language_code === selectedLanguage)
      );
      newTranslations.push({
        item_id: itemId,
        language_code: selectedLanguage,
        title: editForm.title || null,
        description: editForm.description || null,
        cells: null
      });
      setTranslations(newTranslations);
      
      // TODO: Save to database when cms_item_translations table is created
      toast({ title: 'Zapisano', description: 'Tłumaczenie zostało zapisane lokalnie' });
      setEditingItem(null);
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // AI translate single item
  const translateWithAI = async (item: CMSItem) => {
    if (!item.title && !item.description) return;
    
    setAiTranslating(true);
    try {
      const textsToTranslate: string[] = [];
      if (item.title) textsToTranslate.push(item.title);
      if (item.description) textsToTranslate.push(item.description);
      
      const targetLang = languages.find(l => l.code === selectedLanguage);
      
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: {
          texts: textsToTranslate,
          targetLanguage: targetLang?.name || selectedLanguage,
          sourceLanguage: 'Polish'
        }
      });
      
      if (error) throw error;
      
      const translated = data.translations || [];
      let titleIndex = 0;
      
      const newTranslations = translations.filter(
        t => !(t.item_id === item.id && t.language_code === selectedLanguage)
      );
      
      newTranslations.push({
        item_id: item.id,
        language_code: selectedLanguage,
        title: item.title ? translated[titleIndex++] : null,
        description: item.description ? translated[titleIndex] : null,
        cells: null
      });
      
      setTranslations(newTranslations);
      toast({ title: 'Sukces', description: 'Element został przetłumaczony' });
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setAiTranslating(false);
    }
  };

  // AI translate all items on current page
  const translateAllWithAI = async () => {
    const itemsToTranslate = filteredItems.filter(item => {
      const translation = getTranslation(item.id, selectedLanguage);
      return (item.title || item.description) && (!translation?.title && !translation?.description);
    });
    
    if (itemsToTranslate.length === 0) {
      toast({ title: 'Info', description: 'Wszystkie elementy mają już tłumaczenia' });
      return;
    }
    
    setAiTranslating(true);
    setAiProgress({ current: 0, total: itemsToTranslate.length });
    
    try {
      const targetLang = languages.find(l => l.code === selectedLanguage);
      
      for (let i = 0; i < itemsToTranslate.length; i++) {
        const item = itemsToTranslate[i];
        setAiProgress({ current: i + 1, total: itemsToTranslate.length });
        
        const textsToTranslate: string[] = [];
        if (item.title) textsToTranslate.push(item.title);
        if (item.description) textsToTranslate.push(item.description);
        
        if (textsToTranslate.length === 0) continue;
        
        const { data, error } = await supabase.functions.invoke('translate-content', {
          body: {
            texts: textsToTranslate,
            targetLanguage: targetLang?.name || selectedLanguage,
            sourceLanguage: 'Polish'
          }
        });
        
        if (error) continue;
        
        const translated = data.translations || [];
        let titleIndex = 0;
        
        setTranslations(prev => {
          const newTranslations = prev.filter(
            t => !(t.item_id === item.id && t.language_code === selectedLanguage)
          );
          newTranslations.push({
            item_id: item.id,
            language_code: selectedLanguage,
            title: item.title ? translated[titleIndex++] : null,
            description: item.description ? translated[titleIndex] : null,
            cells: null
          });
          return newTranslations;
        });
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      toast({ 
        title: 'Sukces', 
        description: `Przetłumaczono ${itemsToTranslate.length} elementów` 
      });
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } finally {
      setAiTranslating(false);
      setAiProgress({ current: 0, total: 0 });
      setAiDialog(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = filteredItems.filter(item => item.title || item.description).length;
    const translated = filteredItems.filter(item => {
      const t = getTranslation(item.id, selectedLanguage);
      return t?.title || t?.description;
    }).length;
    return { total, translated, percentage: total > 0 ? Math.round((translated / total) * 100) : 0 };
  }, [filteredItems, selectedLanguage, translations]);

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
          disabled={aiTranslating || filteredItems.length === 0}
        >
          <Bot className="w-4 h-4 mr-2" />
          Tłumacz z AI
        </Button>
      </div>

      {/* Stats */}
      <Card className="bg-muted/30">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>{stats.translated}</strong> / {stats.total} elementów przetłumaczonych
                </span>
              </div>
              <Badge variant={stats.percentage === 100 ? 'default' : 'secondary'}>
                {stats.percentage}%
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <Progress value={stats.percentage} className="h-1.5 mt-2" />
        </CardContent>
      </Card>

      {/* Content list */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
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
                                <Badge className="bg-green-500/20 text-green-600">✓</Badge>
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
                                      <div className="mt-1 p-2 bg-muted rounded text-sm">
                                        <strong>Tytuł:</strong> {item.title}
                                      </div>
                                    )}
                                    {item.description && (
                                      <div className="mt-1 p-2 bg-muted rounded text-sm">
                                        <strong>Opis:</strong> {item.description}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Translation */}
                                  <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                      {languages.find(l => l.code === selectedLanguage)?.flag_emoji} Tłumaczenie ({selectedLanguage.toUpperCase()})
                                    </Label>
                                    
                                    {isEditing ? (
                                      <div className="space-y-2 mt-1">
                                        {item.title && (
                                          <div>
                                            <Label className="text-xs">Tytuł</Label>
                                            <Input
                                              value={editForm.title}
                                              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                              placeholder="Przetłumaczony tytuł"
                                            />
                                          </div>
                                        )}
                                        {item.description && (
                                          <div>
                                            <Label className="text-xs">Opis</Label>
                                            <Textarea
                                              value={editForm.description}
                                              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                              placeholder="Przetłumaczony opis"
                                              rows={3}
                                            />
                                          </div>
                                        )}
                                        <div className="flex gap-2">
                                          <Button size="sm" onClick={() => saveTranslation(item.id)} disabled={saving}>
                                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                            <span className="ml-1">Zapisz</span>
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="mt-1">
                                        {translation?.title && (
                                          <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-sm">
                                            <strong>Tytuł:</strong> {translation.title}
                                          </div>
                                        )}
                                        {translation?.description && (
                                          <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-sm mt-1">
                                            <strong>Opis:</strong> {translation.description}
                                          </div>
                                        )}
                                        {!hasTranslation && (
                                          <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-sm text-muted-foreground italic">
                                            Brak tłumaczenia
                                          </div>
                                        )}
                                        
                                        <div className="flex gap-2 mt-2">
                                          <Button size="sm" variant="outline" onClick={() => startEditing(item)}>
                                            <Pencil className="w-3 h-3 mr-1" />
                                            Edytuj
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => translateWithAI(item)}
                                            disabled={aiTranslating}
                                          >
                                            <Bot className="w-3 h-3 mr-1" />
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
            <div className="text-center py-12 text-muted-foreground">
              <Languages className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Brak elementów do tłumaczenia</p>
              <p className="text-sm mt-1">Wybierz stronę lub zmień kryteria wyszukiwania</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* AI Translation Dialog */}
      <Dialog open={aiDialog} onOpenChange={open => !aiTranslating && setAiDialog(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Automatyczne tłumaczenie treści CMS
            </DialogTitle>
            <DialogDescription>
              Przetłumacz wszystkie brakujące treści na język {languages.find(l => l.code === selectedLanguage)?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm">
                <strong>{stats.total - stats.translated}</strong> elementów do przetłumaczenia
              </p>
            </div>
            
            {aiTranslating && (
              <div className="space-y-2">
                <Progress value={(aiProgress.current / aiProgress.total) * 100} />
                <p className="text-sm text-center text-muted-foreground">
                  {aiProgress.current} / {aiProgress.total} elementów
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialog(false)} disabled={aiTranslating}>
              Anuluj
            </Button>
            <Button onClick={translateAllWithAI} disabled={aiTranslating || stats.total - stats.translated === 0}>
              {aiTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Tłumaczenie...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  Rozpocznij
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
