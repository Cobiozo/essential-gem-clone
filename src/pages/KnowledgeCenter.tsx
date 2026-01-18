import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Search, Download, ExternalLink, Copy, FileText, File, 
  Archive, Link as LinkIcon, FileSpreadsheet, Star, Sparkles,
  RefreshCw, Filter, X, Share2, Clock, LayoutGrid, List, Tag
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  KnowledgeResource, ResourceType,
  RESOURCE_TYPE_LABELS, RESOURCE_CATEGORIES 
} from '@/types/knowledge';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';

const RESOURCE_ICONS: Record<ResourceType, React.ReactNode> = {
  pdf: <FileText className="h-5 w-5 text-red-500" />,
  doc: <File className="h-5 w-5 text-blue-500" />,
  zip: <Archive className="h-5 w-5 text-yellow-600" />,
  form: <FileSpreadsheet className="h-5 w-5 text-green-500" />,
  link: <LinkIcon className="h-5 w-5 text-purple-500" />,
  page: <ExternalLink className="h-5 w-5 text-cyan-500" />,
  image: <Star className="h-5 w-5 text-pink-500" />
};

export default function KnowledgeCenter() {
  const { user } = useAuth();
  const [resources, setResources] = useState<KnowledgeResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'grouped'>('list');
  const [siteLogo, setSiteLogo] = useState<string>(newPureLifeLogo);

  useEffect(() => {
    fetchResources();
    fetchSiteLogo();
  }, []);

  const fetchSiteLogo = async () => {
    const { data } = await supabase
      .from('system_texts')
      .select('content')
      .eq('type', 'site_logo')
      .eq('is_active', true)
      .maybeSingle();
    if (data?.content) {
      setSiteLogo(data.content);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('knowledge_resources')
      .select('*')
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('position', { ascending: true });
    
    if (error) {
      toast.error('Błąd pobierania zasobów');
      console.error(error);
    } else {
      setResources((data || []) as KnowledgeResource[]);
    }
    setLoading(false);
  };

  // Get download endpoint URL for a resource
  const getDownloadUrl = (resourceId: string): string => {
    return `https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/download-resource?id=${resourceId}`;
  };

  // Check if resource has valid downloadable URL
  const hasValidDownloadUrl = (resource: KnowledgeResource): boolean => {
    return Boolean(resource.source_url && resource.source_url.trim() !== '');
  };

  const handleOpenLink = (resource: KnowledgeResource) => {
    // Increment download count
    supabase
      .from('knowledge_resources')
      .update({ download_count: resource.download_count + 1 })
      .eq('id', resource.id);
    window.open(resource.source_url || '', '_blank');
  };

  const handleCopyLink = (resource: KnowledgeResource) => {
    if (resource.source_url) {
      navigator.clipboard.writeText(resource.source_url);
      toast.success('Link skopiowany do schowka');
    }
  };

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    const matchesType = filterType === 'all' || r.resource_type === filterType;
    const matchesTag = filterTag === 'all' || r.tags?.includes(filterTag);
    return matchesSearch && matchesCategory && matchesType && matchesTag;
  });

  const featuredResources = filteredResources.filter(r => r.is_featured);
  const regularResources = filteredResources.filter(r => !r.is_featured);

  // Get unique tags from all resources
  const allTags = [...new Set(resources.flatMap(r => r.tags || []))].sort();

  // Group resources by category
  const groupedByCategory = regularResources.reduce((acc, r) => {
    const category = r.category || 'Inne';
    if (!acc[category]) acc[category] = [];
    acc[category].push(r);
    return acc;
  }, {} as Record<string, KnowledgeResource[]>);

  // Group resources by tag
  const groupedByTag = regularResources.reduce((acc, r) => {
    (r.tags || ['Bez tagów']).forEach(tag => {
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(r);
    });
    return acc;
  }, {} as Record<string, KnowledgeResource[]>);

  const handleShare = (resource: KnowledgeResource) => {
    if (resource.source_url) {
      const shareText = `Sprawdź ten materiał: ${resource.title}`;
      if (navigator.share) {
        navigator.share({
          title: resource.title,
          text: shareText,
          url: resource.source_url
        }).catch(() => {
          // Fallback to copy
          navigator.clipboard.writeText(resource.source_url || '');
          toast.success('Link skopiowany do schowka');
        });
      } else {
        navigator.clipboard.writeText(resource.source_url);
        toast.success('Link skopiowany do schowka');
      }
    }
  };

  const hasAnyAction = (resource: KnowledgeResource) => {
    return resource.allow_copy_link || resource.allow_download || resource.allow_share || resource.allow_click_redirect;
  };

  const handleClickRedirect = (resource: KnowledgeResource) => {
    if (resource.click_redirect_url) {
      // Internal link (starts with /)
      if (resource.click_redirect_url.startsWith('/')) {
        window.location.href = resource.click_redirect_url;
      } else {
        // External link
        window.open(resource.click_redirect_url, '_blank');
      }
    }
  };

  const getActionButtons = (resource: KnowledgeResource) => {
    const isLink = resource.source_type === 'link' || resource.resource_type === 'link' || resource.resource_type === 'page';
    const canDownload = resource.allow_download && hasValidDownloadUrl(resource);
    
    // No actions enabled - show "coming soon" message
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
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleCopyLink(resource)}
            title="Kopiuj link"
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
        {resource.allow_share && hasValidDownloadUrl(resource) && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleShare(resource)}
            title="Udostępnij"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        )}
        {resource.allow_click_redirect && resource.click_redirect_url && (
          <Button 
            variant="outline"
            size="sm"
            onClick={() => handleClickRedirect(resource)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Przejdź
          </Button>
        )}
        {/* Download - real <a> link for files, button for external links */}
        {canDownload && (
          isLink ? (
            <Button 
              onClick={() => handleOpenLink(resource)}
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Otwórz
            </Button>
          ) : (
            <a
              href={getDownloadUrl(resource.id)}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
            >
              <Download className="h-4 w-4" />
              Pobierz
            </a>
          )
        )}
      </div>
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setFilterType('all');
    setFilterTag('all');
  };

  const hasActiveFilters = searchTerm || filterCategory !== 'all' || filterType !== 'all' || filterTag !== 'all';

  // Render resource card (reusable for grid/list views)
  const renderResourceCard = (resource: KnowledgeResource, isGrid: boolean = false) => (
    <Card key={resource.id} className={`hover:shadow-md transition-shadow ${isGrid ? 'h-full' : ''}`}>
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
                {resource.tags?.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] bg-muted">
                    {tag}
                  </Badge>
                ))}
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
    <div className="min-h-screen bg-background">
      <Header siteLogo={siteLogo} />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Biblioteka</h1>
          <p className="text-muted-foreground">
            Dokumenty, materiały i narzędzia do Twojej dyspozycji
          </p>
        </div>

        {/* Search & Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj zasobów..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Kategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie kategorie</SelectItem>
                  {RESOURCE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie typy</SelectItem>
                  {Object.entries(RESOURCE_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {allTags.length > 0 && (
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie tagi</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {/* View mode toggle */}
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <span className="text-sm text-muted-foreground">Widok:</span>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'grid' | 'grouped')}>
                <TabsList className="h-8">
                  <TabsTrigger value="list" className="h-6 px-2">
                    <List className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="grid" className="h-6 px-2">
                    <LayoutGrid className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="grouped" className="h-6 px-2">
                    <Tag className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Ładowanie zasobów...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Brak zasobów</h3>
              <p className="text-muted-foreground">
                {hasActiveFilters 
                  ? 'Nie znaleziono zasobów pasujących do kryteriów wyszukiwania.' 
                  : 'Brak dostępnych zasobów dla Twojej roli.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Wyczyść filtry
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Featured Resources */}
            {featuredResources.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  Polecane
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {featuredResources.map(resource => (
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
                              {resource.is_updated && <Badge className="bg-purple-500/20 text-purple-700 text-[10px]">Zaktualizowany</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {resource.description || 'Brak opisu'}
                            </p>
                            {getActionButtons(resource)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Resources - Different views */}
            {regularResources.length > 0 && (
              <div>
                {featuredResources.length > 0 && (
                  <h2 className="text-lg font-semibold mb-3">Wszystkie zasoby</h2>
                )}
                
                {/* List View */}
                {viewMode === 'list' && (
                  <div className="space-y-3">
                    {regularResources.map(resource => renderResourceCard(resource, false))}
                  </div>
                )}

                {/* Grid View */}
                {viewMode === 'grid' && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {regularResources.map(resource => renderResourceCard(resource, true))}
                  </div>
                )}

                {/* Grouped View */}
                {viewMode === 'grouped' && (
                  <div className="space-y-6">
                    {Object.entries(groupedByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryResources]) => (
                      <div key={category}>
                        <h3 className="text-md font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                          <Tag className="h-4 w-4" />
                          {category} ({categoryResources.length})
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {categoryResources.map(resource => renderResourceCard(resource, true))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
