import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
  RefreshCw, Filter, X, Share2, Clock, LayoutGrid, List, Tag, Image
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  KnowledgeResource, ResourceType,
  RESOURCE_TYPE_LABELS, DOCUMENT_CATEGORIES, GRAPHICS_CATEGORIES 
} from '@/types/knowledge';
import { SocialShareDialog, GraphicsCard } from '@/components/share';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';

const RESOURCE_ICONS: Record<ResourceType, React.ReactNode> = {
  pdf: <FileText className="h-5 w-5 text-red-500" />,
  doc: <File className="h-5 w-5 text-blue-500" />,
  zip: <Archive className="h-5 w-5 text-yellow-600" />,
  form: <FileSpreadsheet className="h-5 w-5 text-green-500" />,
  link: <LinkIcon className="h-5 w-5 text-purple-500" />,
  page: <ExternalLink className="h-5 w-5 text-cyan-500" />,
  image: <Image className="h-5 w-5 text-pink-500" />
};

export default function KnowledgeCenter() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const highlightedResourceId = searchParams.get('highlight');
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [resources, setResources] = useState<KnowledgeResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'grouped'>('list');
  const [documentLanguage, setDocumentLanguage] = useState<string | 'all'>(language);
  const [siteLogo, setSiteLogo] = useState<string>(newPureLifeLogo);
  
  // Main tab - documents or graphics
  const [mainTab, setMainTab] = useState<'documents' | 'graphics'>('documents');
  
  // Graphics specific state
  const [graphicsCategory, setGraphicsCategory] = useState<string>('all');
  const [selectedGraphic, setSelectedGraphic] = useState<KnowledgeResource | null>(null);
  const [graphicsSearchTerm, setGraphicsSearchTerm] = useState('');

  useEffect(() => {
    fetchResources();
    fetchSiteLogo();
  }, []);

  // Scroll to highlighted resource when loaded
  useEffect(() => {
    if (highlightedResourceId && !loading && resources.length > 0) {
      // Determine if it's document or graphic and switch tab if needed
      const resource = resources.find(r => r.id === highlightedResourceId);
      if (resource) {
        if (resource.resource_type === 'image') {
          setMainTab('graphics');
        } else {
          setMainTab('documents');
        }
      }
      
      // Small delay to allow tab switch and render
      setTimeout(() => {
        const element = document.getElementById(`resource-${highlightedResourceId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'animate-pulse');
          
          // Remove highlight after 3 seconds
          highlightTimeoutRef.current = setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'animate-pulse');
          }, 3000);
        }
      }, 100);
    }
    
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [highlightedResourceId, loading, resources]);

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

  // Split resources into documents and graphics
  const documentResources = resources.filter(r => r.resource_type !== 'image');
  const graphicsResources = resources.filter(r => r.resource_type === 'image');

  // Get download endpoint URL for a resource
  const getDownloadUrl = (resourceId: string): string => {
    return `https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/download-resource?id=${resourceId}`;
  };

  // Check if resource has valid downloadable URL
  const hasValidDownloadUrl = (resource: KnowledgeResource): boolean => {
    return Boolean(resource.source_url && resource.source_url.trim() !== '');
  };

  const handleOpenLink = (resource: KnowledgeResource) => {
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

  // Filter documents - include language filtering
  const filteredDocuments = documentResources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    const matchesType = filterType === 'all' || r.resource_type === filterType;
    const matchesTag = filterTag === 'all' || r.tags?.includes(filterTag);
    // Language filtering: show all, or universal (null), or matches selected document language
    const matchesLanguage = 
      documentLanguage === 'all' || 
      r.language_code === null || 
      r.language_code === documentLanguage;
    return matchesSearch && matchesCategory && matchesType && matchesTag && matchesLanguage;
  });

  // Filter graphics
  const filteredGraphics = graphicsResources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(graphicsSearchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(graphicsSearchTerm.toLowerCase());
    const matchesCategory = graphicsCategory === 'all' || r.category === graphicsCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredDocuments = filteredDocuments.filter(r => r.is_featured);
  const regularDocuments = filteredDocuments.filter(r => !r.is_featured);

  // Get unique tags from documents
  const allTags = [...new Set(documentResources.flatMap(r => r.tags || []))].sort();

  // Group resources by category
  const groupedByCategory = regularDocuments.reduce((acc, r) => {
    const category = r.category || 'Inne';
    if (!acc[category]) acc[category] = [];
    acc[category].push(r);
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
      if (resource.click_redirect_url.startsWith('/')) {
        window.location.href = resource.click_redirect_url;
      } else {
        window.open(resource.click_redirect_url, '_blank');
      }
    }
  };

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

  // Render resource card for documents
  const renderResourceCard = (resource: KnowledgeResource, isGrid: boolean = false) => (
    <Card 
      key={resource.id} 
      id={`resource-${resource.id}`}
      className={`hover:shadow-md transition-all duration-300 ${isGrid ? 'h-full' : ''}`}
    >
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
      <Header siteLogo={siteLogo} hideLanguageSelector />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Biblioteka</h1>
          <p className="text-muted-foreground">
            Dokumenty, materiały i grafiki do Twojej dyspozycji
          </p>
        </div>

        {/* Main Tabs - Documents / Graphics */}
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
            {/* Search & Filters for Documents */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj dokumentów..."
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
                      {DOCUMENT_CATEGORIES.map(cat => (
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
                      {Object.entries(RESOURCE_TYPE_LABELS)
                        .filter(([key]) => key !== 'image')
                        .map(([key, label]) => (
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
                {/* View mode toggle + Language filter */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                  <div className="flex items-center gap-2">
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
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      Dokumenty w języku:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDocumentLanguage('all')}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                          documentLanguage === 'all' 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted hover:bg-muted/80"
                        )}
                        title="Wszystkie języki"
                      >
                        🌐
                      </button>
                      {[
                        { code: 'pl', country: 'pl' },
                        { code: 'en', country: 'gb' },
                        { code: 'de', country: 'de' },
                        { code: 'it', country: 'it' },
                        { code: 'es', country: 'es' },
                        { code: 'fr', country: 'fr' },
                        { code: 'pt', country: 'pt' }
                      ].map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => setDocumentLanguage(lang.code)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                            documentLanguage === lang.code 
                              ? "ring-2 ring-primary bg-muted" 
                              : "bg-muted/50 hover:bg-muted"
                          )}
                          title={lang.code.toUpperCase()}
                        >
                          <img 
                            src={`https://flagcdn.com/w20/${lang.country}.png`}
                            alt={lang.code}
                            className="w-5 h-3 object-cover rounded-sm"
                          />
                          <span className="uppercase font-medium">{lang.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents Content */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
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
                      : 'Brak dostępnych dokumentów dla Twojej roli.'}
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
                {/* Featured Documents */}
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

                {/* Regular Documents */}
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
            {/* Search & Filters for Graphics */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj grafik..."
                      value={graphicsSearchTerm}
                      onChange={(e) => setGraphicsSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={graphicsCategory} onValueChange={setGraphicsCategory}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Kategoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie kategorie</SelectItem>
                      {GRAPHICS_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(graphicsSearchTerm || graphicsCategory !== 'all') && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setGraphicsSearchTerm('');
                        setGraphicsCategory('all');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Graphics Content */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Ładowanie grafik...</p>
              </div>
            ) : filteredGraphics.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Brak grafik</h3>
                  <p className="text-muted-foreground">
                    {graphicsSearchTerm || graphicsCategory !== 'all'
                      ? 'Nie znaleziono grafik pasujących do kryteriów wyszukiwania.' 
                      : 'Brak dostępnych grafik do udostępniania.'}
                  </p>
                  {(graphicsSearchTerm || graphicsCategory !== 'all') && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setGraphicsSearchTerm('');
                        setGraphicsCategory('all');
                      }} 
                      className="mt-4"
                    >
                      Wyczyść filtry
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredGraphics.map(graphic => (
                  <GraphicsCard
                    key={graphic.id}
                    resource={graphic}
                    onClick={() => setSelectedGraphic(graphic)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Social Share Dialog for Graphics */}
        <SocialShareDialog
          open={!!selectedGraphic}
          onOpenChange={() => setSelectedGraphic(null)}
          imageUrl={selectedGraphic?.source_url || ''}
          title={selectedGraphic?.title || ''}
          resourceId={selectedGraphic?.id || ''}
        />
      </main>
    </div>
  );
}
