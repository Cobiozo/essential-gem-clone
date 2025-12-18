import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Trash2, Pencil, Languages, Globe, Search, Download, Upload, 
  Star, ChevronRight, FileJson, AlertTriangle, RefreshCw, Bot, Loader2
} from 'lucide-react';
import { useTranslationsAdmin, I18nLanguage, TranslationsMap, LanguageTranslations } from '@/hooks/useTranslations';

interface TranslationsManagementProps {
  className?: string;
}

export const TranslationsManagement: React.FC<TranslationsManagementProps> = ({ className }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    languages,
    translations,
    namespaces,
    loading,
    refresh,
    createLanguage,
    updateLanguage,
    deleteLanguage,
    setDefaultLanguage,
    upsertTranslation,
    deleteTranslationKey,
    importTranslations,
    exportTranslations,
    exportLanguageJson,
    importLanguageJson,
    getLanguageStats,
    translateLanguageWithAI,
    migrateFromHardcoded
  } = useTranslationsAdmin();

  const [activeTab, setActiveTab] = useState('languages');
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('pl');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Language dialog state
  const [languageDialog, setLanguageDialog] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<I18nLanguage | null>(null);
  const [languageForm, setLanguageForm] = useState({
    code: '',
    name: '',
    native_name: '',
    flag_emoji: '🏳️',
    is_active: true,
    position: 0
  });

  // Translation dialog state
  const [translationDialog, setTranslationDialog] = useState(false);
  const [translationForm, setTranslationForm] = useState({
    namespace: '',
    key: '',
    values: {} as Record<string, string>
  });
  const [editingKey, setEditingKey] = useState<{ namespace: string; key: string } | null>(null);

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'language' | 'key'; item: any } | null>(null);

  // Import dialog
  const [importDialog, setImportDialog] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importLanguageCode, setImportLanguageCode] = useState<string | null>(null);

  // AI Translation state
  const [aiTranslateDialog, setAiTranslateDialog] = useState(false);
  const [aiTranslateTarget, setAiTranslateTarget] = useState<I18nLanguage | null>(null);
  const [aiTranslateSource, setAiTranslateSource] = useState<string>('pl');
  const [aiTranslating, setAiTranslating] = useState(false);
  const [aiProgress, setAiProgress] = useState({ current: 0, total: 0 });

  // Migration state
  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState({ current: 0, total: 0 });

  // Group translations by namespace and key
  const groupedTranslations = useMemo(() => {
    const groups: Record<string, Record<string, Record<string, string>>> = {};
    
    for (const t of translations) {
      if (!groups[t.namespace]) groups[t.namespace] = {};
      if (!groups[t.namespace][t.key]) groups[t.namespace][t.key] = {};
      groups[t.namespace][t.key][t.language_code] = t.value;
    }
    
    return groups;
  }, [translations]);

  // Filter translations by search query
  const filteredKeys = useMemo(() => {
    if (!selectedNamespace || !groupedTranslations[selectedNamespace]) return [];
    
    const keys = Object.keys(groupedTranslations[selectedNamespace]);
    
    if (!searchQuery) return keys;
    
    const query = searchQuery.toLowerCase();
    return keys.filter(key => {
      if (key.toLowerCase().includes(query)) return true;
      const values = groupedTranslations[selectedNamespace][key];
      return Object.values(values).some(v => v.toLowerCase().includes(query));
    });
  }, [selectedNamespace, groupedTranslations, searchQuery]);

  // Namespace key counts
  const namespaceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ns of namespaces) {
      counts[ns] = Object.keys(groupedTranslations[ns] || {}).length;
    }
    return counts;
  }, [namespaces, groupedTranslations]);

  // Get default language
  const defaultLang = useMemo(() => {
    return languages.find(l => l.is_default)?.code || 'pl';
  }, [languages]);

  // Handlers
  const handleSaveLanguage = async () => {
    try {
      if (editingLanguage) {
        await updateLanguage(editingLanguage.id, languageForm);
        toast({ title: 'Sukces', description: 'Język został zaktualizowany' });
      } else {
        await createLanguage(languageForm);
        toast({ title: 'Sukces', description: 'Język został dodany' });
      }
      setLanguageDialog(false);
      resetLanguageForm();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteLanguage = async () => {
    if (!deleteDialog || deleteDialog.type !== 'language') return;
    try {
      await deleteLanguage(deleteDialog.item.id, deleteDialog.item.code);
      toast({ title: 'Sukces', description: 'Język i wszystkie jego tłumaczenia zostały usunięte' });
      setDeleteDialog(null);
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  const handleSetDefault = async (code: string) => {
    try {
      await setDefaultLanguage(code);
      toast({ title: 'Sukces', description: 'Język domyślny został zmieniony' });
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaveTranslation = async () => {
    try {
      for (const [langCode, value] of Object.entries(translationForm.values)) {
        if (value.trim()) {
          await upsertTranslation(
            langCode,
            translationForm.namespace,
            translationForm.key,
            value.trim()
          );
        }
      }
      toast({ title: 'Sukces', description: 'Tłumaczenie zostało zapisane' });
      setTranslationDialog(false);
      resetTranslationForm();
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteKey = async () => {
    if (!deleteDialog || deleteDialog.type !== 'key') return;
    try {
      await deleteTranslationKey(deleteDialog.item.namespace, deleteDialog.item.key);
      toast({ title: 'Sukces', description: 'Klucz został usunięty' });
      setDeleteDialog(null);
    } catch (error: any) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    }
  };

  // Export all translations
  const handleExportAll = () => {
    const data = exportTranslations();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations-all-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Sukces', description: 'Wszystkie tłumaczenia zostały wyeksportowane' });
  };

  // Export single language
  const handleExportLanguage = (code: string) => {
    const data = exportLanguageJson(code);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations-${code}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Sukces', description: `Tłumaczenia dla ${code.toUpperCase()} zostały wyeksportowane` });
  };

  // Import handlers
  const handleImportAll = async () => {
    try {
      const data = JSON.parse(importJson) as TranslationsMap;
      await importTranslations(data);
      toast({ title: 'Sukces', description: 'Tłumaczenia zostały zaimportowane' });
      setImportDialog(false);
      setImportJson('');
      setImportLanguageCode(null);
    } catch (error: any) {
      toast({ title: 'Błąd', description: 'Nieprawidłowy format JSON', variant: 'destructive' });
    }
  };

  const handleImportLanguage = async () => {
    if (!importLanguageCode) return;
    try {
      const data = JSON.parse(importJson) as LanguageTranslations;
      await importLanguageJson(importLanguageCode, data);
      toast({ title: 'Sukces', description: `Tłumaczenia dla ${importLanguageCode.toUpperCase()} zostały zaimportowane` });
      setImportDialog(false);
      setImportJson('');
      setImportLanguageCode(null);
    } catch (error: any) {
      toast({ title: 'Błąd', description: 'Nieprawidłowy format JSON', variant: 'destructive' });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, langCode?: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportJson(content);
      setImportLanguageCode(langCode || null);
      setImportDialog(true);
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // AI Translation
  const handleAiTranslate = async () => {
    if (!aiTranslateTarget) return;
    
    setAiTranslating(true);
    setAiProgress({ current: 0, total: 0 });
    
    try {
      const result = await translateLanguageWithAI(
        aiTranslateSource,
        aiTranslateTarget.code,
        (current, total) => setAiProgress({ current, total })
      );
      
      toast({ 
        title: 'Sukces', 
        description: `Przetłumaczono ${result.translated} z ${result.total} kluczy` 
      });
      setAiTranslateDialog(false);
      setAiTranslateTarget(null);
    } catch (error: any) {
      toast({ 
        title: 'Błąd', 
        description: error.message || 'Wystąpił błąd podczas tłumaczenia', 
        variant: 'destructive' 
      });
    } finally {
      setAiTranslating(false);
    }
  };

  // Handle migration from hardcoded translations
  const handleMigrate = async () => {
    setMigrating(true);
    setMigrationProgress({ current: 0, total: 0 });
    
    try {
      const result = await migrateFromHardcoded(
        (current, total) => setMigrationProgress({ current, total })
      );
      toast({ 
        title: 'Sukces', 
        description: `Zmigrowano ${result.migrated} tłumaczeń do bazy danych` 
      });
    } catch (error: any) {
      toast({ 
        title: 'Błąd', 
        description: error.message || 'Wystąpił błąd podczas migracji', 
        variant: 'destructive' 
      });
    } finally {
      setMigrating(false);
    }
  };

  const resetLanguageForm = () => {
    setLanguageForm({
      code: '',
      name: '',
      native_name: '',
      flag_emoji: '🏳️',
      is_active: true,
      position: languages.length
    });
    setEditingLanguage(null);
  };

  const resetTranslationForm = () => {
    setTranslationForm({
      namespace: selectedNamespace || '',
      key: '',
      values: {}
    });
    setEditingKey(null);
  };

  const openEditLanguage = (lang: I18nLanguage) => {
    setEditingLanguage(lang);
    setLanguageForm({
      code: lang.code,
      name: lang.name,
      native_name: lang.native_name || '',
      flag_emoji: lang.flag_emoji,
      is_active: lang.is_active,
      position: lang.position
    });
    setLanguageDialog(true);
  };

  const openEditKey = (namespace: string, key: string) => {
    const values: Record<string, string> = {};
    for (const lang of languages) {
      values[lang.code] = groupedTranslations[namespace]?.[key]?.[lang.code] || '';
    }
    setEditingKey({ namespace, key });
    setTranslationForm({ namespace, key, values });
    setTranslationDialog(true);
  };

  const openAddKey = () => {
    const values: Record<string, string> = {};
    for (const lang of languages) {
      values[lang.code] = '';
    }
    setTranslationForm({
      namespace: selectedNamespace || 'common',
      key: '',
      values
    });
    setTranslationDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Ładowanie tłumaczeń...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => handleFileUpload(e)}
      />
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Languages className="w-5 h-5" />
                Moduł tłumaczeń (i18n)
              </CardTitle>
              <CardDescription>
                Zarządzaj językami i tłumaczeniami aplikacji
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportAll}>
                <Download className="w-4 h-4 mr-2" />
                Eksport wszystkich
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setImportLanguageCode(null); setImportDialog(true); }}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button 
                variant={translations.length === 0 ? "default" : "outline"}
                size="sm" 
                onClick={handleMigrate}
                disabled={migrating}
              >
                {migrating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {migrationProgress.current}/{migrationProgress.total}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {translations.length === 0 ? 'Załaduj tłumaczenia' : 'Synchronizuj z kodem'}
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="languages">
                <Globe className="w-4 h-4 mr-2" />
                Języki ({languages.length})
              </TabsTrigger>
              <TabsTrigger value="translations">
                <FileJson className="w-4 h-4 mr-2" />
                Tłumaczenia ({translations.length})
              </TabsTrigger>
            </TabsList>

            {/* Languages Tab */}
            <TabsContent value="languages">
              <div className="space-y-4">
                <Button onClick={() => { resetLanguageForm(); setLanguageDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj język
                </Button>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {languages.map(lang => {
                    const stats = getLanguageStats(lang.code, defaultLang);
                    const isDefault = lang.is_default;
                    
                    return (
                      <Card key={lang.id} className={`relative ${!lang.is_active ? 'opacity-60' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{lang.flag_emoji}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{lang.name}</span>
                                  <Badge variant="outline" className="text-xs">{lang.code.toUpperCase()}</Badge>
                                </div>
                                {lang.native_name && (
                                  <span className="text-sm text-muted-foreground">{lang.native_name}</span>
                                )}
                              </div>
                            </div>
                            {isDefault && (
                              <Badge className="bg-yellow-500/20 text-yellow-600">
                                <Star className="w-3 h-3 mr-1" />
                                Domyślny
                              </Badge>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Przetłumaczono</span>
                              <span className="font-medium">{stats.translated} / {stats.total} kluczy</span>
                            </div>
                            <Progress value={stats.percentage} className="h-2" />
                            <div className="text-right text-xs text-muted-foreground">
                              {stats.percentage}% kompletne
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleExportLanguage(lang.code)}>
                              <Download className="w-3 h-3 mr-1" />
                              JSON
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setImportLanguageCode(lang.code);
                                setImportDialog(true);
                              }}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Import
                            </Button>
                            {!isDefault && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setAiTranslateTarget(lang);
                                  setAiTranslateDialog(true);
                                }}
                              >
                                <Bot className="w-3 h-3 mr-1" />
                                AI
                              </Button>
                            )}
                          </div>

                          {/* Edit/Delete */}
                          <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                            {!isDefault && lang.is_active && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleSetDefault(lang.code)}
                                title="Ustaw jako domyślny"
                              >
                                <Star className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => openEditLanguage(lang)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {!isDefault && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setDeleteDialog({ type: 'language', item: lang })}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Translations Tab */}
            <TabsContent value="translations">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Namespace Sidebar */}
                <Card className="lg:w-64 shrink-0">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm">Moduły (Namespace)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-1">
                        {namespaces.map(ns => (
                          <button
                            key={ns}
                            onClick={() => setSelectedNamespace(ns)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                              selectedNamespace === ns 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted'
                            }`}
                          >
                            <span className="truncate">{ns}</span>
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {namespaceCounts[ns] || 0}
                            </Badge>
                          </button>
                        ))}
                        {namespaces.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Brak modułów. Dodaj tłumaczenia aby utworzyć namespace.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Translation Keys */}
                <Card className="flex-1">
                  <CardHeader className="py-3 px-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">
                          {selectedNamespace ? `${selectedNamespace}` : 'Wybierz moduł'}
                        </CardTitle>
                        {selectedNamespace && (
                          <Badge variant="outline">{filteredKeys.length} kluczy</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 sm:w-64">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Szukaj..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-8 h-8"
                          />
                        </div>
                        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {languages.map(lang => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.flag_emoji} {lang.code.toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={openAddKey} disabled={!selectedNamespace}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ScrollArea className="h-[400px]">
                      {selectedNamespace ? (
                        <div className="space-y-1">
                          {filteredKeys.map(key => {
                            const values = groupedTranslations[selectedNamespace][key];
                            const currentValue = values[selectedLanguage] || '';
                            const hasAllTranslations = languages.every(l => values[l.code]);
                            
                            return (
                              <div
                                key={key}
                                className="group flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted cursor-pointer"
                                onClick={() => openEditKey(selectedNamespace, key)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{key}</code>
                                    {!hasAllTranslations && (
                                      <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                                    {currentValue || <span className="italic">Brak tłumaczenia</span>}
                                  </p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteDialog({ type: 'key', item: { namespace: selectedNamespace, key } });
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          {filteredKeys.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak kluczy w tym module'}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                          <ChevronRight className="w-8 h-8 mb-2" />
                          <p>Wybierz moduł z listy po lewej</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Language Dialog */}
      <Dialog open={languageDialog} onOpenChange={setLanguageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLanguage ? 'Edytuj język' : 'Dodaj nowy język'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kod języka</Label>
                <Input
                  value={languageForm.code}
                  onChange={e => setLanguageForm({ ...languageForm, code: e.target.value.toLowerCase() })}
                  placeholder="np. pl, en, de"
                  maxLength={5}
                  disabled={!!editingLanguage}
                />
              </div>
              <div>
                <Label>Flaga (emoji)</Label>
                <Input
                  value={languageForm.flag_emoji}
                  onChange={e => setLanguageForm({ ...languageForm, flag_emoji: e.target.value })}
                  placeholder="🇵🇱"
                />
              </div>
            </div>
            <div>
              <Label>Nazwa (angielska)</Label>
              <Input
                value={languageForm.name}
                onChange={e => setLanguageForm({ ...languageForm, name: e.target.value })}
                placeholder="Polish"
              />
            </div>
            <div>
              <Label>Nazwa natywna</Label>
              <Input
                value={languageForm.native_name}
                onChange={e => setLanguageForm({ ...languageForm, native_name: e.target.value })}
                placeholder="Polski"
              />
            </div>
            <div>
              <Label>Pozycja</Label>
              <Input
                type="number"
                value={languageForm.position}
                onChange={e => setLanguageForm({ ...languageForm, position: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={languageForm.is_active}
                onCheckedChange={checked => setLanguageForm({ ...languageForm, is_active: checked })}
              />
              <Label>Aktywny</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLanguageDialog(false)}>Anuluj</Button>
            <Button onClick={handleSaveLanguage} disabled={!languageForm.code || !languageForm.name}>
              {editingLanguage ? 'Zapisz' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Translation Dialog */}
      <Dialog open={translationDialog} onOpenChange={setTranslationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingKey ? 'Edytuj tłumaczenie' : 'Dodaj nowe tłumaczenie'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Namespace (moduł)</Label>
                <Input
                  value={translationForm.namespace}
                  onChange={e => setTranslationForm({ ...translationForm, namespace: e.target.value })}
                  placeholder="common"
                  disabled={!!editingKey}
                />
              </div>
              <div>
                <Label>Klucz</Label>
                <Input
                  value={translationForm.key}
                  onChange={e => setTranslationForm({ ...translationForm, key: e.target.value })}
                  placeholder="button.save"
                  disabled={!!editingKey}
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <Label>Wartości dla każdego języka</Label>
              {languages.map(lang => (
                <div key={lang.code} className="flex items-start gap-3">
                  <div className="flex items-center gap-2 w-24 shrink-0 pt-2">
                    <span>{lang.flag_emoji}</span>
                    <span className="text-sm font-medium">{lang.code.toUpperCase()}</span>
                    {lang.is_default && <Star className="w-3 h-3 text-yellow-500" />}
                  </div>
                  <Textarea
                    value={translationForm.values[lang.code] || ''}
                    onChange={e => setTranslationForm({
                      ...translationForm,
                      values: { ...translationForm.values, [lang.code]: e.target.value }
                    })}
                    placeholder={`Tłumaczenie (${lang.name})`}
                    rows={2}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTranslationDialog(false)}>Anuluj</Button>
            <Button 
              onClick={handleSaveTranslation} 
              disabled={!translationForm.namespace || !translationForm.key}
            >
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Potwierdź usunięcie
            </DialogTitle>
            <DialogDescription>
              {deleteDialog?.type === 'language' 
                ? `Czy na pewno chcesz usunąć język "${deleteDialog.item.name}"? Wszystkie tłumaczenia dla tego języka zostaną usunięte.`
                : `Czy na pewno chcesz usunąć klucz "${deleteDialog?.item?.key}" ze wszystkich języków?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Anuluj</Button>
            <Button 
              variant="destructive" 
              onClick={deleteDialog?.type === 'language' ? handleDeleteLanguage : handleDeleteKey}
            >
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {importLanguageCode 
                ? `Importuj tłumaczenia dla ${importLanguageCode.toUpperCase()}`
                : 'Importuj tłumaczenia'
              }
            </DialogTitle>
            <DialogDescription>
              {importLanguageCode 
                ? 'Wklej JSON z tłumaczeniami w formacie: {"namespace": {"key": "value"}}'
                : 'Wklej JSON z tłumaczeniami w formacie: {"lang": {"namespace": {"key": "value"}}}'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              placeholder={importLanguageCode 
                ? '{"common": {"hello": "Cześć"}, "nav": {"home": "Start"}}'
                : '{"pl": {"common": {"hello": "Cześć"}}, "en": {"common": {"hello": "Hello"}}}'
              }
              rows={12}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialog(false); setImportJson(''); setImportLanguageCode(null); }}>
              Anuluj
            </Button>
            <Button 
              onClick={importLanguageCode ? handleImportLanguage : handleImportAll} 
              disabled={!importJson.trim()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Importuj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Translation Dialog */}
      <Dialog open={aiTranslateDialog} onOpenChange={(open) => { if (!aiTranslating) setAiTranslateDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Automatyczne tłumaczenie AI
            </DialogTitle>
            <DialogDescription>
              Przetłumacz wszystkie klucze do języka {aiTranslateTarget?.name} ({aiTranslateTarget?.code.toUpperCase()})
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Język źródłowy</Label>
              <Select value={aiTranslateSource} onValueChange={setAiTranslateSource} disabled={aiTranslating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.filter(l => l.code !== aiTranslateTarget?.code).map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag_emoji} {lang.name} ({lang.code.toUpperCase()})
                      {lang.is_default && ' ★'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {aiTranslating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tłumaczenie w toku...</span>
                  <span>{aiProgress.current} / {aiProgress.total}</span>
                </div>
                <Progress value={aiProgress.total > 0 ? (aiProgress.current / aiProgress.total) * 100 : 0} />
              </div>
            )}

            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Uwaga:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Tłumaczenie wykorzystuje AI (Google Gemini)</li>
                <li>Istniejące tłumaczenia zostaną nadpisane</li>
                <li>Proces może potrwać kilka minut</li>
                <li>Zalecane ręczne sprawdzenie wyników</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiTranslateDialog(false)} disabled={aiTranslating}>
              Anuluj
            </Button>
            <Button onClick={handleAiTranslate} disabled={aiTranslating}>
              {aiTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Tłumaczenie...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  Rozpocznij tłumaczenie
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TranslationsManagement;
