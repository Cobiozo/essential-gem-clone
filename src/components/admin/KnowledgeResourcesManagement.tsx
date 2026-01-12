import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, Pencil, Trash2, FileText, Link as LinkIcon, Archive, 
  Download, Star, Sparkles, RefreshCw, Eye, EyeOff, Upload,
  Search, Filter, BarChart3, Copy, Share2, MousePointer, ExternalLink, Loader2
} from 'lucide-react';
import { 
  KnowledgeResource, ResourceType, ResourceStatus,
  RESOURCE_TYPE_LABELS, RESOURCE_STATUS_LABELS, RESOURCE_CATEGORIES 
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
  click_redirect_url: ''
};

export const KnowledgeResourcesManagement: React.FC = () => {
  const [resources, setResources] = useState<KnowledgeResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Partial<KnowledgeResource> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [tagsInput, setTagsInput] = useState('');
  
  const { uploadFile, isUploading, uploadProgress } = useLocalStorage();

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('knowledge_resources')
      .select('*')
      .order('position', { ascending: true });
    
    if (error) {
      toast.error('Błąd pobierania zasobów');
      console.error(error);
    } else {
      setResources((data || []) as KnowledgeResource[]);
    }
    setLoading(false);
  };

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
      
      toast.success(`Plik przesłany (${formatFileSize(result.fileSize)})`);
    } catch (error: any) {
      toast.error(error.message || 'Błąd przesyłania pliku');
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!editingResource?.title) {
      toast.error('Tytuł jest wymagany');
      return;
    }

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const resourceData = {
      ...editingResource,
      tags
    };

    if (editingResource.id) {
      const { error } = await supabase
        .from('knowledge_resources')
        .update(resourceData)
        .eq('id', editingResource.id);
      
      if (error) {
        toast.error('Błąd aktualizacji');
        console.error(error);
      } else {
        toast.success('Zasób zaktualizowany');
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
          resource_type: resourceData.resource_type || 'pdf',
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
          click_redirect_url: resourceData.click_redirect_url || null
        }]);
      
      if (error) {
        toast.error('Błąd tworzenia');
        console.error(error);
      } else {
        toast.success('Zasób utworzony');
        setDialogOpen(false);
        fetchResources();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten zasób?')) return;
    
    const { error } = await supabase
      .from('knowledge_resources')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Błąd usuwania');
      console.error(error);
    } else {
      toast.success('Zasób usunięty');
      fetchResources();
    }
  };

  const openEditDialog = (resource?: KnowledgeResource) => {
    if (resource) {
      setEditingResource(resource);
      setTagsInput(resource.tags?.join(', ') || '');
    } else {
      setEditingResource({ ...emptyResource });
      setTagsInput('');
    }
    setDialogOpen(true);
  };

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Biblioteka</h2>
        <Button onClick={() => openEditDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj zasób
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj zasobów..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="active">Aktywne</SelectItem>
                <SelectItem value="draft">Robocze</SelectItem>
                <SelectItem value="archived">Archiwalne</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {RESOURCE_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resources List */}
      {loading ? (
        <div className="text-center py-8">Ładowanie...</div>
      ) : filteredResources.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Brak zasobów do wyświetlenia
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredResources.map(resource => (
            <Card key={resource.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold truncate">{resource.title}</h3>
                      {resource.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                      {resource.is_new && <Badge className="bg-blue-500/20 text-blue-700">Nowy</Badge>}
                      {resource.is_updated && <Badge className="bg-purple-500/20 text-purple-700">Zaktualizowany</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                      {resource.description || 'Brak opisu'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(resource.resource_type)}
                      {getStatusBadge(resource.status)}
                      {resource.category && <Badge variant="secondary">{resource.category}</Badge>}
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
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingResource?.id ? 'Edytuj zasób' : 'Nowy zasób'}
            </DialogTitle>
          </DialogHeader>
          
          {editingResource && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Podstawowe</TabsTrigger>
                <TabsTrigger value="source">Źródło</TabsTrigger>
                <TabsTrigger value="visibility">Widoczność</TabsTrigger>
                <TabsTrigger value="actions">Akcje</TabsTrigger>
                <TabsTrigger value="badges">Oznaczenia</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Tytuł *</Label>
                  <Input
                    value={editingResource.title || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                    placeholder="Nazwa zasobu"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Opis</Label>
                  <Textarea
                    value={editingResource.description || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                    placeholder="Krótki opis zasobu"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kontekst użycia</Label>
                  <Textarea
                    value={editingResource.context_of_use || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, context_of_use: e.target.value })}
                    placeholder="Kiedy i jak używać tego zasobu"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Typ zasobu</Label>
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
                    <Label>Kategoria</Label>
                    <Select
                      value={editingResource.category || ''}
                      onValueChange={(v) => setEditingResource({ ...editingResource, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz kategorię" />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOURCE_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tagi (oddzielone przecinkami)</Label>
                  <Input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="np. onboarding, partner, cennik"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
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
                    <Label>Wersja</Label>
                    <Input
                      value={editingResource.version || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, version: e.target.value })}
                      placeholder="np. 1.0, 2.1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Etap pracy (opcjonalny)</Label>
                  <Input
                    value={editingResource.work_stage || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, work_stage: e.target.value })}
                    placeholder="np. początkujący, zaawansowany"
                  />
                </div>
              </TabsContent>

              <TabsContent value="source" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Typ źródła</Label>
                  <Select
                    value={editingResource.source_type}
                    onValueChange={(v) => setEditingResource({ ...editingResource, source_type: v as 'file' | 'link' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="file">Plik</SelectItem>
                      <SelectItem value="link">Link zewnętrzny</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingResource.source_type !== 'link' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Prześlij plik (max 2GB)</Label>
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
                          Przesyłanie... {uploadProgress}%
                        </div>
                      )}
                    </div>
                    {editingResource.source_url && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {editingResource.file_name || 'Plik'}
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
                    <Label>URL zasobu</Label>
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
                    <Label>Pokaż przycisk kopiowania linku</Label>
                  </div>
                  <Switch
                    checked={editingResource.allow_copy_link ?? true}
                    onCheckedChange={(v) => setEditingResource({ ...editingResource, allow_copy_link: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <Label>Pokaż przycisk pobierania</Label>
                  </div>
                  <Switch
                    checked={editingResource.allow_download ?? true}
                    onCheckedChange={(v) => setEditingResource({ ...editingResource, allow_download: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    <Label>Pokaż przycisk udostępniania</Label>
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
                      <Label>Przekieruj po kliknięciu</Label>
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
                    <Label>Wyróżniony</Label>
                  </div>
                  <Switch
                    checked={editingResource.is_featured ?? false}
                    onCheckedChange={(v) => setEditingResource({ ...editingResource, is_featured: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <Label>Oznacz jako nowy</Label>
                  </div>
                  <Switch
                    checked={editingResource.is_new ?? false}
                    onCheckedChange={(v) => setEditingResource({ ...editingResource, is_new: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-purple-500" />
                    <Label>Oznacz jako zaktualizowany</Label>
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
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Przesyłanie...
                </>
              ) : (
                'Zapisz'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
