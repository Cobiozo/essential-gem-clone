import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Library, Search, Loader2, FileText, ExternalLink, File, Archive,
  Link as LinkIcon, FileSpreadsheet, Star, X, Download, Copy, Share2,
  Clock, LayoutGrid, List, Tag, Image, Plus, Pencil, Trash2, Upload
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  KnowledgeResource, ResourceType,
  RESOURCE_TYPE_LABELS, DOCUMENT_CATEGORIES, GRAPHICS_CATEGORIES
} from '@/types/knowledge';
import { GraphicsCard } from '@/components/share/GraphicsCard';
import { SocialShareDialog } from '@/components/share/SocialShareDialog';
import { useMyTeamName } from '@/hooks/useTeamName';

const RESOURCE_ICONS: Record<ResourceType, React.ReactNode> = {
  pdf: <FileText className="h-5 w-5 text-red-500" />,
  doc: <File className="h-5 w-5 text-blue-500" />,
  zip: <Archive className="h-5 w-5 text-yellow-600" />,
  form: <FileSpreadsheet className="h-5 w-5 text-green-500" />,
  link: <LinkIcon className="h-5 w-5 text-purple-500" />,
  page: <ExternalLink className="h-5 w-5 text-cyan-500" />,
  image: <Image className="h-5 w-5 text-pink-500" />
};

interface ResourceFormData {
  title: string;
  description: string;
  resource_type: ResourceType;
  category: string;
  source_type: 'file' | 'link';
  source_url: string;
  allow_download: boolean;
  allow_copy_link: boolean;
  allow_share: boolean;
}

const defaultFormData: ResourceFormData = {
  title: '',
  description: '',
  resource_type: 'pdf',
  category: '',
  source_type: 'file',
  source_url: '',
  allow_download: true,
  allow_copy_link: true,
  allow_share: true,
};

