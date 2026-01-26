import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Plus, Pencil, Trash2, FileText, Link as LinkIcon, Archive, 
  Download, Star, Sparkles, RefreshCw, Eye, EyeOff, Upload,
  Search, Filter, BarChart3, Copy, Share2, MousePointer, ExternalLink, Loader2,
  X, Check, Images, FileImage
} from 'lucide-react';
import { 
  KnowledgeResource, ResourceType, ResourceStatus,
  RESOURCE_TYPE_LABELS, RESOURCE_STATUS_LABELS, 
  DOCUMENT_CATEGORIES, GRAPHICS_CATEGORIES, RESOURCE_CATEGORIES,
  LANGUAGE_OPTIONS, getLanguageLabel
} from '@/types/knowledge';
import { VisibilityEditor } from '@/components/cms/editors/VisibilityEditor';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { formatFileSize } from '@/lib/storageConfig';

const emptyResource: Partial<KnowledgeResource> = {
  title: '',
  description: '',
  context_of_use: '',
  resource_type: 'pdf',
  source_type: 'file',
  source_url: '',
  category: '',
  tags: [],
  visible_to_clients: false,
  visible_to_partners: false,
  visible_to_specjalista: false,
  visible_to_everyone: false,
  status: 'draft',
  version: '1.0',
  is_featured: false,
  is_new: true,
  is_updated: false,
  work_stage: '',
  allow_copy_link: true,
  allow_download: true,
  allow_share: false,
  allow_click_redirect: false,
  click_redirect_url: '',
  language_code: 'pl'
};

