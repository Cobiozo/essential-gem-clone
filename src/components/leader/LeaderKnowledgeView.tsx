import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Library, Search, Loader2, FileText, ExternalLink, File, Archive,
  Link as LinkIcon, FileSpreadsheet, Star, X, Download, Copy, Share2,
  Clock, LayoutGrid, List, Tag, Image
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  KnowledgeResource, ResourceType,
  RESOURCE_TYPE_LABELS, DOCUMENT_CATEGORIES, GRAPHICS_CATEGORIES
} from '@/types/knowledge';
import { GraphicsCard } from '@/components/share/GraphicsCard';
import { SocialShareDialog } from '@/components/share/SocialShareDialog';

const RESOURCE_ICONS: Record<ResourceType, React.ReactNode> = {
  pdf: <FileText className="h-5 w-5 text-red-500" />,
  doc: <File className="h-5 w-5 text-blue-500" />,
  zip: <Archive className="h-5 w-5 text-yellow-600" />,
  form: <FileSpreadsheet className="h-5 w-5 text-green-500" />,
  link: <LinkIcon className="h-5 w-5 text-purple-500" />,
  page: <ExternalLink className="h-5 w-5 text-cyan-500" />,
  image: <Image className="h-5 w-5 text-pink-500" />
};

const LeaderKnowledgeView: React.FC = () => {
  // Document state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'grouped'>('list');

  // Graphics state
  const [graphicsSearchTerm, setGraphicsSearchTerm] = useState('');
  const [graphicsCategory, setGraphicsCategory] = useState('all');
  const [graphicsSortBy, setGraphicsSortBy] = useState('newest');
  const [selectedGraphic, setSelectedGraphic] = useState<KnowledgeResource | null>(null);

  // Main tab
  const [mainTab, setMainTab] = useState<'documents' | 'graphics'>('documents');

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['leader-knowledge-team-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_resources')
        .select('*')
        .eq('status', 'active')
        .eq('visible_to_everyone', false)
        .order('is_featured', { ascending: false })
        .order('position', { ascending: true });
      if (error) throw error;
      return (data || []) as KnowledgeResource[];
    },
  });

  // Split into documents and graphics
  const documentResources = resources.filter(r => r.resource_type !== 'image');
  const graphicsResources = resources.filter(r => r.resource_type === 'image');

  // --- Document helpers ---
  const getDownloadUrl = (resourceId: string): string =>
    `https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/download-resource?id=${resourceId}`;

  const hasValidDownloadUrl = (resource: KnowledgeResource): boolean =>
    Boolean(resource.source_url && resource.source_url.trim() !== '');

  const handleOpenLink = (resource: KnowledgeResource) => {
    supabase.from('knowledge_resources').update({ download_count: resource.download_count + 1 }).eq('id', resource.id);
    window.open(resource.source_url || '', '_blank');
  };

  const handleCopyLink = (resource: KnowledgeResource) => {
    if (resource.source_url) {
      navigator.clipboard.writeText(resource.source_url);
      toast.success('Link skopiowany do schowka');
    }
  };

  const handleShare = (resource: KnowledgeResource) => {
    if (resource.source_url) {
      const shareText = `Sprawdź ten materiał: ${resource.title}`;
      if (navigator.share) {
        navigator.share({ title: resource.title, text: shareText, url: resource.source_url }).catch(() => {
          navigator.clipboard.writeText(resource.source_url || '');
          toast.success('Link skopiowany do schowka');
        });
      } else {
        navigator.clipboard.writeText(resource.source_url);
        toast.success('Link skopiowany do schowka');
      }
    }
  };

  const handleClickRedirect = (resource: KnowledgeResource) => {
    if (resource.click_redirect_url) {
      if (resource.click_redirect_url.startsWith('/')) {
        window.location.href = resource.click_redirect_url;
      } else {
        window.open(resource.click_redirect_url, '_blank');
      }
    }
  };

  const hasAnyAction = (resource: KnowledgeResource) =>
    resource.allow_copy_link || resource.allow_download || resource.allow_share || resource.allow_click_redirect;

  const getActionButtons = (resource: KnowledgeResource) => {
    const isLink = resource.source_type === 'link' || resource.resource_type === 'link' || resource.resource_type === 'page';
    const canDownload = resource.allow_download && hasValidDownloadUrl(resource);

    if (!hasAnyAction(resource)) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs">Dostępne wkrótce</span>
        </Badge>
      );
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {resource.allow_copy_link && hasValidDownloadUrl(resource) && (
          <Button variant="ghost" size="icon" onClick={() => handleCopyLink(resource)} title="Kopiuj link">
            <Copy className="h-4 w-4" />
          </Button>
        )}
        {resource.allow_share && hasValidDownloadUrl(resource) && (
          <Button variant="ghost" size="icon" onClick={() => handleShare(resource)} title="Udostępnij">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
        {resource.allow_click_redirect && resource.click_redirect_url && (
          <Button variant="outline" size="sm" onClick={() => handleClickRedirect(resource)}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Przejdź
          </Button>
        )}
        {canDownload && (
          isLink ? (
            <Button onClick={() => handleOpenLink(resource)} size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Otwórz
            </Button>
          ) : (
            <a
              href={getDownloadUrl(resource.id)}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
            >
              <Download className="h-4 w-4" />
              Pobierz
            </a>
          )
        )}
      </div>
    );
  };

  // --- Filtering ---
  const filteredDocuments = documentResources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    const matchesType = filterType === 'all' || r.resource_type === filterType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const filteredGraphics = graphicsResources
    .filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(graphicsSearchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(graphicsSearchTerm.toLowerCase());
      const matchesCategory = graphicsCategory === 'all' || r.category === graphicsCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (graphicsSortBy) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'alphabetical': return a.title.localeCompare(b.title);
        case 'most_downloaded': return (b.download_count || 0) - (a.download_count || 0);
        default: return 0;
      }
    });

  const featuredDocuments = filteredDocuments.filter(r => r.is_featured);
  const regularDocuments = filteredDocuments.filter(r => !r.is_featured);

  const groupedByCategory = regularDocuments.reduce((acc, r) => {
    const category = r.category || 'Inne';
    if (!acc[category]) acc[category] = [];
    acc[category].push(r);
    return acc;
  }, {} as Record<string, KnowledgeResource[]>);

  const hasActiveFilters = searchTerm || filterCategory !== 'all' || filterType !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setFilterType('all');
  };

  const renderResourceCard = (resource: KnowledgeResource, isGrid: boolean = false) => (
    <Card key={resource.id} className={`hover:shadow-md transition-all duration-300 ${isGrid ? 'h-full' : ''}`}>
      <CardContent className="p-4">
        <div className={isGrid ? "flex flex-col h-full" : "flex flex-col sm:flex-row sm:items-center gap-4"}>
          <div className={`flex items-start gap-3 ${isGrid ? 'mb-3' : 'flex-1 min-w-0'}`}>
            <div className="p-2 rounded-lg bg-muted shrink-0">
              {RESOURCE_ICONS[resource.resource_type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold truncate">{resource.title}</h3>
                {resource.is_new && <Badge className="bg-blue-500/20 text-blue-700 text-[10px]">Nowy</Badge>}
                {resource.is_updated && <Badge className="bg-purple-500/20 text-purple-700 text-[10px]">Zaktualizowany</Badge>}
              </div>
              <p className={`text-sm text-muted-foreground ${isGrid ? 'line-clamp-2' : 'line-clamp-1'} mb-2`}>
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
          <div className={`flex items-center gap-2 ${isGrid ? 'mt-auto pt-3' : 'sm:shrink-0'}`}>
            {getActionButtons(resource)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Library className="h-5 w-5 text-primary" />
          Baza wiedzy
        </CardTitle>
        <CardDescription>Zasoby wiedzy widoczne tylko dla Twojego zespołu.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'documents' | 'graphics')} className="w-full">
          <TabsList className="mb-6 w-full sm:w-auto">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Dokumenty edukacyjne
            </TabsTrigger>
            <TabsTrigger value="graphics" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Grafiki
              {graphicsResources.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{graphicsResources.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardContent className="pt-4">
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
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Typ" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie typy</SelectItem>
                      {Object.entries(RESOURCE_TYPE_LABELS)
                        .filter(([key]) => key !== 'image')
                        .map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="icon" onClick={clearFilters}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-sm text-muted-foreground">Widok:</span>
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'grid' | 'grouped')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="list" className="h-6 px-2"><List className="h-4 w-4" /></TabsTrigger>
                      <TabsTrigger value="grid" className="h-6 px-2"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                      <TabsTrigger value="grouped" className="h-6 px-2"><Tag className="h-4 w-4" /></TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Ładowanie dokumentów...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Brak dokumentów</h3>
                  <p className="text-muted-foreground">
                    {hasActiveFilters
                      ? 'Nie znaleziono dokumentów pasujących do kryteriów wyszukiwania.'
                      : 'Brak dokumentów widocznych dla Twojego zespołu.'}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters} className="mt-4">Wyczyść filtry</Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {featuredDocuments.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      Polecane
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {featuredDocuments.map(resource => (
                        <Card key={resource.id} className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-900">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-background">
                                {RESOURCE_ICONS[resource.resource_type]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="font-semibold truncate">{resource.title}</h3>
                                  {resource.is_new && <Badge className="bg-blue-500/20 text-blue-700 text-[10px]">Nowy</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                  {resource.description || 'Brak opisu'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  {getActionButtons(resource)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {viewMode === 'list' && (
                  <div className="space-y-3">
                    {regularDocuments.map(resource => renderResourceCard(resource))}
                  </div>
                )}
                {viewMode === 'grid' && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {regularDocuments.map(resource => renderResourceCard(resource, true))}
                  </div>
                )}
                {viewMode === 'grouped' && (
                  <div className="space-y-8">
                    {Object.entries(groupedByCategory).map(([category, items]) => (
                      <div key={category}>
                        <h2 className="text-lg font-semibold mb-3">{category}</h2>
                        <div className="space-y-3">
                          {items.map(resource => renderResourceCard(resource))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Graphics Tab */}
          <TabsContent value="graphics" className="space-y-6">
            <Card>
              <CardContent className="pt-4">
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
                  <Select value={graphicsSortBy} onValueChange={setGraphicsSortBy}>
                    <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Sortowanie" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Najnowsze</SelectItem>
                      <SelectItem value="oldest">Najstarsze</SelectItem>
                      <SelectItem value="alphabetical">Alfabetycznie</SelectItem>
                      <SelectItem value="most_downloaded">Najpopularniejsze</SelectItem>
                    </SelectContent>
                  </Select>
                  {(graphicsSearchTerm || graphicsCategory !== 'all' || graphicsSortBy !== 'newest') && (
                    <Button variant="ghost" size="icon" onClick={() => { setGraphicsSearchTerm(''); setGraphicsCategory('all'); setGraphicsSortBy('newest'); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Ładowanie grafik...</p>
              </div>
            ) : filteredGraphics.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Brak grafik</h3>
                  <p className="text-muted-foreground">
                    {graphicsSearchTerm || graphicsCategory !== 'all' || graphicsSortBy !== 'newest'
                      ? 'Nie znaleziono grafik pasujących do kryteriów wyszukiwania.'
                      : 'Brak grafik widocznych dla Twojego zespołu.'}
                  </p>
                  {(graphicsSearchTerm || graphicsCategory !== 'all' || graphicsSortBy !== 'newest') && (
                    <Button variant="outline" onClick={() => { setGraphicsSearchTerm(''); setGraphicsCategory('all'); setGraphicsSortBy('newest'); }} className="mt-4">
                      Wyczyść filtry
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {filteredGraphics.map(graphic => (
                  <GraphicsCard key={graphic.id} resource={graphic} onClick={() => setSelectedGraphic(graphic)} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

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
