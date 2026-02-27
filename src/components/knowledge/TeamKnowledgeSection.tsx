import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, FileText, X, Image, Download, ExternalLink, Copy, Share2, Clock } from 'lucide-react';
import { KnowledgeResource, RESOURCE_TYPE_LABELS, DOCUMENT_CATEGORIES, GRAPHICS_CATEGORIES, ResourceType } from '@/types/knowledge';
import { GraphicsCard } from '@/components/share';
import { toast } from 'sonner';
import { File, Archive, FileSpreadsheet, Link as LinkIcon } from 'lucide-react';

const RESOURCE_ICONS: Record<ResourceType, React.ReactNode> = {
  pdf: <FileText className="h-5 w-5 text-red-500" />,
  doc: <File className="h-5 w-5 text-blue-500" />,
  zip: <Archive className="h-5 w-5 text-yellow-600" />,
  form: <FileSpreadsheet className="h-5 w-5 text-green-500" />,
  link: <LinkIcon className="h-5 w-5 text-purple-500" />,
  page: <ExternalLink className="h-5 w-5 text-cyan-500" />,
  image: <Image className="h-5 w-5 text-pink-500" />
};

interface TeamKnowledgeSectionProps {
  teamName: string;
  resources: KnowledgeResource[];
  onSelectGraphic: (r: KnowledgeResource) => void;
}

export const TeamKnowledgeSection: React.FC<TeamKnowledgeSectionProps> = ({
  teamName,
  resources,
  onSelectGraphic,
}) => {
  const [subTab, setSubTab] = useState<'documents' | 'graphics'>('documents');
  const [docSearch, setDocSearch] = useState('');
  const [docCategory, setDocCategory] = useState('all');
  const [gfxSearch, setGfxSearch] = useState('');
  const [gfxCategory, setGfxCategory] = useState('all');

  const allDocs = resources.filter(r => r.resource_type !== 'image');
  const allGraphics = resources.filter(r => r.resource_type === 'image');

  const filteredDocs = allDocs.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(docSearch.toLowerCase()) ||
      r.description?.toLowerCase().includes(docSearch.toLowerCase());
    const matchesCat = docCategory === 'all' || r.category === docCategory;
    return matchesSearch && matchesCat;
  });

  const filteredGraphics = allGraphics.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(gfxSearch.toLowerCase()) ||
      r.description?.toLowerCase().includes(gfxSearch.toLowerCase());
    const matchesCat = gfxCategory === 'all' || r.category === gfxCategory;
    return matchesSearch && matchesCat;
  });

  const getDownloadUrl = (resourceId: string): string => {
    return `https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/download-resource?id=${resourceId}`;
  };

  const hasValidDownloadUrl = (resource: KnowledgeResource): boolean => {
    return Boolean(resource.source_url && resource.source_url.trim() !== '');
  };

  const hasAnyAction = (resource: KnowledgeResource) => {
    return resource.allow_copy_link || resource.allow_download || resource.allow_share || resource.allow_click_redirect;
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

  const handleOpenLink = (resource: KnowledgeResource) => {
    window.open(resource.source_url || '', '_blank');
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

  const renderResourceCard = (resource: KnowledgeResource) => (
    <Card key={resource.id} id={`resource-${resource.id}`} className="hover:shadow-md transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-muted shrink-0">
              {RESOURCE_ICONS[resource.resource_type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold truncate">{resource.title}</h3>
                {resource.is_new && <Badge className="bg-blue-500/20 text-blue-700 text-[10px]">Nowy</Badge>}
                {resource.is_updated && <Badge className="bg-purple-500/20 text-purple-700 text-[10px]">Zaktualizowany</Badge>}
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
            {getActionButtons(resource)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'documents' | 'graphics')}>
      <TabsList>
        <TabsTrigger value="documents" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Dokumenty
          {allDocs.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">{allDocs.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="graphics" className="flex items-center gap-2">
          <Image className="h-4 w-4" />
          Grafiki
          {allGraphics.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">{allGraphics.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Documents */}
      <TabsContent value="documents" className="space-y-4 mt-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj dokumentów..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={docCategory} onValueChange={setDocCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Kategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie kategorie</SelectItem>
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(docSearch || docCategory !== 'all') && (
                <Button variant="ghost" size="icon" onClick={() => { setDocSearch(''); setDocCategory('all'); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {filteredDocs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Brak dokumentów</h3>
              <p className="text-muted-foreground">
                {docSearch || docCategory !== 'all'
                  ? 'Nie znaleziono dokumentów pasujących do kryteriów.'
                  : 'Lider nie dodał jeszcze dokumentów.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map(resource => renderResourceCard(resource))}
          </div>
        )}
      </TabsContent>

      {/* Graphics */}
      <TabsContent value="graphics" className="space-y-4 mt-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj grafik..."
                  value={gfxSearch}
                  onChange={(e) => setGfxSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={gfxCategory} onValueChange={setGfxCategory}>
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
              {(gfxSearch || gfxCategory !== 'all') && (
                <Button variant="ghost" size="icon" onClick={() => { setGfxSearch(''); setGfxCategory('all'); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {filteredGraphics.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Brak grafik</h3>
              <p className="text-muted-foreground">
                {gfxSearch || gfxCategory !== 'all'
                  ? 'Nie znaleziono grafik pasujących do kryteriów.'
                  : 'Lider nie dodał jeszcze grafik.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredGraphics.map(graphic => (
              <GraphicsCard
                key={graphic.id}
                resource={graphic}
                onClick={() => onSelectGraphic(graphic)}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};
