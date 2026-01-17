import React, { useState, useEffect, useCallback } from 'react';
import { Link2, Plus, Pencil, Trash2, Save, Copy, Check, ArrowUpDown, Eye, Users, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { ReflinksForm } from './ReflinksForm';
import { UserReflinksSettings } from './UserReflinksSettings';
import { OtpCodesManagement } from './OtpCodesManagement';

interface VisibilitySettings {
  client: boolean;
  partner: boolean;
  specjalista: boolean;
}

interface Reflink {
  id: string;
  target_role: string;
  reflink_code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  title: string | null;
  image_url: string | null;
  link_url: string | null;
  link_type: string;
  visible_to_roles: string[];
  position: number;
  clipboard_content: string | null;
  // OTP/InfoLink fields
  requires_otp?: boolean;
  slug?: string | null;
  welcome_message?: string | null;
  pre_otp_message?: string | null;
  protected_content?: string | null;
  otp_validity_hours?: number;
  otp_max_sessions?: number;
  infolink_url_type?: string | null;
  infolink_url?: string | null;
}

const availableRoles = [
  { value: 'partner', label: 'Partner' },
  { value: 'specjalista', label: 'Specjalista' },
  { value: 'client', label: 'Klient' },
];

export const ReflinksManagement: React.FC = () => {
  const { t } = useLanguage();
  const [reflinks, setReflinks] = useState<Reflink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReflink, setEditingReflink] = useState<Reflink | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>({
    client: false,
    partner: false,
    specjalista: false,
  });
  const [newReflink, setNewReflink] = useState({
    target_role: 'klient',
    reflink_code: '',
    description: '',
    title: '',
    image_url: '',
    link_url: '',
    link_type: 'reflink',
    visible_to_roles: ['partner', 'specjalista'] as string[],
    position: 0,
    clipboard_content: '',
    // OTP/InfoLink fields
    requires_otp: true,
    slug: '',
    welcome_message: '',
    pre_otp_message: '',
    protected_content: '',
    otp_validity_hours: 24,
    otp_max_sessions: 1,
    infolink_url_type: 'external',
    infolink_url: '',
  });
  const { toast } = useToast();

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      klient: t('roles.client'),
      partner: t('roles.partner'),
      specjalista: t('roles.specialist'),
      client: t('roles.client'),
    };
    return labels[role] || role;
  };

  const getLinkTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      reflink: t('admin.reflinks.typeReflink'),
      internal: t('admin.reflinks.typeInternal'),
      external: t('admin.reflinks.typeExternal'),
      clipboard: t('admin.reflinks.typeClipboard'),
      infolink: t('admin.reflinks.typeInfolink'),
    };
    return labels[type] || type;
  };

  useEffect(() => {
    fetchReflinks();
    fetchVisibilitySettings();
  }, []);

  const fetchVisibilitySettings = async () => {
    const { data, error } = await supabase
      .from('reflinks_visibility_settings')
      .select('role, button_visible');

    if (error) {
      console.error('Error fetching visibility settings:', error);
      return;
    }

    if (data) {
      const settings: VisibilitySettings = { client: false, partner: false, specjalista: false };
      data.forEach(item => {
        if (item.role in settings) {
          settings[item.role as keyof VisibilitySettings] = item.button_visible;
        }
      });
      setVisibilitySettings(settings);
    }
  };

  const handleToggleButtonVisibility = async (role: string, visible: boolean) => {
    const { error } = await supabase
      .from('reflinks_visibility_settings')
      .update({ button_visible: visible, updated_at: new Date().toISOString() })
      .eq('role', role);

    if (error) {
      console.error('Error updating visibility:', error);
      toast({
        title: t('toast.error'),
        description: t('admin.reflinks.visibilityChangeFailed'),
        variant: 'destructive',
      });
      return;
    }

    setVisibilitySettings(prev => ({ ...prev, [role]: visible }));
    toast({
      title: t('toast.saved'),
      description: t('admin.reflinks.visibilityChanged'),
    });
  };

  const fetchReflinks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reflinks')
      .select('*')
      .order('target_role')
      .order('position');

    if (error) {
      console.error('Error fetching reflinks:', error);
      toast({
        title: t('toast.error'),
        description: t('admin.reflinks.fetchFailed'),
        variant: 'destructive',
      });
    } else {
      setReflinks(data || []);
    }
    setLoading(false);
  };

  const getFullReflink = (code: string) => {
    return `${window.location.origin}/auth?ref=${code}`;
  };

  const getLinkDisplay = (reflink: Reflink) => {
    if (reflink.link_type === 'reflink') {
      return getFullReflink(reflink.reflink_code);
    }
    return reflink.link_url || '';
  };

  const handleCopy = async (reflink: Reflink) => {
    let description: string;
    
    if (reflink.link_type === 'clipboard') {
      const content = reflink.clipboard_content || '';
      description = t('admin.reflinks.contentCopied');
      
      try {
        const blob = new Blob([content], { type: 'text/html' });
        const plainBlob = new Blob([content.replace(/<[^>]*>/g, '')], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blob,
            'text/plain': plainBlob
          })
        ]);
      } catch {
        await navigator.clipboard.writeText(content.replace(/<[^>]*>/g, ''));
      }
    } else {
      const textToCopy = getLinkDisplay(reflink);
      description = textToCopy;
      await navigator.clipboard.writeText(textToCopy);
    }
    
    setCopiedId(reflink.id);
    toast({
      title: t('toast.copied'),
      description,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddReflink = async () => {
    if (newReflink.link_type === 'reflink' && !newReflink.reflink_code.trim()) {
      toast({
        title: t('toast.error'),
        description: t('admin.reflinks.codeRequired'),
        variant: 'destructive',
      });
      return;
    }

    if ((newReflink.link_type === 'internal' || newReflink.link_type === 'external') && !newReflink.link_url.trim()) {
      toast({
        title: t('toast.error'),
        description: t('admin.reflinks.urlRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (newReflink.link_type === 'clipboard' && !newReflink.clipboard_content?.trim()) {
      toast({
        title: t('toast.error'),
        description: t('admin.reflinks.clipboardContentRequired'),
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('reflinks')
      .insert({
        target_role: newReflink.target_role,
        reflink_code: newReflink.reflink_code.trim() || `link-${Date.now()}`,
        description: newReflink.description.trim() || null,
        title: newReflink.title.trim() || null,
        image_url: newReflink.image_url.trim() || null,
        link_url: newReflink.link_url.trim() || null,
        link_type: newReflink.link_type,
        visible_to_roles: newReflink.visible_to_roles,
        position: newReflink.position,
        clipboard_content: newReflink.clipboard_content?.trim() || null,
        is_active: true,
        // OTP/InfoLink fields
        requires_otp: newReflink.requires_otp ?? true,
        slug: newReflink.slug?.trim() || null,
        welcome_message: newReflink.welcome_message?.trim() || null,
        pre_otp_message: newReflink.pre_otp_message?.trim() || null,
        protected_content: newReflink.protected_content?.trim() || null,
        otp_validity_hours: newReflink.otp_validity_hours ?? 24,
        otp_max_sessions: newReflink.otp_max_sessions ?? 1,
        infolink_url_type: newReflink.infolink_url_type || 'external',
        infolink_url: newReflink.infolink_url?.trim() || null,
      });

    if (error) {
      console.error('Error adding reflink:', error);
      toast({
        title: t('toast.error'),
        description: error.message.includes('unique') 
          ? t('admin.reflinks.codeExists') 
          : t('admin.reflinks.addFailed'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('toast.success'),
        description: t('admin.reflinks.added'),
      });
      setShowAddDialog(false);
      setNewReflink({ 
        target_role: 'klient', 
        reflink_code: '', 
        description: '',
        title: '',
        image_url: '',
        link_url: '',
        link_type: 'reflink',
        visible_to_roles: ['partner', 'specjalista'],
        position: 0,
        clipboard_content: '',
        requires_otp: true,
        slug: '',
        welcome_message: '',
        pre_otp_message: '',
        protected_content: '',
        otp_validity_hours: 24,
        otp_max_sessions: 1,
        infolink_url_type: 'external',
        infolink_url: '',
      });
      fetchReflinks();
    }
  };

  const handleUpdateReflink = async () => {
    if (!editingReflink) return;

    const { error } = await supabase
      .from('reflinks')
      .update({
        target_role: editingReflink.target_role,
        reflink_code: editingReflink.reflink_code.trim(),
        description: editingReflink.description?.trim() || null,
        title: editingReflink.title?.trim() || null,
        image_url: editingReflink.image_url?.trim() || null,
        link_url: editingReflink.link_url?.trim() || null,
        link_type: editingReflink.link_type,
        visible_to_roles: editingReflink.visible_to_roles,
        position: editingReflink.position,
        clipboard_content: editingReflink.clipboard_content?.trim() || null,
        is_active: editingReflink.is_active,
        // OTP/InfoLink fields
        requires_otp: editingReflink.requires_otp ?? true,
        slug: editingReflink.slug?.trim() || null,
        welcome_message: editingReflink.welcome_message?.trim() || null,
        pre_otp_message: editingReflink.pre_otp_message?.trim() || null,
        protected_content: editingReflink.protected_content?.trim() || null,
        otp_validity_hours: editingReflink.otp_validity_hours ?? 24,
        otp_max_sessions: editingReflink.otp_max_sessions ?? 1,
        infolink_url_type: editingReflink.infolink_url_type || 'external',
        infolink_url: editingReflink.infolink_url?.trim() || null,
      })
      .eq('id', editingReflink.id);

    if (error) {
      console.error('Error updating reflink:', error);
      toast({
        title: t('toast.error'),
        description: error.message.includes('unique') 
          ? t('admin.reflinks.codeExists') 
          : t('admin.reflinks.updateFailed'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('toast.success'),
        description: t('admin.reflinks.updated'),
      });
      setEditingReflink(null);
      fetchReflinks();
    }
  };

  const handleDeleteReflink = async (id: string) => {
    if (!confirm(t('admin.reflinks.deleteConfirm'))) return;

    const { error } = await supabase
      .from('reflinks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting reflink:', error);
      toast({
        title: t('toast.error'),
        description: t('admin.reflinks.deleteFailed'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('toast.success'),
        description: t('admin.reflinks.deleted'),
      });
      fetchReflinks();
    }
  };

  const handleToggleActive = async (reflink: Reflink) => {
    const { error } = await supabase
      .from('reflinks')
      .update({ is_active: !reflink.is_active })
      .eq('id', reflink.id);

    if (error) {
      console.error('Error toggling reflink:', error);
      toast({
        title: t('toast.error'),
        description: t('admin.reflinks.statusChangeFailed'),
        variant: 'destructive',
      });
    } else {
      fetchReflinks();
    }
  };


  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Tabs defaultValue="global" className="space-y-4">
      <TabsList>
        <TabsTrigger value="global">
          <Link2 className="w-4 h-4 mr-2" />
          {t('admin.reflinks.globalReflinks')}
        </TabsTrigger>
        <TabsTrigger value="user">
          <Users className="w-4 h-4 mr-2" />
          {t('admin.reflinks.userLinks')}
        </TabsTrigger>
        <TabsTrigger value="otp">
          <Key className="w-4 h-4 mr-2" />
          {t('admin.reflinks.otpCodes')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="global">
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              {t('admin.reflinks.management')}
            </CardTitle>
            <CardDescription>
              {t('admin.reflinks.description')}
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {t('admin.reflinks.addReflink')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('admin.reflinks.addNewReflink')}</DialogTitle>
                <DialogDescription>
                  {t('admin.reflinks.addNewDescription')}
                </DialogDescription>
              </DialogHeader>
              <ReflinksForm 
                initialData={newReflink} 
                onDataChange={(data) => setNewReflink(data as typeof newReflink)}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleAddReflink}>
                  <Save className="w-4 h-4 mr-2" />
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Visibility settings section */}
        <div className="mb-6 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <Label className="font-medium">{t('admin.reflinks.buttonVisibility')}</Label>
          </div>
          <div className="flex flex-wrap gap-4">
            {(['client', 'partner', 'specjalista'] as const).map(role => (
              <div key={role} className="flex items-center gap-2">
                <Switch
                  checked={visibilitySettings[role]}
                  onCheckedChange={(checked) => handleToggleButtonVisibility(role, checked)}
                />
                <Label className="text-sm">{getRoleLabel(role)}</Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t('admin.reflinks.buttonVisibilityHint')}
          </p>
        </div>

        <Separator className="mb-6" />

        {reflinks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {t('admin.reflinks.noReflinks')}
          </p>
        ) : (
          <div className="space-y-3">
            {reflinks.map((reflink) => (
              <div
                key={reflink.id}
                className={`p-4 rounded-lg border ${
                  reflink.is_active 
                    ? 'border-border bg-card' 
                    : 'border-muted bg-muted/30 opacity-60'
                }`}
              >
                {/* Display mode - always show reflink info */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {reflink.image_url && (
                    <img 
                      src={reflink.image_url} 
                      alt="" 
                      className="w-12 h-12 rounded object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary font-medium">
                        {getRoleLabel(reflink.target_role)}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">
                        {getLinkTypeLabel(reflink.link_type)}
                      </span>
                      {reflink.position > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground flex items-center gap-1">
                          <ArrowUpDown className="w-3 h-3" />
                          {reflink.position}
                        </span>
                      )}
                    </div>
                    <p className="font-medium mt-1 truncate">
                      {reflink.title || reflink.reflink_code}
                    </p>
                    {reflink.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {reflink.description}
                      </p>
                    )}
                    {reflink.visible_to_roles && reflink.visible_to_roles.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('admin.reflinks.visibleTo')}: {reflink.visible_to_roles.map(r => getRoleLabel(r)).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(reflink)}
                    >
                      {copiedId === reflink.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Switch
                      checked={reflink.is_active}
                      onCheckedChange={() => handleToggleActive(reflink)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingReflink({ ...reflink })}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteReflink(reflink.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {/* Edit Dialog Modal */}
      <Dialog open={!!editingReflink} onOpenChange={(open) => !open && setEditingReflink(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.reflinks.editReflink')}</DialogTitle>
            <DialogDescription>
              {t('admin.reflinks.editDescription')}
            </DialogDescription>
          </DialogHeader>
          {editingReflink && (
            <>
              <ReflinksForm 
                initialData={editingReflink} 
                onDataChange={(data) => {
                  setEditingReflink(prev => {
                    if (!prev) return null;
                    return { ...prev, ...data } as Reflink;
                  });
                }}
                isEdit
              />
              <div className="flex items-center gap-2 pt-2 border-t">
                <Switch
                  checked={editingReflink.is_active}
                  onCheckedChange={(checked) => 
                    setEditingReflink(prev => prev ? { ...prev, is_active: checked } : null)
                  }
                />
                <Label>{t('common.active')}</Label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingReflink(null)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleUpdateReflink}>
                  <Save className="w-4 h-4 mr-2" />
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
      </TabsContent>

      <TabsContent value="user">
        <UserReflinksSettings />
      </TabsContent>

      <TabsContent value="otp">
        <OtpCodesManagement />
      </TabsContent>
    </Tabs>
  );
};

export default ReflinksManagement;
