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
import { HealthyKnowledge, CONTENT_TYPE_LABELS, DEFAULT_SHARE_MESSAGE_TEMPLATE } from '@/types/healthyKnowledge';

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
  const { t } = useLanguage();
  const { user, isPartner, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [materials, setMaterials] = useState<HealthyKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<HealthyKnowledge | null>(null);
  const [shareMessage, setShareMessage] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [generating, setGenerating] = useState(false);

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
      toast.error('Nie udało się pobrać materiałów');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    materials.forEach(m => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats).sort();
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = !searchTerm || 
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || m.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchTerm, selectedCategory]);

  const canShare = isPartner || isAdmin;

  const handleOpenShare = (material: HealthyKnowledge) => {
    setSelectedMaterial(material);
    // Prepare message template
    const template = material.share_message_template || DEFAULT_SHARE_MESSAGE_TEMPLATE;
    const previewMessage = template
      .replace('{title}', material.title)
      .replace('{description}', material.description || '')
      .replace('{share_url}', `[link zostanie wygenerowany]`)
      .replace('{otp_code}', '[kod zostanie wygenerowany]')
      .replace('{validity_hours}', String(material.otp_validity_hours || 24))
      .replace('{partner_name}', '[Twoje imię]');
    setShareMessage(previewMessage);
    setRecipientName('');
    setRecipientEmail('');
    setShareDialogOpen(true);
  };

  const handleGenerateAndCopy = async () => {
    if (!selectedMaterial) return;
    
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Musisz być zalogowany');
        return;
      }

      const response = await supabase.functions.invoke('generate-hk-otp', {
        body: {
          knowledge_id: selectedMaterial.id,
          recipient_name: recipientName || null,
          recipient_email: recipientEmail || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Błąd generowania kodu');
      }

      const { clipboard_message, otp_code } = response.data;
      
      await navigator.clipboard.writeText(clipboard_message);
      toast.success(`Kod ${otp_code} wygenerowany i skopiowany do schowka!`);
      setShareDialogOpen(false);
      
      // Dispatch event for widget refresh
      window.dispatchEvent(new CustomEvent('hkOtpCodeGenerated'));
      
    } catch (error: any) {
      console.error('Error generating OTP:', error);
      toast.error(error.message || 'Nie udało się wygenerować kodu');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewMaterial = (material: HealthyKnowledge) => {
    // For internal users, show content directly or navigate to detail view
    // This could open a modal or navigate to a detail page
    toast.info('Podgląd materiału - funkcja w przygotowaniu');
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <DashboardLayout title="Zdrowa Wiedza">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Zdrowa Wiedza</h1>
              <p className="text-muted-foreground text-sm">
                Materiały edukacyjne o zdrowiu i wellness
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj materiałów..."
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
                Wszystkie
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

        {/* Materials Grid */}
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
                  ? 'Nie znaleziono materiałów spełniających kryteria'
                  : 'Brak dostępnych materiałów'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaterials.map((material) => (
              <Card key={material.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-2 rounded-lg",
                        material.content_type === 'video' && "bg-blue-500/10 text-blue-500",
                        material.content_type === 'audio' && "bg-purple-500/10 text-purple-500",
                        material.content_type === 'document' && "bg-orange-500/10 text-orange-500",
                        material.content_type === 'image' && "bg-green-500/10 text-green-500",
                        material.content_type === 'text' && "bg-gray-500/10 text-gray-500",
                      )}>
                        <ContentTypeIcon type={material.content_type} className="w-4 h-4" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {CONTENT_TYPE_LABELS[material.content_type as keyof typeof CONTENT_TYPE_LABELS] || material.content_type}
                      </Badge>
                    </div>
                    {material.is_featured && (
                      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        Wyróżnione
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2 line-clamp-2">
                    {material.title}
                  </CardTitle>
                  {material.description && (
                    <CardDescription className="line-clamp-2">
                      {material.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    {material.category && (
                      <span className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {material.category}
                        </Badge>
                      </span>
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
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewMaterial(material)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Podgląd
                    </Button>
                    {canShare && material.allow_external_share && (
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleOpenShare(material)}
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        Udostępnij
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
            <DialogTitle>Udostępnij materiał</DialogTitle>
            <DialogDescription>
              Wygeneruj kod dostępu i skopiuj wiadomość do wysłania
            </DialogDescription>
          </DialogHeader>
          
          {selectedMaterial && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedMaterial.title}</p>
                <p className="text-sm text-muted-foreground">
                  Kod ważny przez {selectedMaterial.otp_validity_hours || 24} godzin
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Imię odbiorcy (opcjonalnie)</label>
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="np. Jan"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email odbiorcy (opcjonalnie)</label>
                  <Input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="jan@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Podgląd wiadomości</label>
                <Textarea
                  value={shareMessage}
                  readOnly
                  rows={8}
                  className="mt-1 text-sm bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Link i kod zostaną automatycznie uzupełnione po wygenerowaniu
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleGenerateAndCopy} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generowanie...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Generuj kod i kopiuj
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default HealthyKnowledgePage;