export const KnowledgeResourcesManagement: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [resources, setResources] = useState<KnowledgeResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Partial<KnowledgeResource> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [tagsInput, setTagsInput] = useState('');
  
  // Main tab state for Documents/Graphics
  const [activeTab, setActiveTab] = useState<'documents' | 'graphics'>('documents');
  
  // Bulk upload state
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkCategory, setBulkCategory] = useState<string>('Social media');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; fileName: string }>({ current: 0, total: 0, fileName: '' });
  
  const { uploadFile, isUploading, uploadProgress } = useLocalStorage();

  useEffect(() => {
    fetchResources();
  }, []);

  // Reset category filter when switching tabs
  useEffect(() => {
    setFilterCategory('all');
  }, [activeTab]);

  const fetchResources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('knowledge_resources')
      .select('*')
      .order('position', { ascending: true });
    
    if (error) {
      toast({ title: t('toast.error'), description: t('admin.knowledge.fetchError'), variant: 'destructive' });
      console.error(error);
    } else {
      setResources((data || []) as KnowledgeResource[]);
    }
    setLoading(false);
  };

  // Split resources into documents and graphics
  const documentResources = resources.filter(r => r.resource_type !== 'image');
  const graphicsResources = resources.filter(r => r.resource_type === 'image');

  // Filter documents
  const filteredDocuments = documentResources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    const matchesLanguage = filterLanguage === 'all' || 
      (filterLanguage === 'universal' ? r.language_code === null : r.language_code === filterLanguage);
    return matchesSearch && matchesStatus && matchesCategory && matchesLanguage;
  });

  // Filter graphics (no language filter for graphics)
  const filteredGraphics = graphicsResources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    try {
      const result = await uploadFile(file, { folder: 'knowledge-resources' });
      
      setEditingResource(prev => ({
        ...prev,
        source_url: result.url,
        file_name: result.fileName,
        file_size: result.fileSize
      }));
      
      toast({ title: t('toast.success'), description: `${t('admin.knowledge.fileUploaded')} (${formatFileSize(result.fileSize)})` });
    } catch (error: any) {
      toast({ title: t('toast.error'), description: error.message || t('admin.knowledge.uploadError'), variant: 'destructive' });
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!editingResource?.title) {
      toast({ title: t('toast.error'), description: t('admin.knowledge.titleRequired'), variant: 'destructive' });
      return;
    }

    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(Boolean);
    const resourceData = {
      ...editingResource,
      tags
    };

    if (editingResource.id) {
      const { error } = await supabase
        .from('knowledge_resources')
        .update(resourceData as any)
        .eq('id', editingResource.id);
      
      if (error) {
        toast({ title: t('toast.error'), description: t('admin.knowledge.updateError'), variant: 'destructive' });
        console.error(error);
      } else {
        toast({ title: t('toast.success'), description: t('admin.knowledge.resourceUpdated') });
        setDialogOpen(false);
        fetchResources();
      }
    } else {
      const { error } = await supabase
        .from('knowledge_resources')
        .insert([{
          title: resourceData.title || '',
          description: resourceData.description,
          context_of_use: resourceData.context_of_use,
          resource_type: (resourceData.resource_type || 'pdf') as any,
          source_type: resourceData.source_type || 'file',
          source_url: resourceData.source_url,
          file_name: resourceData.file_name,
          file_size: resourceData.file_size,
          category: resourceData.category,
          tags: resourceData.tags || [],
          visible_to_clients: resourceData.visible_to_clients || false,
          visible_to_partners: resourceData.visible_to_partners || false,
          visible_to_specjalista: resourceData.visible_to_specjalista || false,
          visible_to_everyone: resourceData.visible_to_everyone || false,
          status: resourceData.status || 'draft',
          version: resourceData.version || '1.0',
          is_featured: resourceData.is_featured || false,
          is_new: resourceData.is_new || true,
          is_updated: resourceData.is_updated || false,
          work_stage: resourceData.work_stage,
          position: resources.length,
          allow_copy_link: resourceData.allow_copy_link ?? true,
          allow_download: resourceData.allow_download ?? true,
          allow_share: resourceData.allow_share ?? false,
          allow_click_redirect: resourceData.allow_click_redirect ?? false,
          click_redirect_url: resourceData.click_redirect_url || null,
          language_code: resourceData.language_code || 'pl'
        }]);
      
      if (error) {
        toast({ title: t('toast.error'), description: t('admin.knowledge.createError'), variant: 'destructive' });
        console.error(error);
      } else {
        toast({ title: t('toast.success'), description: t('admin.knowledge.resourceCreated') });
        setDialogOpen(false);
        fetchResources();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.knowledge.confirmDelete'))) return;
    
    const { error } = await supabase
      .from('knowledge_resources')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast({ title: t('toast.error'), description: t('admin.knowledge.deleteError'), variant: 'destructive' });
      console.error(error);
    } else {
      toast({ title: t('toast.success'), description: t('admin.knowledge.resourceDeleted') });
      fetchResources();
    }
  };

  const openEditDialog = (resource?: KnowledgeResource, isGraphic?: boolean) => {
    if (resource) {
      setEditingResource(resource);
      setTagsInput(resource.tags?.join(', ') || '');
    } else {
      setEditingResource({ 
        ...emptyResource,
        resource_type: isGraphic ? 'image' : 'pdf'
      });
      setTagsInput('');
    }
    setDialogOpen(true);
  };

  const getStatusBadge = (status: ResourceStatus) => {
    const colors: Record<ResourceStatus, string> = {
      active: 'bg-green-500/20 text-green-700',
      draft: 'bg-yellow-500/20 text-yellow-700',
      archived: 'bg-gray-500/20 text-gray-700'
    };
    return <Badge className={colors[status]}>{RESOURCE_STATUS_LABELS[status]}</Badge>;
  };

  const getTypeBadge = (type: ResourceType) => {
    return <Badge variant="outline">{RESOURCE_TYPE_LABELS[type]}</Badge>;
  };

  // Handle bulk file selection
  const handleBulkFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast({ title: t('toast.warning'), description: 'Tylko pliki graficzne są akceptowane', variant: 'destructive' });
    }
    setBulkFiles(prev => [...prev, ...imageFiles]);
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    
    setBulkUploading(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      setBulkProgress({ current: i + 1, total: bulkFiles.length, fileName: file.name });
      
      try {
        const result = await uploadFile(file, { folder: 'knowledge-resources' });
        
        // Create database record for each file
        const { error } = await supabase
          .from('knowledge_resources')
          .insert([{
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for title
            description: '',
            resource_type: 'image' as any,
            source_type: 'file',
            source_url: result.url,
            file_name: result.fileName,
            file_size: result.fileSize,
            category: bulkCategory,
            tags: [],
            visible_to_clients: false,
            visible_to_partners: true,
            visible_to_specjalista: true,
            visible_to_everyone: false,
            status: 'active',
            version: '1.0',
            is_featured: false,
            is_new: true,
            is_updated: false,
            position: resources.length + i,
            allow_copy_link: true,
            allow_download: true,
            allow_share: true,
            allow_click_redirect: false
          }]);
        
        if (error) {
          console.error('Error inserting resource:', error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error: any) {
        console.error('Error uploading file:', error);
        errorCount++;
      }
    }
    
    setBulkUploading(false);
    setBulkProgress({ current: 0, total: 0, fileName: '' });
    setBulkFiles([]);
    setBulkUploadOpen(false);
    fetchResources();
    
    if (successCount > 0) {
      toast({ 
        title: t('toast.success'), 
        description: `Dodano ${successCount} grafik${errorCount > 0 ? `, ${errorCount} błędów` : ''}` 
      });
    } else if (errorCount > 0) {
      toast({ title: t('toast.error'), description: `Wystąpiło ${errorCount} błędów`, variant: 'destructive' });
    }
  };

  // Remove file from bulk list
  const removeBulkFile = (index: number) => {
    setBulkFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Render resource card
  const renderResourceCard = (resource: KnowledgeResource) => (
    <Card key={resource.id} className="hover:shadow-md transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold truncate">{resource.title}</h3>
              {resource.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
              {resource.is_new && <Badge className="bg-blue-500/20 text-blue-700">{t('admin.knowledge.badgeNew')}</Badge>}
              {resource.is_updated && <Badge className="bg-purple-500/20 text-purple-700">{t('admin.knowledge.badgeUpdated')}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
              {resource.description || t('admin.knowledge.noDescription')}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {getTypeBadge(resource.resource_type)}
              {getStatusBadge(resource.status)}
              {resource.category && <Badge variant="secondary">{resource.category}</Badge>}
              {resource.resource_type !== 'image' && (
                <Badge variant="outline" className="text-[10px]">
                  {getLanguageLabel(resource.language_code)}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Download className="h-3 w-3" />
                {resource.download_count}
              </span>
              <span className="text-xs text-muted-foreground">
                v{resource.version}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => openEditDialog(resource)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(resource.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render filters
  const renderFilters = (showLanguageFilter: boolean) => (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.knowledge.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="active">{t('common.active')}</SelectItem>
              <SelectItem value="draft">{t('admin.knowledge.statusDraft')}</SelectItem>
              <SelectItem value="archived">{t('admin.knowledge.statusArchived')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('admin.knowledge.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.knowledge.allCategories')}</SelectItem>
              {(activeTab === 'graphics' ? GRAPHICS_CATEGORIES : DOCUMENT_CATEGORIES).map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showLanguageFilter && (
            <Select value={filterLanguage} onValueChange={setFilterLanguage}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Język" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie języki</SelectItem>
                <SelectItem value="universal">🌐 Uniwersalne</SelectItem>
                {LANGUAGE_OPTIONS.filter(l => l.code !== 'all').map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">{t('admin.knowledge.library')}</h2>
        <div className="flex gap-2">
          {activeTab === 'graphics' && (
            <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
              <Images className="h-4 w-4 mr-2" />
              Dodaj wiele grafik
            </Button>
          )}
          <Button onClick={() => openEditDialog(undefined, activeTab === 'graphics')}>
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === 'graphics' ? 'Dodaj grafikę' : 'Dodaj dokument'}
          </Button>
        </div>
      </div>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkUploadOpen} onOpenChange={(open) => {
        if (!bulkUploading) {
          setBulkUploadOpen(open);
          if (!open) {
            setBulkFiles([]);
          }
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              Masowe dodawanie grafik
            </DialogTitle>
            <DialogDescription>
              Wybierz wiele plików graficznych jednocześnie. Zostaną automatycznie dodane do biblioteki.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Category selector */}
            <div className="space-y-2">
              <Label>Kategoria dla wszystkich grafik</Label>
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRAPHICS_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* File input */}
            <div className="space-y-2">
              <Label>Wybierz pliki</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBulkFilesSelect}
                  className="hidden"
                  id="bulk-file-input"
                  disabled={bulkUploading}
                />
                <label htmlFor="bulk-file-input" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Kliknij aby wybrać pliki lub przeciągnij je tutaj
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, GIF, WebP
                  </p>
                </label>
              </div>
            </div>
            
            {/* Selected files list */}
            {bulkFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Wybrane pliki ({bulkFiles.length})</Label>
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {bulkFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={file.name}
                          className="h-10 w-10 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                        {!bulkUploading && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => removeBulkFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {/* Upload progress */}
            {bulkUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Przesyłanie: {bulkProgress.fileName}</span>
                  <span>{bulkProgress.current} / {bulkProgress.total}</span>
                </div>
                <Progress value={(bulkProgress.current / bulkProgress.total) * 100} />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setBulkUploadOpen(false)}
              disabled={bulkUploading}
            >
              Anuluj
            </Button>
            <Button 
              onClick={handleBulkUpload}
              disabled={bulkFiles.length === 0 || bulkUploading}
            >
              {bulkUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Przesyłanie...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Dodaj {bulkFiles.length} {bulkFiles.length === 1 ? 'grafikę' : 'grafik'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Tabs: Documents / Graphics */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'documents' | 'graphics')}>
        <TabsList className="mb-4">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Dokumenty ({filteredDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="graphics" className="flex items-center gap-2">
            <Images className="h-4 w-4" />
            Grafiki ({filteredGraphics.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          {renderFilters(true)}
          
          {loading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t('admin.knowledge.noResources')}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map(resource => renderResourceCard(resource))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="graphics" className="space-y-4">
          {renderFilters(false)}
          
          {loading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : filteredGraphics.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t('admin.knowledge.noResources')}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredGraphics.map(resource => renderResourceCard(resource))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingResource?.id ? t('admin.knowledge.editResource') : t('admin.knowledge.newResource')}
            </DialogTitle>
          </DialogHeader>
          
          {editingResource && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">{t('admin.knowledge.tabBasic')}</TabsTrigger>
                <TabsTrigger value="source">{t('admin.knowledge.tabSource')}</TabsTrigger>
                <TabsTrigger value="visibility">{t('admin.knowledge.tabVisibility')}</TabsTrigger>
                <TabsTrigger value="actions">{t('admin.knowledge.tabActions')}</TabsTrigger>
                <TabsTrigger value="badges">{t('admin.knowledge.tabBadges')}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{t('admin.knowledge.titleLabel')} *</Label>
                  <Input
                    value={editingResource.title || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                    placeholder={t('admin.knowledge.titlePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.knowledge.descriptionLabel')}</Label>
                  <Textarea
                    value={editingResource.description || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                    placeholder={t('admin.knowledge.descriptionPlaceholder')}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.knowledge.contextOfUse')}</Label>
                  <Textarea
                    value={editingResource.context_of_use || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, context_of_use: e.target.value })}
                    placeholder={t('admin.knowledge.contextPlaceholder')}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('admin.knowledge.resourceType')}</Label>
                    <Select
                      value={editingResource.resource_type}
                      onValueChange={(v) => setEditingResource({ ...editingResource, resource_type: v as ResourceType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RESOURCE_TYPE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin.knowledge.category')}</Label>
                    <Select
                      value={editingResource.category || ''}
                      onValueChange={(v) => setEditingResource({ ...editingResource, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('admin.knowledge.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(editingResource.resource_type === 'image' ? GRAPHICS_CATEGORIES : DOCUMENT_CATEGORIES).map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {editingResource.resource_type !== 'image' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Język dokumentu</Label>
                      <Select
                        value={editingResource.language_code || 'all'}
                        onValueChange={(v) => setEditingResource({ 
                          ...editingResource, 
                          language_code: v === 'all' ? null : v 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz język" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGE_OPTIONS.map(lang => (
                            <SelectItem key={lang.code} value={lang.code}>{lang.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t('admin.knowledge.tagsLabel')}</Label>
                  <Input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder={t('admin.knowledge.tagsPlaceholder')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('common.status')}</Label>
                    <Select
                      value={editingResource.status}
                      onValueChange={(v) => setEditingResource({ ...editingResource, status: v as ResourceStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RESOURCE_STATUS_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin.knowledge.version')}</Label>
                    <Input
                      value={editingResource.version || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, version: e.target.value })}
                      placeholder={t('admin.knowledge.versionPlaceholder')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.knowledge.workStage')}</Label>
                  <Input
                    value={editingResource.work_stage || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, work_stage: e.target.value })}
                    placeholder={t('admin.knowledge.workStagePlaceholder')}
                  />
                </div>
              </TabsContent>

              <TabsContent value="source" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{t('admin.knowledge.sourceType')}</Label>
                  <Select
                    value={editingResource.source_type}
                    onValueChange={(v) => setEditingResource({ ...editingResource, source_type: v as 'file' | 'link' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="file">{t('admin.knowledge.sourceFile')}</SelectItem>
                      <SelectItem value="link">{t('admin.knowledge.sourceLink')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingResource.source_type !== 'link' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('admin.knowledge.uploadFile')}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                          disabled={isUploading}
                        />
                      </div>
                      {isUploading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('common.uploading')} {uploadProgress}%
                        </div>
                      )}
                    </div>
                    {editingResource.source_url && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {editingResource.file_name || t('admin.knowledge.file')}
                            </p>
                            {editingResource.file_size && (
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(editingResource.file_size)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>{t('admin.knowledge.resourceUrl')}</Label>
                    <Input
                      value={editingResource.source_url || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, source_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="visibility" className="mt-4">
                <VisibilityEditor
                  value={{
                    visible_to_clients: editingResource.visible_to_clients || false,
                    visible_to_partners: editingResource.visible_to_partners || false,
                    visible_to_specjalista: editingResource.visible_to_specjalista || false,
                    visible_to_everyone: editingResource.visible_to_everyone || false,
                  }}
                  onChange={(settings) => setEditingResource({ ...editingResource, ...settings })}
                />
              </TabsContent>

              <TabsContent value="actions" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    <Label>{t('admin.knowledge.showCopyLink')}</Label>
                  </div>
                  <Switch
                    checked={editingResource.allow_copy_link ?? true}
                    onCheckedChange={(v) => setEditingResource({ ...editingResource, allow_copy_link: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <Label>{t('admin.knowledge.showDownload')}</Label>
                  </div>
                  <Switch
                    checked={editingResource.allow_download ?? true}
                    onCheckedChange={(v) => setEditingResource({ ...editingResource, allow_download: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    <Label>{t('admin.knowledge.showShare')}</Label>
                  </div>
                  <Switch
                    checked={editingResource.allow_share ?? false}
                    onCheckedChange={(v) => setEditingResource({ ...editingResource, allow_share: v })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MousePointer className="h-4 w-4" />
                      <Label>{t('admin.knowledge.redirectOnClick')}</Label>
                    </div>
                    <Switch
                      checked={editingResource.allow_click_redirect ?? false}
                      onCheckedChange={(v) => setEditingResource({ ...editingResource, allow_click_redirect: v })}
                    />
                  </div>
                  {editingResource.allow_click_redirect && (
                    <Input
                      value={editingResource.click_redirect_url || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, click_redirect_url: e.target.value })}
                      placeholder="https://..."
                      className="mt-2"
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="badges" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <Label>{t('admin.knowledge.featured')}</Label>
                  </div>
                  <Switch
                    checked={editingResource.is_featured ?? false}
                    onCheckedChange={(v) => setEditingResource({ ...editingResource, is_featured: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <Label>{t('admin.knowledge.markAsNew')}</Label>
                  </div>
                  <Switch
                    checked={editingResource.is_new ?? false}
                    onCheckedChange={(v) => setEditingResource({ ...editingResource, is_new: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-purple-500" />
                    <Label>{t('admin.knowledge.markAsUpdated')}</Label>
                  </div>
                  <Switch
                    checked={editingResource.is_updated ?? false}
                    onCheckedChange={(v) => setEditingResource({ ...editingResource, is_updated: v })}
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.uploading')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
