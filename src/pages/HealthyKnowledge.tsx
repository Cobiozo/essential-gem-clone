import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Heart, Search, Play, FileText, Image, Music, Type, Share2, Eye, Clock, Copy, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HealthyKnowledge, DEFAULT_SHARE_MESSAGE_TEMPLATE } from '@/types/healthyKnowledge';
import { SecureMedia } from '@/components/SecureMedia';
import { useHealthyKnowledgeTranslations } from '@/hooks/useHealthyKnowledgeTranslations';
import { useContentTypeLabels } from '@/types/healthyKnowledge';

const ContentTypeIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) => {
  const icons: Record<string, React.ReactNode> = {
    video: <Play className={className} />,
    audio: <Music className={className} />,
    document: <FileText className={className} />,
    image: <Image className={className} />,
    text: <Type className={className} />,
  };
  return <>{icons[type] || <FileText className={className} />}</>;
};

const HealthyKnowledgePage: React.FC = () => {
  const { t, tf, language } = useLanguage();
  const { user, isPartner, isAdmin } = useAuth();
  const navigate = useNavigate();
  const contentTypeLabels = useContentTypeLabels();
  
  const [materials, setMaterials] = useState<HealthyKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<HealthyKnowledge | null>(null);
  const [shareMessage, setShareMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<HealthyKnowledge | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('healthy_knowledge')
        .select('*')
        .eq('is_active', true)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials((data as HealthyKnowledge[]) || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error(tf('hk.fetchError', 'Nie udało się pobrać materiałów'));
    } finally {
      setLoading(false);
    }
  };

  const translatedMaterials = useHealthyKnowledgeTranslations(materials, language);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    translatedMaterials.forEach(m => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats).sort();
  }, [translatedMaterials]);

  const filteredMaterials = useMemo(() => {
    return translatedMaterials.filter(m => {
      const matchesSearch = !searchTerm || 
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || m.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [translatedMaterials, searchTerm, selectedCategory]);

  const canShare = isPartner || isAdmin;

  const handleOpenShare = (material: HealthyKnowledge) => {
    setSelectedMaterial(material);
    const template = material.share_message_template || DEFAULT_SHARE_MESSAGE_TEMPLATE;
    const previewMessage = template
      .replace('{title}', material.title)
      .replace('{description}', material.description || '')
      .replace('{share_url}', `[${tf('hk.linkWillBeGenerated', 'link zostanie wygenerowany')}]`)
      .replace('{otp_code}', `[${tf('hk.codeWillBeGenerated', 'kod zostanie wygenerowany')}]`)
      .replace('{validity_hours}', String(material.otp_validity_hours || 24))
      .replace('{partner_name}', `[${tf('hk.yourName', 'Twoje imię')}]`);
    setShareMessage(previewMessage);
    setShareDialogOpen(true);
  };

  const handleGenerateAndCopy = async () => {
    if (!selectedMaterial) return;
    
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(tf('common.mustBeLoggedIn', 'Musisz być zalogowany'));
        return;
      }

      const response = await supabase.functions.invoke('generate-hk-otp', {
        body: { knowledge_id: selectedMaterial.id },
      });

      if (response.error) {
        throw new Error(response.error.message || tf('hk.generateError', 'Błąd generowania kodu'));
      }

      const { clipboard_message, otp_code } = response.data;
      
      await navigator.clipboard.writeText(clipboard_message);
      toast.success(`${tf('hk.codeGenerated', 'Kod')} ${otp_code} ${tf('hk.copiedToClipboard', 'wygenerowany i skopiowany do schowka!')}`);
      setShareDialogOpen(false);
      
      window.dispatchEvent(new CustomEvent('hkOtpCodeGenerated'));
      
    } catch (error: any) {
      console.error('Error generating OTP:', error);
      toast.error(error.message || tf('hk.generateFailed', 'Nie udało się wygenerować kodu'));
    } finally {
      setGenerating(false);
    }
  };

  const handleViewMaterial = (material: HealthyKnowledge) => {
    if (material.content_type === 'video' || material.content_type === 'audio') {
      navigate(`/zdrowa-wiedza/player/${material.id}`);
      return;
    }
    
    setPreviewMaterial(material);
    setPreviewDialogOpen(true);
    
    supabase
      .from('healthy_knowledge')
      .update({ view_count: material.view_count + 1 })
      .eq('id', material.id)
      .then(() => {
        setMaterials(prev => prev.map(m => 
          m.id === material.id ? { ...m, view_count: m.view_count + 1 } : m
        ));
      });
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <DashboardLayout title={tf('hk.title', 'Zdrowa Wiedza')}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{tf('hk.title', 'Zdrowa Wiedza')}</h1>
              <p className="text-muted-foreground text-sm">
                {tf('hk.subtitle', 'Materiały edukacyjne o zdrowiu i wellness')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={tf('hk.searchPlaceholder', 'Szukaj materiałów...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                {tf('common.all', 'Wszystkie')}
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMaterials.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory 
                  ? tf('hk.noResults', 'Nie znaleziono materiałów spełniających kryteria')
                  : tf('hk.noMaterials', 'Brak dostępnych materiałów')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {filteredMaterials.map((material) => (
              <Card key={material.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {material.thumbnail_url ? (
                    <img 
                      src={material.thumbnail_url} 
                      alt={material.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : material.content_type === 'image' && material.media_url ? (
                    <img 
                      src={material.media_url} 
                      alt={material.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <ContentTypeIcon type={material.content_type} className="w-10 h-10 sm:w-16 sm:h-16 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {(material.content_type === 'video' || material.content_type === 'audio') && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/zdrowa-wiedza/player/${material.id}`);
                      }}
                    >
                      <div className="p-2 sm:p-3 rounded-full bg-black/50 backdrop-blur-sm group-hover:bg-primary/80 transition-colors">
                        <Play className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                      </div>
                    </div>
                  )}
                  
                  {material.content_type !== 'video' && material.content_type !== 'audio' && (
                    <div 
                      className="absolute inset-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewMaterial(material);
                      }}
                    />
                  )}
                  
                  {material.is_featured && (
                    <Badge className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-yellow-500/90 text-yellow-950 text-[10px] sm:text-xs px-1 sm:px-2">
                      {tf('hk.featured', 'Wyróżnione')}
                    </Badge>
                  )}
                </div>

                <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
                  <div className="hidden sm:flex items-center gap-2">
                    <div className={cn(
                      "p-1.5 rounded",
                      material.content_type === 'video' && "bg-blue-500/10 text-blue-500",
                      material.content_type === 'audio' && "bg-purple-500/10 text-purple-500",
                      material.content_type === 'document' && "bg-orange-500/10 text-orange-500",
                      material.content_type === 'image' && "bg-green-500/10 text-green-500",
                      material.content_type === 'text' && "bg-gray-500/10 text-gray-500",
                    )}>
                      <ContentTypeIcon type={material.content_type} className="w-3 h-3" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {contentTypeLabels[material.content_type as keyof typeof contentTypeLabels] || material.content_type}
                    </Badge>
                  </div>
                  <CardTitle className="text-xs sm:text-base font-medium line-clamp-1 sm:line-clamp-2 mt-0 sm:mt-2">
                    {material.title}
                  </CardTitle>
                  {material.description && (
                    <CardDescription className="hidden sm:block line-clamp-2 text-xs">
                      {material.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="p-2 sm:p-4 pt-0">
                  <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    {material.category && (
                      <Badge variant="secondary" className="text-xs">
                        {material.category}
                      </Badge>
                    )}
                    {material.duration_seconds && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(material.duration_seconds / 60)} min
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {material.view_count}
                    </span>
                  </div>
                  
                  <div className="flex gap-1 sm:gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 h-7 sm:h-8 text-xs px-2 sm:px-3"
                      onClick={() => handleViewMaterial(material)}
                    >
                      <Eye className="w-3 h-3 sm:mr-1" />
                      <span className="hidden sm:inline">{tf('hk.preview', 'Podgląd')}</span>
                    </Button>
                    {canShare && material.allow_external_share && (
                      <Button 
                        size="sm" 
                        className="flex-1 h-7 sm:h-8 text-xs px-2 sm:px-3"
                        onClick={() => handleOpenShare(material)}
                      >
                        <Share2 className="w-3 h-3 sm:mr-1" />
                        <span className="hidden sm:inline">{tf('hk.share', 'Udostępnij')}</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{tf('hk.shareMaterial', 'Udostępnij materiał')}</DialogTitle>
            <DialogDescription>
              {tf('hk.generateCodeDesc', 'Wygeneruj kod dostępu i skopiuj wiadomość do wysłania')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedMaterial && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedMaterial.title}</p>
                <p className="text-sm text-muted-foreground">
                  {tf('hk.codeValidFor', 'Kod ważny przez')} {selectedMaterial.otp_validity_hours || 24} {tf('hk.hours', 'godzin')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">{tf('hk.messagePreview', 'Podgląd wiadomości')}</label>
                <Textarea
                  value={shareMessage}
                  readOnly
                  rows={8}
                  className="mt-1 text-sm bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {tf('hk.linkAndCodeNote', 'Link i kod zostaną automatycznie uzupełnione po wygenerowaniu')}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              {tf('common.cancel', 'Anuluj')}
            </Button>
            <Button onClick={handleGenerateAndCopy} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {tf('hk.generating', 'Generowanie...')}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  {tf('hk.generateAndCopy', 'Generuj kod i kopiuj')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewMaterial?.title}</DialogTitle>
            {previewMaterial?.description && (
              <DialogDescription>{previewMaterial.description}</DialogDescription>
            )}
          </DialogHeader>
          
          {previewMaterial && (
            <div className="space-y-4">
              {previewMaterial.media_url && previewMaterial.content_type !== 'text' && (
                <SecureMedia
                  mediaUrl={previewMaterial.media_url}
                  mediaType={previewMaterial.content_type as 'video' | 'audio' | 'image' | 'document'}
                  className="w-full rounded-lg"
                />
              )}
              
              {previewMaterial.content_type === 'text' && previewMaterial.text_content && (
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/50 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: previewMaterial.text_content }}
                />
              )}
              
              {previewMaterial.content_type === 'document' && previewMaterial.media_url && (
                <Button asChild className="w-full">
                  <a href={previewMaterial.media_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="w-4 h-4 mr-2" />
                    {tf('hk.openDocument', 'Otwórz dokument')}
                  </a>
                </Button>
              )}
              
              <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground pt-2 border-t">
                {previewMaterial.category && (
                  <Badge variant="outline">{previewMaterial.category}</Badge>
                )}
                {previewMaterial.duration_seconds && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.floor(previewMaterial.duration_seconds / 60)} min
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {previewMaterial.view_count} {tf('hk.views', 'wyświetleń')}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default HealthyKnowledgePage;
