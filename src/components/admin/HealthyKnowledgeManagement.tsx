import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  Heart, Plus, Search, Edit2, Trash2, Eye, EyeOff, Upload, 
  Loader2, FileText, Play, Image, Music, Type, Share2, 
  Star, StarOff, MoreHorizontal, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  HealthyKnowledge, 
  HkOtpCode,
  HEALTHY_KNOWLEDGE_CATEGORIES, 
  CONTENT_TYPE_LABELS, 
  DEFAULT_SHARE_MESSAGE_TEMPLATE,
  ContentType
} from '@/types/healthyKnowledge';

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
  
  // Form state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Partial<HealthyKnowledge> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // OTP codes tab state
  const [otpCodes, setOtpCodes] = useState<HkOtpCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

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
    return materials.filter(m => 
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materials, searchTerm]);

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
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (material: HealthyKnowledge) => {
    setEditingMaterial({ ...material });
    setEditDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMaterial) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `materials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('healthy-knowledge')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('healthy-knowledge')
        .getPublicUrl(filePath);

      setEditingMaterial({
        ...editingMaterial,
        media_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
      });

      toast.success('Plik przesłany');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Nie udało się przesłać pliku');
    } finally {
      setUploading(false);
    }
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
        const { error } = await supabase
          .from('healthy_knowledge')
          .insert(insertData as any);

        if (error) throw error;
        toast.success('Materiał utworzony');
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

      <Tabs defaultValue="materials" onValueChange={(v) => v === 'codes' && fetchOtpCodes()}>
        <TabsList>
          <TabsTrigger value="materials">Materiały ({materials.length})</TabsTrigger>
          <TabsTrigger value="codes">Kody OTP</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj materiałów..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
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
                          <div>
                            <p className="font-medium">{material.title}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {material.description || 'Brak opisu'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {CONTENT_TYPE_LABELS[material.content_type as ContentType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {material.category || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
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

                <div className="grid grid-cols-2 gap-4">
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
                </div>

                {/* File Upload */}
                {editingMaterial.content_type !== 'text' && (
                  <div>
                    <Label>Plik</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        accept={
                          editingMaterial.content_type === 'video' ? 'video/*' :
                          editingMaterial.content_type === 'audio' ? 'audio/*' :
                          editingMaterial.content_type === 'image' ? 'image/*' :
                          '.pdf,.doc,.docx'
                        }
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                    {editingMaterial.file_name && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Aktualny plik: {editingMaterial.file_name}
                      </p>
                    )}
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
                <div className="grid grid-cols-2 gap-4">
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
              </div>

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
                  <div className="grid grid-cols-2 gap-4 pt-2">
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