const LeaderKnowledgeView: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: teamName } = useMyTeamName(user?.id);

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [mainTab, setMainTab] = useState<'documents' | 'graphics'>('documents');
  const [graphicsSearchTerm, setGraphicsSearchTerm] = useState('');
  const [graphicsCategory, setGraphicsCategory] = useState('all');
  const [selectedGraphic, setSelectedGraphic] = useState<KnowledgeResource | null>(null);

  // CRUD dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingResource, setEditingResource] = useState<KnowledgeResource | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>(defaultFormData);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch only leader's own resources
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['leader-knowledge-own-resources', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('knowledge_resources')
        .select('*')
        .eq('created_by', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as KnowledgeResource[];
    },
    enabled: !!user?.id,
  });

  const documentResources = resources.filter(r => r.resource_type !== 'image');
  const graphicsResources = resources.filter(r => r.resource_type === 'image');

  // Upload file to storage
  const uploadToStorage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('knowledge-files').upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('knowledge-files').getPublicUrl(path);
    return urlData.publicUrl;
  };

  // Save resource mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { form: ResourceFormData; file: File | null; editId?: string }) => {
      setUploading(true);
      let sourceUrl = data.form.source_url;

      if (data.form.source_type === 'file' && data.file) {
        sourceUrl = await uploadToStorage(data.file);
      }

      const resourceData = {
        title: data.form.title,
        description: data.form.description || null,
        resource_type: data.form.resource_type,
        category: data.form.category || null,
        source_type: data.form.source_type,
        source_url: sourceUrl || null,
        file_name: data.file?.name || null,
        file_size: data.file?.size || null,
        allow_download: data.form.allow_download,
        allow_copy_link: data.form.allow_copy_link,
        allow_share: data.form.allow_share,
        visible_to_everyone: false,
        status: 'active' as const,
        created_by: user!.id,
      };

      if (data.editId) {
        const { error } = await (supabase as any)
          .from('knowledge_resources')
          .update(resourceData)
          .eq('id', data.editId)
          .eq('created_by', user!.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('knowledge_resources')
          .insert(resourceData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingResource ? 'Zasób zaktualizowany' : 'Zasób dodany');
      queryClient.invalidateQueries({ queryKey: ['leader-knowledge-own-resources'] });
      closeDialog();
    },
    onError: (err: any) => {
      toast.error('Błąd: ' + (err.message || 'Nie udało się zapisać'));
    },
    onSettled: () => setUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('knowledge_resources')
        .update({ status: 'archived' })
        .eq('id', id)
        .eq('created_by', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Zasób usunięty');
      queryClient.invalidateQueries({ queryKey: ['leader-knowledge-own-resources'] });
    },
    onError: () => toast.error('Nie udało się usunąć zasobu'),
  });

  const closeDialog = () => {
    setShowAddDialog(false);
    setEditingResource(null);
    setFormData(defaultFormData);
    setUploadFile(null);
  };

  const openEdit = (resource: KnowledgeResource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description || '',
      resource_type: resource.resource_type,
      category: resource.category || '',
      source_type: resource.source_type,
      source_url: resource.source_url || '',
      allow_download: resource.allow_download,
      allow_copy_link: resource.allow_copy_link,
      allow_share: resource.allow_share,
    });
    setShowAddDialog(true);
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast.error('Podaj tytuł zasobu');
      return;
    }
    if (formData.source_type === 'link' && !formData.source_url.trim()) {
      toast.error('Podaj URL');
      return;
    }
    if (formData.source_type === 'file' && !uploadFile && !editingResource) {
      toast.error('Wybierz plik do przesłania');
      return;
    }
    saveMutation.mutate({
      form: formData,
      file: uploadFile,
      editId: editingResource?.id,
    });
  };

  // Filtering
  const filteredDocuments = documentResources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    const matchesType = filterType === 'all' || r.resource_type === filterType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const filteredGraphics = graphicsResources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(graphicsSearchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(graphicsSearchTerm.toLowerCase());
    const matchesCategory = graphicsCategory === 'all' || r.category === graphicsCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = mainTab === 'documents' ? DOCUMENT_CATEGORIES : GRAPHICS_CATEGORIES;

  const renderResourceCard = (resource: KnowledgeResource) => (
    <Card key={resource.id} className="hover:shadow-md transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-muted shrink-0">
              {RESOURCE_ICONS[resource.resource_type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold truncate">{resource.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                {resource.description || 'Brak opisu'}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {RESOURCE_TYPE_LABELS[resource.resource_type]}
                </Badge>
                {resource.category && (
                  <Badge variant="secondary" className="text-[10px]">
                    {resource.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:shrink-0">
            <Button variant="ghost" size="icon" onClick={() => openEdit(resource)} title="Edytuj">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => {
              if (confirm('Czy na pewno chcesz usunąć ten zasób?')) {
                deleteMutation.mutate(resource.id);
              }
            }} title="Usuń">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5 text-primary" />
              Baza wiedzy {teamName || 'zespołu'}
            </CardTitle>
            <CardDescription>Zasoby udostępnione Twojemu zespołowi. Tylko Twoi członkowie je widzą.</CardDescription>
          </div>
          <Button onClick={() => { setFormData(defaultFormData); setShowAddDialog(true); }} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Dodaj zasób
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'documents' | 'graphics')} className="w-full">
          <TabsList className="mb-6 w-full sm:w-auto">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Dokumenty
              {documentResources.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{documentResources.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="graphics" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Grafiki
              {graphicsResources.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{graphicsResources.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Szukaj dokumentów..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Kategoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie kategorie</SelectItem>
                  {DOCUMENT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Ładowanie...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Brak dokumentów</h3>
                  <p className="text-muted-foreground">Dodaj pierwszy dokument dla swojego zespołu.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredDocuments.map(resource => renderResourceCard(resource))}
              </div>
            )}
          </TabsContent>

          {/* Graphics Tab */}
          <TabsContent value="graphics" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Szukaj grafik..." value={graphicsSearchTerm} onChange={(e) => setGraphicsSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={graphicsCategory} onValueChange={setGraphicsCategory}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Kategoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie kategorie</SelectItem>
                  {GRAPHICS_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              </div>
            ) : filteredGraphics.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Brak grafik</h3>
                  <p className="text-muted-foreground">Dodaj pierwszą grafikę dla zespołu.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {filteredGraphics.map(graphic => (
                  <div key={graphic.id} className="relative group">
                    <GraphicsCard resource={graphic} onClick={() => setSelectedGraphic(graphic)} />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button variant="secondary" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(graphic); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="destructive" size="icon" className="h-7 w-7" onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Usunąć?')) deleteMutation.mutate(graphic.id);
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={showAddDialog || !!editingResource} onOpenChange={(open) => { if (!open) closeDialog(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingResource ? 'Edytuj zasób' : 'Dodaj nowy zasób'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tytuł *</Label>
                <Input value={formData.title} onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="Nazwa zasobu" />
              </div>
              <div>
                <Label>Opis</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} placeholder="Krótki opis..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Typ zasobu</Label>
                  <Select value={formData.resource_type} onValueChange={(v) => setFormData(f => ({ ...f, resource_type: v as ResourceType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(RESOURCE_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kategoria</Label>
                  <Select value={formData.category || 'none'} onValueChange={(v) => setFormData(f => ({ ...f, category: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Brak</SelectItem>
                      {[...DOCUMENT_CATEGORIES, ...GRAPHICS_CATEGORIES].map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Źródło</Label>
                <Tabs value={formData.source_type} onValueChange={(v) => setFormData(f => ({ ...f, source_type: v as 'file' | 'link' }))}>
                  <TabsList className="mb-2">
                    <TabsTrigger value="file"><Upload className="h-4 w-4 mr-1" />Plik</TabsTrigger>
                    <TabsTrigger value="link"><LinkIcon className="h-4 w-4 mr-1" />Link</TabsTrigger>
                  </TabsList>
                </Tabs>
                {formData.source_type === 'file' ? (
                  <div>
                    <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                    {editingResource?.file_name && !uploadFile && (
                      <p className="text-xs text-muted-foreground mt-1">Obecny plik: {editingResource.file_name}</p>
                    )}
                  </div>
                ) : (
                  <Input value={formData.source_url} onChange={(e) => setFormData(f => ({ ...f, source_url: e.target.value }))} placeholder="https://..." />
                )}
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.allow_download} onCheckedChange={(v) => setFormData(f => ({ ...f, allow_download: v }))} />
                  <Label className="text-sm">Pobieranie</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.allow_copy_link} onCheckedChange={(v) => setFormData(f => ({ ...f, allow_copy_link: v }))} />
                  <Label className="text-sm">Kopiuj link</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.allow_share} onCheckedChange={(v) => setFormData(f => ({ ...f, allow_share: v }))} />
                  <Label className="text-sm">Udostępnianie</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Anuluj</Button>
              <Button onClick={handleSave} disabled={uploading}>
                {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingResource ? 'Zapisz zmiany' : 'Dodaj zasób'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SocialShareDialog
          open={!!selectedGraphic}
          onOpenChange={() => setSelectedGraphic(null)}
          imageUrl={selectedGraphic?.source_url || ''}
          title={selectedGraphic?.title || ''}
          resourceId={selectedGraphic?.id || ''}
          allowDownload={selectedGraphic?.allow_download ?? true}
          allowShare={selectedGraphic?.allow_share ?? true}
          allowCopyLink={selectedGraphic?.allow_copy_link ?? true}
        />
      </CardContent>
    </Card>
  );
};

export default LeaderKnowledgeView;
