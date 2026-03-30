import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFormProtection } from '@/hooks/useFormProtection';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Heart, Plus, Search, Edit2, Trash2, Eye, EyeOff, 
  Loader2, FileText, Play, Image, Music, Type, Share2, 
  Star, StarOff, MoreHorizontal, RefreshCw, BarChart3,
  MessageSquare, Check, XCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import HkStatisticsPanel from './HkStatisticsPanel';
import { cn } from '@/lib/utils';
import { MediaUpload } from '@/components/MediaUpload';
import { 
  HealthyKnowledge, 
  HkOtpCode,
  TestimonialComment,
  HEALTHY_KNOWLEDGE_CATEGORIES, 
  CONTENT_TYPE_LABELS, 
  DEFAULT_SHARE_MESSAGE_TEMPLATE,
  ContentType
} from '@/types/healthyKnowledge';
import { LANGUAGE_OPTIONS, getLanguageLabel } from '@/types/knowledge';

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

const HealthyKnowledgeManagement: React.FC = () => {
  const { user } = useAuth();
  
  // Materials state
  const [materials, setMaterials] = useState<HealthyKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  
  // Form state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Partial<HealthyKnowledge> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Protect form state when switching browser tabs
  useFormProtection(editDialogOpen);
  
  // OTP codes tab state
  const [otpCodes, setOtpCodes] = useState<HkOtpCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  // Moderation state
  const [pendingComments, setPendingComments] = useState<TestimonialComment[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchPendingComments = async () => {
    setLoadingPending(true);
    try {
      const { data, error } = await supabase.rpc('get_pending_testimonial_comments');
      if (error) throw error;
      setPendingComments((data || []) as unknown as TestimonialComment[]);
    } catch (e) {
      console.error('Error fetching pending comments:', e);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleModerateComment = async (commentId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('testimonial_comments')
        .update({ status: newStatus })
        .eq('id', commentId);
      if (error) throw error;
      toast.success(newStatus === 'approved' ? 'Opinia zatwierdzona' : 'Opinia odrzucona');
      fetchPendingComments();
    } catch (e: any) {
      toast.error(e.message || 'Błąd moderacji');
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('healthy_knowledge')
        .select('*')
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

  const fetchOtpCodes = async () => {
    try {
      setLoadingCodes(true);
      const { data, error } = await supabase
        .from('hk_otp_codes')
        .select(`
          *,
          healthy_knowledge (id, title, slug)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setOtpCodes((data as HkOtpCode[]) || []);
    } catch (error) {
      console.error('Error fetching OTP codes:', error);
      toast.error('Nie udało się pobrać kodów');
    } finally {
      setLoadingCodes(false);
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLanguage = filterLanguage === 'all' || m.language_code === filterLanguage || (!m.language_code && filterLanguage === 'pl');
      return matchesSearch && matchesLanguage;
    });
  }, [materials, searchTerm, filterLanguage]);

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50);
  };

  const handleCreateNew = () => {
    setEditingMaterial({
      title: '',
      description: '',
      slug: '',
      content_type: 'document',
      thumbnail_url: null,
      media_url: null,
      visible_to_admin: true,
      visible_to_partner: false,
      visible_to_client: false,
      visible_to_specjalista: false,
      visible_to_everyone: false,
      allow_external_share: false,
      otp_validity_hours: 24,
      otp_max_sessions: 3,
      share_message_template: DEFAULT_SHARE_MESSAGE_TEMPLATE,
      category: null,
      tags: [],
      is_active: true,
      is_featured: false,
      language_code: 'pl',
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (material: HealthyKnowledge) => {
    setEditingMaterial({ ...material });
    setEditDialogOpen(true);
  };

  const handleMediaUploaded = (url: string, type: string, altText?: string, durationSeconds?: number) => {
    if (!editingMaterial) return;
    
    setEditingMaterial({
      ...editingMaterial,
      media_url: url,
      file_name: altText || url.split('/').pop() || 'uploaded_file',
      file_size: null,
    });
  };

  const handleSave = async () => {
    if (!editingMaterial?.title?.trim()) {
      toast.error('Tytuł jest wymagany');
      return;
    }

    setSaving(true);
    try {
      const slug = editingMaterial.slug || generateSlug(editingMaterial.title);
      
      const dataToSave = {
        ...editingMaterial,
        slug,
        updated_at: new Date().toISOString(),
      };

      if (editingMaterial.id) {
        // Update
        const { error } = await supabase
          .from('healthy_knowledge')
          .update(dataToSave)
          .eq('id', editingMaterial.id);

        if (error) throw error;
        toast.success('Materiał zaktualizowany');
      } else {
        // Create
        const insertData = {
          ...dataToSave,
          created_by: user?.id,
        };
        const { data: insertedData, error } = await supabase
          .from('healthy_knowledge')
          .insert(insertData as any)
          .select('id')
          .single();

        if (error) throw error;
        toast.success('Materiał utworzony');
        
        // Auto-translate new healthy knowledge item
        if (insertedData?.id) {
          import('@/utils/autoTranslate').then(({ triggerAutoTranslate }) => {
            triggerAutoTranslate('healthy_knowledge', { item_id: insertedData.id });
          }).catch(() => {});
        }
      }

      setEditDialogOpen(false);
      setEditingMaterial(null);
      fetchMaterials();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Nie udało się zapisać');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (material: HealthyKnowledge) => {
    try {
      const { error } = await supabase
        .from('healthy_knowledge')
        .update({ is_active: !material.is_active })
        .eq('id', material.id);

      if (error) throw error;
      
      setMaterials(prev => prev.map(m => 
        m.id === material.id ? { ...m, is_active: !m.is_active } : m
      ));
      toast.success(material.is_active ? 'Materiał ukryty' : 'Materiał aktywowany');
    } catch (error) {
      console.error('Toggle error:', error);
      toast.error('Nie udało się zmienić statusu');
    }
  };

  const handleToggleFeatured = async (material: HealthyKnowledge) => {
    try {
      const { error } = await supabase
        .from('healthy_knowledge')
        .update({ is_featured: !material.is_featured })
        .eq('id', material.id);

      if (error) throw error;
      
      setMaterials(prev => prev.map(m => 
        m.id === material.id ? { ...m, is_featured: !m.is_featured } : m
      ));
      toast.success(material.is_featured ? 'Usunięto z wyróżnionych' : 'Dodano do wyróżnionych');
    } catch (error) {
      console.error('Toggle featured error:', error);
      toast.error('Nie udało się zmienić statusu');
    }
  };

  const handleDelete = async (material: HealthyKnowledge) => {
    if (!confirm(`Czy na pewno chcesz usunąć "${material.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('healthy_knowledge')
        .delete()
        .eq('id', material.id);

      if (error) throw error;
      
      setMaterials(prev => prev.filter(m => m.id !== material.id));
      toast.success('Materiał usunięty');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Nie udało się usunąć');
    }
  };

  const handleInvalidateCode = async (code: HkOtpCode) => {
    try {
      const { error } = await supabase
        .from('hk_otp_codes')
        .update({ is_invalidated: true })
        .eq('id', code.id);

      if (error) throw error;
      
      setOtpCodes(prev => prev.map(c => 
        c.id === code.id ? { ...c, is_invalidated: true } : c
      ));
      toast.success('Kod unieważniony');
    } catch (error) {
      console.error('Invalidate error:', error);
      toast.error('Nie udało się unieważnić kodu');
    }
  };

  const getCodeStatus = (code: HkOtpCode) => {
    if (code.is_invalidated) return { label: 'Unieważniony', variant: 'destructive' as const };
    if (new Date(code.expires_at) < new Date()) return { label: 'Wygasły', variant: 'secondary' as const };
    return { label: 'Aktywny', variant: 'default' as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Heart className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Zdrowa Wiedza</h2>
            <p className="text-muted-foreground text-sm">
              Zarządzaj materiałami edukacyjnymi
            </p>
          </div>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nowy materiał
        </Button>
      </div>

      <Tabs defaultValue="materials" onValueChange={(v) => {
        if (v === 'codes') fetchOtpCodes();
        if (v === 'moderation') fetchPendingComments();
      }}>
        <TabsList>
          <TabsTrigger value="materials">Materiały ({materials.length})</TabsTrigger>
          <TabsTrigger value="codes">Kody OTP</TabsTrigger>
          <TabsTrigger value="moderation">
            <MessageSquare className="w-4 h-4 mr-1" />
            Opinie
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <BarChart3 className="w-4 h-4 mr-1" />
            Statystyki
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-4">
          {/* Search + Language filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj materiałów..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterLanguage} onValueChange={setFilterLanguage}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Materials Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMaterials.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nie znaleziono materiałów' : 'Brak materiałów. Dodaj pierwszy!'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop view - table */}
              <div className="hidden md:block">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Materiał</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>Kategoria</TableHead>
                        <TableHead>Widoczność</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMaterials.map((material) => (
                        <TableRow key={material.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {/* Thumbnail preview */}
                              <div className="relative w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border/50">
                                {material.thumbnail_url ? (
                                  <>
                                    <img 
                                      src={material.thumbnail_url} 
                                      alt={material.title}
                                      className="w-full h-full object-cover"
                                    />
                                    {/* Play overlay for video */}
                                    {material.content_type === 'video' && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <Play className="w-4 h-4 text-white fill-white" />
                                      </div>
                                    )}
                                    {/* Audio overlay */}
                                    {material.content_type === 'audio' && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <Music className="w-4 h-4 text-white" />
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className={cn(
                                    "w-full h-full flex items-center justify-center",
                                    material.content_type === 'video' && "bg-blue-500/10 text-blue-500",
                                    material.content_type === 'audio' && "bg-purple-500/10 text-purple-500",
                                    material.content_type === 'document' && "bg-orange-500/10 text-orange-500",
                                    material.content_type === 'image' && "bg-green-500/10 text-green-500",
                                    material.content_type === 'text' && "bg-gray-500/10 text-gray-500",
                                  )}>
                                    <ContentTypeIcon type={material.content_type} className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Title and description */}
                              <div>
                                <p className="font-medium">{material.title}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {material.description || 'Brak opisu'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline">
                                {CONTENT_TYPE_LABELS[material.content_type as ContentType]}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {getLanguageLabel(material.language_code || 'pl')}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {material.category || '-'}
                              {material.category === 'Testymoniale' && (
                                <Badge className="bg-pink-500/10 text-pink-600 border-pink-500/20 text-xs ml-1">
                                  Testymonial
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {/* Admin Badge */}
                              {material.visible_to_admin && (
                                <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                              {material.visible_to_everyone && <Badge variant="secondary" className="text-xs">Wszyscy</Badge>}
                              {material.visible_to_partner && <Badge variant="secondary" className="text-xs">Partner</Badge>}
                              {material.visible_to_client && <Badge variant="secondary" className="text-xs">Klient</Badge>}
                              {material.visible_to_specjalista && <Badge variant="secondary" className="text-xs">Specjalista</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={material.is_active ? "default" : "secondary"}>
                                {material.is_active ? 'Aktywny' : 'Ukryty'}
                              </Badge>
                              {material.is_featured && (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              )}
                              {material.allow_external_share && (
                                <Share2 className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleToggleFeatured(material)}
                                title={material.is_featured ? 'Usuń z wyróżnionych' : 'Wyróżnij'}
                              >
                                {material.is_featured ? (
                                  <StarOff className="w-4 h-4" />
                                ) : (
                                  <Star className="w-4 h-4" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleToggleActive(material)}
                                title={material.is_active ? 'Ukryj' : 'Aktywuj'}
                              >
                                {material.is_active ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEdit(material)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDelete(material)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              {/* Mobile view - cards */}
              <div className="md:hidden space-y-3">
                {filteredMaterials.map((material) => (
                  <Card key={material.id} className="overflow-hidden">
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Thumbnail */}
                        <div className="relative w-16 aspect-video rounded-lg overflow-hidden flex-shrink-0 border">
                          {material.thumbnail_url ? (
                            <>
                              <img src={material.thumbnail_url} alt="" className="w-full h-full object-cover" />
                              {material.content_type === 'video' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <Play className="w-4 h-4 text-white fill-white" />
                                </div>
                              )}
                              {material.content_type === 'audio' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <Music className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </>
                          ) : (
                            <div className={cn(
                              "w-full h-full flex items-center justify-center",
                              material.content_type === 'video' && "bg-blue-500/10 text-blue-500",
                              material.content_type === 'audio' && "bg-purple-500/10 text-purple-500",
                              material.content_type === 'document' && "bg-orange-500/10 text-orange-500",
                              material.content_type === 'image' && "bg-green-500/10 text-green-500",
                              material.content_type === 'text' && "bg-gray-500/10 text-gray-500",
                            )}>
                              <ContentTypeIcon type={material.content_type} className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-medium text-sm truncate">{material.title}</p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">
                              {CONTENT_TYPE_LABELS[material.content_type as ContentType]}
                            </Badge>
                            <Badge variant={material.is_active ? "default" : "secondary"} className="text-xs">
                              {material.is_active ? 'Aktywny' : 'Ukryty'}
                            </Badge>
                            {material.is_featured && (
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(material)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edytuj
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleFeatured(material)}>
                              {material.is_featured ? <StarOff className="w-4 h-4 mr-2" /> : <Star className="w-4 h-4 mr-2" />}
                              {material.is_featured ? 'Usuń z wyróżnionych' : 'Wyróżnij'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(material)}>
                              {material.is_active ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                              {material.is_active ? 'Ukryj' : 'Aktywuj'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(material)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Usuń
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={fetchOtpCodes}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Odśwież
            </Button>
          </div>

          {loadingCodes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : otpCodes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Brak wygenerowanych kodów</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Materiał</TableHead>
                    <TableHead>Utworzony</TableHead>
                    <TableHead>Wygasa</TableHead>
                    <TableHead>Sesje</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otpCodes.map((code) => {
                    const status = getCodeStatus(code);
                    return (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono font-bold">{code.code}</TableCell>
                        <TableCell>
                          {code.healthy_knowledge?.title || '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(code.created_at).toLocaleDateString('pl-PL')}
                        </TableCell>
                        <TableCell>
                          {new Date(code.expires_at).toLocaleDateString('pl-PL')}
                        </TableCell>
                        <TableCell>{code.used_sessions}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {!code.is_invalidated && new Date(code.expires_at) > new Date() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInvalidateCode(code)}
                            >
                              Unieważnij
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <HkStatisticsPanel />
        </TabsContent>
      </Tabs>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial?.id ? 'Edytuj materiał' : 'Nowy materiał'}
            </DialogTitle>
          </DialogHeader>

          {editingMaterial && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4">
                <div>
                  <Label>Tytuł *</Label>
                  <Input
                    value={editingMaterial.title || ''}
                    onChange={(e) => setEditingMaterial({
                      ...editingMaterial,
                      title: e.target.value,
                      slug: editingMaterial.id ? editingMaterial.slug : generateSlug(e.target.value),
                    })}
                    placeholder="Nazwa materiału"
                  />
                </div>

                <div>
                  <Label>Opis</Label>
                  <Textarea
                    value={editingMaterial.description || ''}
                    onChange={(e) => setEditingMaterial({
                      ...editingMaterial,
                      description: e.target.value,
                    })}
                    placeholder="Krótki opis materiału"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Typ zawartości</Label>
                    <Select
                      value={editingMaterial.content_type || 'document'}
                      onValueChange={(v) => setEditingMaterial({
                        ...editingMaterial,
                        content_type: v as ContentType,
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONTENT_TYPE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Kategoria</Label>
                    <Select
                      value={editingMaterial.category || ''}
                      onValueChange={(v) => setEditingMaterial({
                        ...editingMaterial,
                        category: v || null,
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz kategorię" />
                      </SelectTrigger>
                      <SelectContent>
                        {HEALTHY_KNOWLEDGE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Język materiału</Label>
                    <Select
                      value={editingMaterial.language_code || 'pl'}
                      onValueChange={(v) => setEditingMaterial({
                        ...editingMaterial,
                        language_code: v === 'all' ? null : v,
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.filter(l => l.code !== 'all').map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>{lang.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Thumbnail Upload */}
                <div className="space-y-2">
                  <Label>Okładka (opcjonalnie)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !editingMaterial) return;
                        
                        if (!file.type.startsWith('image/')) {
                          toast.error('Okładka musi być obrazem (JPG, PNG, WebP)');
                          return;
                        }
                        
                        setUploadingThumbnail(true);
                        try {
                          // Sanitize filename - remove spaces and special characters
                          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                          const fileName = `thumbnails/${Date.now()}-${sanitizedFileName}`;
                          const { data, error } = await supabase.storage
                            .from('healthy-knowledge')
                            .upload(fileName, file, { cacheControl: '3600' });
                          
                          if (error) throw error;
                          
                          const { data: { publicUrl } } = supabase.storage
                            .from('healthy-knowledge')
                            .getPublicUrl(data.path);
                          
                          setEditingMaterial({
                            ...editingMaterial,
                            thumbnail_url: publicUrl,
                          });
                          
                          toast.success('Okładka przesłana');
                        } catch (error: any) {
                          console.error('Thumbnail upload error:', error);
                          toast.error(`Błąd przesyłania okładki: ${error.message || 'Nieznany błąd'}`);
                        } finally {
                          setUploadingThumbnail(false);
                        }
                      }}
                      disabled={uploadingThumbnail}
                      accept="image/*"
                    />
                    {uploadingThumbnail && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  
                  {editingMaterial.thumbnail_url && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                      <img 
                        src={editingMaterial.thumbnail_url} 
                        alt="Okładka" 
                        className="max-w-40 max-h-24 object-contain rounded-lg border shadow-sm bg-muted"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Okładka ustawiona</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        type="button"
                        onClick={() => setEditingMaterial({
                          ...editingMaterial,
                          thumbnail_url: null,
                        })}
                        title="Usuń okładkę"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Jeśli nie ustawisz okładki, dla obrazów zostanie użyty sam plik, dla pozostałych typów - ikona zastępcza.
                  </p>
                </div>

                {/* File Upload - używamy MediaUpload jak w Akademii */}
                {editingMaterial.content_type !== 'text' && (
                  <div className="space-y-2">
                    <Label>Plik multimedialny</Label>
                    <MediaUpload
                      onMediaUploaded={handleMediaUploaded}
                      currentMediaUrl={editingMaterial.media_url || undefined}
                      currentMediaType={editingMaterial.content_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
                      allowedTypes={
                        editingMaterial.content_type === 'video' ? ['video'] :
                        editingMaterial.content_type === 'audio' ? ['audio'] :
                        editingMaterial.content_type === 'image' ? ['image'] :
                        editingMaterial.content_type === 'document' ? ['document'] :
                        ['video', 'audio', 'image', 'document']
                      }
                      maxSizeMB={null}
                    />
                  </div>
                )}

                {/* Gallery for Testimonials */}
                {editingMaterial.category === 'Testymoniale' && (
                  <div className="space-y-2">
                    <Label>Galeria zdjęć (dodatkowe)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0 || !editingMaterial) return;
                        
                        const newUrls: string[] = [];
                        for (const file of Array.from(files)) {
                          if (!file.type.startsWith('image/')) continue;
                          try {
                            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                            const fileName = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${sanitizedFileName}`;
                            const { data, error } = await supabase.storage
                              .from('healthy-knowledge')
                              .upload(fileName, file, { cacheControl: '3600' });
                            if (error) throw error;
                            const { data: { publicUrl } } = supabase.storage
                              .from('healthy-knowledge')
                              .getPublicUrl(data.path);
                            newUrls.push(publicUrl);
                          } catch (err: any) {
                            console.error('Gallery upload error:', err);
                            toast.error(`Błąd uploadu: ${err.message}`);
                          }
                        }
                        
                        if (newUrls.length > 0) {
                          setEditingMaterial({
                            ...editingMaterial,
                            gallery_urls: [...(editingMaterial.gallery_urls || []), ...newUrls],
                          });
                          toast.success(`Dodano ${newUrls.length} zdjęć do galerii`);
                        }
                        e.target.value = '';
                      }}
                    />
                    {(editingMaterial.gallery_urls || []).length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {(editingMaterial.gallery_urls || []).map((url, i) => (
                          <div key={i} className="relative group">
                            <img src={url} alt={`Gallery ${i+1}`} className="w-full aspect-square object-cover rounded border" />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              type="button"
                              onClick={() => {
                                const updated = [...(editingMaterial.gallery_urls || [])];
                                updated.splice(i, 1);
                                setEditingMaterial({ ...editingMaterial, gallery_urls: updated });
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Główne zdjęcie to plik multimedialny powyżej. Tu dodaj dodatkowe zdjęcia do galerii.
                    </p>
                  </div>
                )}

                {/* Text Content */}
                {editingMaterial.content_type === 'text' && (
                  <div>
                    <Label>Treść</Label>
                    <Textarea
                      value={editingMaterial.text_content || ''}
                      onChange={(e) => setEditingMaterial({
                        ...editingMaterial,
                        text_content: e.target.value,
                      })}
                      placeholder="Treść tekstowa (HTML dozwolone)"
                      rows={8}
                    />
                  </div>
                )}
              </div>

              {/* Visibility */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Widoczność</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Admin Toggle */}
                  <div className="flex items-center justify-between col-span-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <Label className="font-medium">Administratorzy</Label>
                    </div>
                    <Switch
                      checked={editingMaterial.visible_to_admin || false}
                      onCheckedChange={(v) => setEditingMaterial({
                        ...editingMaterial,
                        visible_to_admin: v,
                      })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Wszyscy zalogowani</Label>
                    <Switch
                      checked={editingMaterial.visible_to_everyone || false}
                      onCheckedChange={(v) => setEditingMaterial({
                        ...editingMaterial,
                        visible_to_everyone: v,
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Partnerzy</Label>
                    <Switch
                      checked={editingMaterial.visible_to_partner || false}
                      onCheckedChange={(v) => setEditingMaterial({
                        ...editingMaterial,
                        visible_to_partner: v,
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Klienci</Label>
                    <Switch
                      checked={editingMaterial.visible_to_client || false}
                      onCheckedChange={(v) => setEditingMaterial({
                        ...editingMaterial,
                        visible_to_client: v,
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Specjaliści</Label>
                    <Switch
                      checked={editingMaterial.visible_to_specjalista || false}
                      onCheckedChange={(v) => setEditingMaterial({
                        ...editingMaterial,
                        visible_to_specjalista: v,
                      })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Wybierz role, które mają widzieć materiał. Można wybrać wiele ról jednocześnie.
                </p>
              </div>

              {/* Comments toggle for Testymoniale */}
              {editingMaterial.category === 'Testymoniale' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">Komentarze i oceny</Label>
                      <p className="text-sm text-muted-foreground">
                        Pozwól użytkownikom oceniać gwiazdkami i pisać opinie
                      </p>
                    </div>
                    <Switch
                      checked={editingMaterial.allow_comments || false}
                      onCheckedChange={(v) => setEditingMaterial({
                        ...editingMaterial,
                        allow_comments: v,
                      })}
                    />
                  </div>
                </div>
              )}

              {/* External Share Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Udostępnianie zewnętrzne</Label>
                    <p className="text-sm text-muted-foreground">
                      Pozwól partnerom generować kody OTP
                    </p>
                  </div>
                  <Switch
                    checked={editingMaterial.allow_external_share || false}
                    onCheckedChange={(v) => setEditingMaterial({
                      ...editingMaterial,
                      allow_external_share: v,
                    })}
                  />
                </div>

                {editingMaterial.allow_external_share && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Ważność kodu (godziny)</Label>
                        <Input
                          type="number"
                          value={editingMaterial.otp_validity_hours || 24}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            otp_validity_hours: parseInt(e.target.value) || 24,
                          })}
                          min={1}
                          max={168}
                        />
                      </div>
                      <div>
                        <Label>Max użyć kodu</Label>
                        <Input
                          type="number"
                          value={editingMaterial.otp_max_sessions || 3}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            otp_max_sessions: parseInt(e.target.value) || 3,
                          })}
                          min={1}
                          max={10}
                        />
                      </div>
                    </div>
                    
                    {/* Share Message Template Editor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Szablon wiadomości do udostępniania</Label>
                          <p className="text-xs text-muted-foreground">
                            Tekst kopiowany przy generowaniu kodu OTP
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setEditingMaterial({
                            ...editingMaterial,
                            share_message_template: DEFAULT_SHARE_MESSAGE_TEMPLATE,
                          })}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Przywróć
                        </Button>
                      </div>
                      <Textarea
                        value={editingMaterial.share_message_template || DEFAULT_SHARE_MESSAGE_TEMPLATE}
                        onChange={(e) => setEditingMaterial({
                          ...editingMaterial,
                          share_message_template: e.target.value,
                        })}
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <div className="text-xs text-muted-foreground space-y-1.5 p-3 bg-muted/50 rounded-lg border">
                        <p className="font-medium mb-2">💡 Legenda zmiennych:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 font-mono text-[11px]">
                          <div><span className="text-primary">{'{title}'}</span> — Tytuł materiału</div>
                          <div><span className="text-primary">{'{description}'}</span> — Opis materiału</div>
                          <div><span className="text-primary">{'{share_url}'}</span> — Link do materiału</div>
                          <div><span className="text-primary">{'{otp_code}'}</span> — Kod dostępu OTP</div>
                          <div><span className="text-primary">{'{validity_hours}'}</span> — Czas ważności (godz.)</div>
                          <div><span className="text-primary">{'{partner_name}'}</span> — Imię partnera</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Flags */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingMaterial.is_active ?? true}
                    onCheckedChange={(v) => setEditingMaterial({
                      ...editingMaterial,
                      is_active: v,
                    })}
                  />
                  <Label>Aktywny</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingMaterial.is_featured || false}
                    onCheckedChange={(v) => setEditingMaterial({
                      ...editingMaterial,
                      is_featured: v,
                    })}
                  />
                  <Label>Wyróżniony</Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HealthyKnowledgeManagement;
