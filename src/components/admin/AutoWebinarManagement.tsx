import React, { useState, useEffect, useRef } from 'react';
import { MediaUpload } from '@/components/MediaUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, GripVertical, Radio, Settings, ArrowUp, ArrowDown, Link2, ExternalLink, Copy, Check, Power, Eye, Palette, FileText, Image, Upload, ImageIcon, X, Video } from 'lucide-react';
import type { AutoWebinarVideo, AutoWebinarConfig } from '@/types/autoWebinar';
import { cn } from '@/lib/utils';
import { AdminMediaLibrary } from '@/components/admin/AdminMediaLibrary';

interface LinkedEvent {
  id: string;
  title: string;
  slug: string | null;
  is_active: boolean;
}

export const AutoWebinarManagement: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [videos, setVideos] = useState<AutoWebinarVideo[]>([]);
  const [config, setConfig] = useState<AutoWebinarConfig | null>(null);
  const [linkedEvent, setLinkedEvent] = useState<LinkedEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<AutoWebinarVideo | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [invitationClickCount, setInvitationClickCount] = useState<number>(0);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    video_url: '',
    duration_seconds: 0,
    thumbnail_url: '',
    host_name: '',
    cover_image_url: '',
  });

  // Invitation form state
  const [invitationForm, setInvitationForm] = useState({
    invitation_title: '',
    invitation_description: '',
    invitation_image_url: '',
  });

  // Room form state
  const [roomForm, setRoomForm] = useState({
    room_title: '',
    room_subtitle: '',
    room_background_color: '#000000',
    room_show_live_badge: true,
    room_show_schedule_info: true,
    room_logo_url: '',
    countdown_label: 'Następny webinar za',
    room_custom_section_title: '',
    room_custom_section_content: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  // Sync forms when config loads
  useEffect(() => {
    if (config) {
      setInvitationForm({
        invitation_title: config.invitation_title || '',
        invitation_description: config.invitation_description || '',
        invitation_image_url: config.invitation_image_url || '',
      });
      setRoomForm({
        room_title: config.room_title || 'Webinar NA ŻYWO',
        room_subtitle: config.room_subtitle || '',
        room_background_color: config.room_background_color || '#000000',
        room_show_live_badge: config.room_show_live_badge !== false,
        room_show_schedule_info: config.room_show_schedule_info !== false,
        room_logo_url: config.room_logo_url || '',
        countdown_label: config.countdown_label || 'Następny webinar za',
        room_custom_section_title: config.room_custom_section_title || '',
        room_custom_section_content: config.room_custom_section_content || '',
      });
    }
  }, [config]);

  const loadData = async () => {
    setLoading(true);
    const [videosRes, configRes] = await Promise.all([
      supabase.from('auto_webinar_videos').select('*').order('sort_order', { ascending: true }),
      supabase.from('auto_webinar_config').select('*').limit(1).maybeSingle(),
    ]);
    setVideos((videosRes.data as AutoWebinarVideo[]) || []);
    const cfg = configRes.data as AutoWebinarConfig | null;
    setConfig(cfg);

    // Load linked event if exists
    if (cfg?.event_id) {
      const [eventRes, clicksRes] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, slug, is_active')
          .eq('id', cfg.event_id)
          .single(),
        supabase
          .from('auto_webinar_invitation_clicks')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', cfg.event_id),
      ]);
      const eventData = eventRes.data;
      setLinkedEvent(eventData as LinkedEvent | null);
      setInvitationClickCount(clicksRes.count || 0);

      // Auto-fix: if system is disabled but event is still active, deactivate it
      if (eventData && !cfg.is_enabled && eventData.is_active) {
        await supabase.from('events').update({ is_active: false }).eq('id', eventData.id);
        setLinkedEvent({ ...(eventData as LinkedEvent), is_active: false });
      }
    } else {
      setLinkedEvent(null);
      setInvitationClickCount(0);
    }
    setLoading(false);
  };

  const ensureConfig = async (): Promise<AutoWebinarConfig> => {
    if (config) return config;
    const { data, error } = await supabase
      .from('auto_webinar_config')
      .insert({ is_enabled: false })
      .select()
      .single();
    if (error) throw error;
    const newConfig = data as AutoWebinarConfig;
    setConfig(newConfig);
    return newConfig;
  };

  const handleToggleEnabled = async () => {
    const cfg = await ensureConfig();
    const newEnabled = !cfg.is_enabled;
    const { error } = await supabase
      .from('auto_webinar_config')
      .update({ is_enabled: newEnabled, updated_at: new Date().toISOString() })
      .eq('id', cfg.id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    if (cfg.event_id) {
      await supabase.from('events').update({ is_active: newEnabled }).eq('id', cfg.event_id);
      if (linkedEvent) {
        setLinkedEvent({ ...linkedEvent, is_active: newEnabled });
      }
    }
    setConfig({ ...cfg, is_enabled: newEnabled });
    toast({ title: 'Sukces', description: `Auto-webinary ${newEnabled ? 'włączone' : 'wyłączone'}` });
  };

  const handleUpdateConfig = async (updates: Partial<AutoWebinarConfig>) => {
    const cfg = await ensureConfig();
    const { error } = await supabase
      .from('auto_webinar_config')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', cfg.id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    setConfig({ ...cfg, ...updates });
    toast({ title: 'Zapisano' });
  };

  const handleSaveInvitation = async () => {
    const cfg = await ensureConfig();
    const updates: Record<string, any> = {
      invitation_title: invitationForm.invitation_title || null,
      invitation_description: invitationForm.invitation_description || null,
      invitation_image_url: invitationForm.invitation_image_url || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('auto_webinar_config')
      .update(updates)
      .eq('id', cfg.id);

    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }

    // Sync with linked event
    if (cfg.event_id) {
      const eventUpdates: Record<string, any> = {};
      if (invitationForm.invitation_title) {
        eventUpdates.title = invitationForm.invitation_title;
        // Update slug based on title
        const newSlug = slugify(invitationForm.invitation_title) + '-' + Math.random().toString(36).substring(2, 6);
        eventUpdates.slug = newSlug;
      }
      if (invitationForm.invitation_description) eventUpdates.description = invitationForm.invitation_description;
      if (Object.keys(eventUpdates).length > 0) {
        await supabase.from('events').update(eventUpdates).eq('id', cfg.event_id);
        if (linkedEvent) {
          setLinkedEvent({ 
            ...linkedEvent, 
            ...(eventUpdates.title ? { title: eventUpdates.title } : {}),
            ...(eventUpdates.slug ? { slug: eventUpdates.slug } : {}),
          });
        }
      }
    }

    setConfig({ ...cfg, ...updates });
    toast({ title: 'Zapisano', description: 'Treść zaproszenia zaktualizowana' });
  };

  const handleSaveRoom = async () => {
    const cfg = await ensureConfig();
    const updates: Record<string, any> = {
      room_title: roomForm.room_title || null,
      room_subtitle: roomForm.room_subtitle || null,
      room_background_color: roomForm.room_background_color || '#000000',
      room_show_live_badge: roomForm.room_show_live_badge,
      room_show_schedule_info: roomForm.room_show_schedule_info,
      room_logo_url: roomForm.room_logo_url || null,
      countdown_label: roomForm.countdown_label || 'Następny webinar za',
      room_custom_section_title: roomForm.room_custom_section_title || null,
      room_custom_section_content: roomForm.room_custom_section_content || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('auto_webinar_config')
      .update(updates)
      .eq('id', cfg.id);

    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }

    setConfig({ ...cfg, ...updates });
    toast({ title: 'Zapisano', description: 'Wygląd pokoju zaktualizowany' });
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[ąàáâãäå]/g, 'a').replace(/[ćčç]/g, 'c').replace(/[ďđ]/g, 'd')
      .replace(/[ęèéêëě]/g, 'e').replace(/[ìíîï]/g, 'i').replace(/[łľ]/g, 'l')
      .replace(/[ńňñ]/g, 'n').replace(/[óòôõö]/g, 'o').replace(/[řŕ]/g, 'r')
      .replace(/[śšş]/g, 's').replace(/[ťţ]/g, 't').replace(/[ůùúûü]/g, 'u')
      .replace(/[ýÿ]/g, 'y').replace(/[źżž]/g, 'z')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `auto-webinar-logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('cms-images')
      .upload(fileName, file, { cacheControl: '3600' });

    if (uploadError) {
      toast({ title: 'Błąd uploadu', description: uploadError.message, variant: 'destructive' });
      return;
    }

    const { data: urlData } = supabase.storage.from('cms-images').getPublicUrl(fileName);
    setRoomForm(prev => ({ ...prev, room_logo_url: urlData.publicUrl }));
    toast({ title: 'Logo przesłane' });
  };

  const handleCreateLinkedEvent = async () => {
    if (!user) return;
    setCreatingEvent(true);
    try {
      const cfg = await ensureConfig();
      const titleForSlug = invitationForm.invitation_title || roomForm.room_title;
      if (!titleForSlug) {
        toast({ title: 'Błąd', description: 'Wypełnij tytuł zaproszenia przed utworzeniem wydarzenia', variant: 'destructive' });
        setCreatingEvent(false);
        return;
      }
      const slug = slugify(titleForSlug) + '-' + Math.random().toString(36).substring(2, 6);
      const now = new Date();
      const farFuture = new Date(now.getFullYear() + 10, 0, 1);

      const eventTitle = invitationForm.invitation_title || roomForm.room_title;
      const eventDescription = invitationForm.invitation_description || 'Dołącz do webinarów — nowe sesje startują regularnie.';

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          title: eventTitle,
          description: eventDescription,
          event_type: 'auto_webinar',
          start_time: now.toISOString(),
          end_time: farFuture.toISOString(),
          is_active: true,
          visible_to_everyone: true,
          visible_to_partners: true,
          visible_to_specjalista: true,
          visible_to_clients: true,
          requires_registration: true,
          allow_invites: true,
          created_by: user.id,
          slug,
          is_published: false,
        })
        .select('id, title, slug, is_active')
        .single();

      if (eventError) throw eventError;

      const { error: linkError } = await supabase
        .from('auto_webinar_config')
        .update({ event_id: eventData.id, updated_at: new Date().toISOString() })
        .eq('id', cfg.id);

      if (linkError) throw linkError;

      setLinkedEvent(eventData as LinkedEvent);
      setConfig({ ...cfg, event_id: eventData.id });
      toast({ title: 'Sukces', description: 'Wydarzenie auto-webinar utworzone i powiązane' });
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    } finally {
      setCreatingEvent(false);
    }
  };

  const copyInviteLink = async () => {
    if (!linkedEvent?.slug) return;
    const link = `https://purelife.info.pl/e/${linkedEvent.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({ title: 'Skopiowano link zaproszeniowy' });
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({ title: 'Skopiowano link zaproszeniowy' });
    }
  };

  const handleToggleEventActive = async () => {
    if (!linkedEvent) return;
    const newActive = !linkedEvent.is_active;
    const { error } = await supabase
      .from('events')
      .update({ is_active: newActive })
      .eq('id', linkedEvent.id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    setLinkedEvent({ ...linkedEvent, is_active: newActive });
    toast({ title: 'Sukces', description: `Wydarzenie ${newActive ? 'włączone' : 'wyłączone'}` });
  };

  const handleDeleteLinkedEvent = async () => {
    if (!linkedEvent || !config) return;
    await supabase.from('events').update({ is_active: false }).eq('id', linkedEvent.id);
    await supabase.from('auto_webinar_config').update({ event_id: null, updated_at: new Date().toISOString() }).eq('id', config.id);
    setLinkedEvent(null);
    setConfig({ ...config, event_id: null });
    toast({ title: 'Usunięto', description: 'Wydarzenie zostało wyłączone i odpięte' });
  };

  const handleSaveVideo = async () => {
    if (!videoForm.title || !videoForm.video_url) {
      toast({ title: 'Błąd', description: 'Tytuł i URL wideo są wymagane', variant: 'destructive' });
      return;
    }

    if (editingVideo) {
      const { error } = await supabase
        .from('auto_webinar_videos')
        .update({
          title: videoForm.title,
          description: videoForm.description || null,
          video_url: videoForm.video_url,
          duration_seconds: videoForm.duration_seconds,
          thumbnail_url: videoForm.thumbnail_url || null,
          host_name: videoForm.host_name || null,
          cover_image_url: videoForm.cover_image_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingVideo.id);
      if (error) {
        toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const maxOrder = videos.length > 0 ? Math.max(...videos.map(v => v.sort_order)) + 1 : 0;
      const { error } = await supabase
        .from('auto_webinar_videos')
        .insert({
          title: videoForm.title,
          description: videoForm.description || null,
          video_url: videoForm.video_url,
          duration_seconds: videoForm.duration_seconds,
          thumbnail_url: videoForm.thumbnail_url || null,
          host_name: videoForm.host_name || null,
          cover_image_url: videoForm.cover_image_url || null,
          sort_order: maxOrder,
          uploaded_by: user?.id,
        });
      if (error) {
        toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
        return;
      }
    }

    toast({ title: 'Sukces', description: editingVideo ? 'Wideo zaktualizowane' : 'Wideo dodane' });
    setVideoDialogOpen(false);
    resetVideoForm();
    loadData();
  };

  const handleDeleteVideo = async (id: string) => {
    const { error } = await supabase.from('auto_webinar_videos').delete().eq('id', id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Usunięto' });
    loadData();
  };

  const handleToggleVideoActive = async (video: AutoWebinarVideo) => {
    const { error } = await supabase
      .from('auto_webinar_videos')
      .update({ is_active: !video.is_active })
      .eq('id', video.id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    loadData();
  };

  const handleMoveVideo = async (video: AutoWebinarVideo, direction: 'up' | 'down') => {
    const idx = videos.findIndex(v => v.id === video.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= videos.length) return;

    const otherVideo = videos[swapIdx];
    await Promise.all([
      supabase.from('auto_webinar_videos').update({ sort_order: otherVideo.sort_order }).eq('id', video.id),
      supabase.from('auto_webinar_videos').update({ sort_order: video.sort_order }).eq('id', otherVideo.id),
    ]);
    loadData();
  };

  const openEditVideo = (video: AutoWebinarVideo) => {
    setEditingVideo(video);
    setVideoForm({
      title: video.title,
      description: video.description || '',
      video_url: video.video_url,
      duration_seconds: video.duration_seconds,
      thumbnail_url: video.thumbnail_url || '',
      host_name: video.host_name || '',
      cover_image_url: video.cover_image_url || '',
    });
    setVideoDialogOpen(true);
  };

  const resetVideoForm = () => {
    setEditingVideo(null);
    setVideoForm({ title: '', description: '', video_url: '', duration_seconds: 0, thumbnail_url: '', host_name: '', cover_image_url: '' });
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8 text-muted-foreground">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Config section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Konfiguracja Auto-Webinarów
          </CardTitle>
          <CardDescription>
            Automatyczne odtwarzanie nagrań MP4 w cyklach godzinnych
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>System włączony</Label>
              <p className="text-sm text-muted-foreground">Użytkownicy mogą dołączać do auto-webinarów</p>
            </div>
            <Switch checked={config?.is_enabled ?? false} onCheckedChange={handleToggleEnabled} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Godzina startu</Label>
              <Select
                value={String(config?.start_hour ?? 8)}
                onValueChange={(v) => handleUpdateConfig({ start_hour: parseInt(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>{i}:00</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Godzina zakończenia</Label>
              <Select
                value={String(config?.end_hour ?? 22)}
                onValueChange={(v) => handleUpdateConfig({ end_hour: parseInt(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}:00</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Interwał odtwarzania</Label>
              <Select
                value={String(config?.interval_minutes ?? 60)}
                onValueChange={(v) => handleUpdateConfig({ interval_minutes: parseInt(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Co 30 minut</SelectItem>
                  <SelectItem value="60">Co 1 godzinę</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tryb playlisty</Label>
              <Select
                value={config?.playlist_mode ?? 'sequential'}
                onValueChange={(v) => handleUpdateConfig({ playlist_mode: v as 'sequential' | 'random' })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Sekwencyjny</SelectItem>
                  <SelectItem value="random">Losowy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Role visibility */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-semibold">Widoczność dla ról</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Administrator</Label>
                <Switch checked={true} disabled />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Partnerzy</Label>
                <Switch
                  checked={config?.visible_to_partners ?? true}
                  onCheckedChange={(v) => handleUpdateConfig({ visible_to_partners: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Specjaliści</Label>
                <Switch
                  checked={config?.visible_to_specjalista ?? true}
                  onCheckedChange={(v) => handleUpdateConfig({ visible_to_specjalista: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Klienci</Label>
                <Switch
                  checked={config?.visible_to_clients ?? true}
                  onCheckedChange={(v) => handleUpdateConfig({ visible_to_clients: v })}
                />
              </div>
            </div>
          </div>

          {/* Calendar visibility */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <Label>Widoczne w kalendarzu</Label>
              <p className="text-sm text-muted-foreground">Pokazuj wydarzenie w kalendarzu i liście wydarzeń</p>
            </div>
            <Switch
              checked={config?.show_in_calendar ?? false}
              onCheckedChange={async (v) => {
                await handleUpdateConfig({ show_in_calendar: v });
                if (config?.event_id) {
                  await supabase.from('events').update({ is_published: v }).eq('id', config.event_id);
                }
              }}
              disabled={!config?.event_id}
            />
          </div>

          <div>
            <Label>Wiadomość powitalna (opcjonalna)</Label>
            <Textarea
              value={config?.welcome_message ?? ''}
              onChange={(e) => handleUpdateConfig({ welcome_message: e.target.value || null })}
              placeholder="Wyświetlana podczas oczekiwania na następny webinar..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invitation Content Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Treść zaproszenia
          </CardTitle>
          <CardDescription>
            Personalizuj tytuł, opis i obraz zaproszenia widocznego dla uczestników
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-4">
              <div>
                <Label>Tytuł zaproszenia</Label>
                <Input
                  value={invitationForm.invitation_title}
                  onChange={(e) => setInvitationForm(prev => ({ ...prev, invitation_title: e.target.value }))}
                  placeholder="np. Webinar — Sekret Sukcesu"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tytuł widoczny w wydarzeniu i zaproszeniach
                </p>
              </div>
              <div>
                <Label>Opis zaproszenia</Label>
                <Textarea
                  value={invitationForm.invitation_description}
                  onChange={(e) => setInvitationForm(prev => ({ ...prev, invitation_description: e.target.value }))}
                  placeholder="Opisz czego dotyczy webinar..."
                  rows={3}
                />
              </div>
              <div>
                <Label>URL obrazu / banera</Label>
                <Input
                  value={invitationForm.invitation_image_url}
                  onChange={(e) => setInvitationForm(prev => ({ ...prev, invitation_image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <Button onClick={handleSaveInvitation}>
                Zapisz treść zaproszenia
              </Button>
            </div>

            {/* Invitation Preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Eye className="h-4 w-4" />
                Podgląd zaproszenia
              </div>
              <div className="rounded-xl border bg-card overflow-hidden">
                {invitationForm.invitation_image_url && (
                  <div className="aspect-video bg-muted">
                    <img
                      src={invitationForm.invitation_image_url}
                      alt="Baner"
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <Badge variant="secondary" className="text-xs">Webinar</Badge>
                  <h3 className="font-semibold text-lg">
                    {invitationForm.invitation_title || 'Uzupełnij tytuł zaproszenia'}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {invitationForm.invitation_description || 'Dołącz do automatycznych webinarów — nowe sesje startują co godzinę.'}
                  </p>
                  {linkedEvent?.slug && (
                    <div className="mt-2 pt-2 border-t border-dashed">
                      <a 
                        href={`https://purelife.info.pl/e/${linkedEvent.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        🔗 Zapisz się: https://purelife.info.pl/e/{linkedEvent.slug}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Wygląd pokoju webinarowego
          </CardTitle>
          <CardDescription>
            Personalizuj wygląd pokoju, w którym uczestnicy oglądają webinar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-4">
              <div>
                <Label>Tytuł pokoju</Label>
                <Input
                  value={roomForm.room_title}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, room_title: e.target.value }))}
                  placeholder="Webinar NA ŻYWO"
                />
              </div>
              <div>
                <Label>Podtytuł</Label>
                <Input
                  value={roomForm.room_subtitle}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, room_subtitle: e.target.value }))}
                  placeholder="np. Sesje odbywają się co godzinę"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kolor tła wideo</Label>
                  <div className="flex gap-2 items-center mt-1">
                    <input
                      type="color"
                      value={roomForm.room_background_color}
                      onChange={(e) => setRoomForm(prev => ({ ...prev, room_background_color: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={roomForm.room_background_color}
                      onChange={(e) => setRoomForm(prev => ({ ...prev, room_background_color: e.target.value }))}
                      className="flex-1"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div>
                  <Label>Etykieta odliczania</Label>
                  <Input
                    value={roomForm.countdown_label}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, countdown_label: e.target.value }))}
                    placeholder="Następny webinar za"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Logo pokoju (opcjonalnie)</Label>
                {roomForm.room_logo_url ? (
                  <div className="flex items-center gap-3 mt-2">
                    <img src={roomForm.room_logo_url} alt="Logo" className="h-12 w-12 rounded-lg object-cover border" />
                    <Button variant="ghost" size="icon" onClick={() => setRoomForm(prev => ({ ...prev, room_logo_url: '' }))}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-1">
                    <Button variant="outline" size="sm" onClick={() => setLogoPickerOpen(true)}>
                      <ImageIcon className="h-4 w-4 mr-1" />
                      Z biblioteki
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => logoFileRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" />
                      Z komputera
                    </Button>
                    <input
                      ref={logoFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadLogo}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Badge „NA ŻYWO"</Label>
                  <p className="text-xs text-muted-foreground">Pokaż pulsujący badge podczas transmisji</p>
                </div>
                <Switch
                  checked={roomForm.room_show_live_badge}
                  onCheckedChange={(v) => setRoomForm(prev => ({ ...prev, room_show_live_badge: v }))}
                />
              </div>
              {/* Custom section */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Sekcja własna</Label>
                  <Switch
                    checked={roomForm.room_show_schedule_info}
                    onCheckedChange={(v) => setRoomForm(prev => ({ ...prev, room_show_schedule_info: v }))}
                  />
                </div>
                <div>
                  <Label>Tytuł sekcji</Label>
                  <Input
                    value={roomForm.room_custom_section_title}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, room_custom_section_title: e.target.value }))}
                    placeholder="np. O czym jest ten webinar?"
                  />
                </div>
                <div>
                  <Label>Treść sekcji</Label>
                  <Textarea
                    value={roomForm.room_custom_section_content}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, room_custom_section_content: e.target.value }))}
                    placeholder="Opisz treść wyświetlaną uczestnikom..."
                    rows={3}
                  />
                </div>
              </div>
              <Button onClick={handleSaveRoom}>
                Zapisz wygląd pokoju
              </Button>
            </div>

            {/* Room Preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Eye className="h-4 w-4" />
                Podgląd pokoju webinarowego
              </div>
              <div className="rounded-xl border bg-card overflow-hidden">
                {/* Header preview */}
                <div className="p-3 flex items-center justify-between border-b">
                  <div className="flex items-center gap-2">
                    {roomForm.room_logo_url ? (
                      <img src={roomForm.room_logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div className="p-1.5 rounded-lg bg-destructive/10">
                        <Radio className="h-4 w-4 text-destructive" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold leading-tight">{roomForm.room_title || 'Webinar NA ŻYWO'}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{roomForm.room_subtitle || `Co godzinę ${config?.start_hour ?? 8}:00 – ${config?.end_hour ?? 22}:00`}</p>
                    </div>
                  </div>
                  {roomForm.room_show_live_badge && (
                    <Badge variant="destructive" className="text-[10px] gap-1 py-0.5 px-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-background" />
                      NA ŻYWO
                    </Badge>
                  )}
                </div>
                {/* Video area preview */}
                <div className="aspect-video flex items-center justify-center relative" style={{ backgroundColor: roomForm.room_background_color }}>
                  <div className="text-center space-y-1">
                    <Radio className="h-8 w-8 text-white/30 mx-auto" />
                    <p className="text-white/40 text-xs">Obszar wideo</p>
                  </div>
                </div>
                {/* Custom section preview */}
                {roomForm.room_show_schedule_info && roomForm.room_custom_section_title && roomForm.room_custom_section_content && (
                  <div className="p-3 border-t">
                    <p className="text-[10px] font-medium mb-1">{roomForm.room_custom_section_title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-3">{roomForm.room_custom_section_content}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Linking Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Wydarzenie i zaproszenia
          </CardTitle>
          <CardDescription>
            Utwórz wydarzenie, aby partnerzy mogli zapraszać gości. Link zaproszeniowy pojawi się automatycznie w panelu partnera (karta wydarzenia → „Kopiuj zaproszenie").
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkedEvent ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="font-medium">{linkedEvent.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Slug: <code className="text-xs bg-muted px-1 py-0.5 rounded">{linkedEvent.slug}</code>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Power className={cn("h-4 w-4", linkedEvent.is_active ? "text-green-500" : "text-muted-foreground")} />
                    <Switch 
                      checked={linkedEvent.is_active} 
                      onCheckedChange={handleToggleEventActive}
                    />
                  </div>
                  <Badge variant={linkedEvent.is_active ? 'default' : 'secondary'}>
                    {linkedEvent.is_active ? 'Aktywne' : 'Nieaktywne'}
                  </Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usuń wydarzenie auto-webinar</AlertDialogTitle>
                        <AlertDialogDescription>
                          Wydarzenie zostanie wyłączone i odpięte od systemu auto-webinarów. 
                          Użytkownicy nie będą go widzieć. Możesz później utworzyć nowe wydarzenie.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteLinkedEvent}>Usuń</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div>
                <Label className="text-sm">Link zaproszeniowy</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    readOnly
                    value={`https://purelife.info.pl/e/${linkedEvent.slug}`}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyInviteLink}>
                    {copiedLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Partnerzy mogą dodać <code>?ref=EQID</code> do linku, aby śledzić zaproszenia.
                  Link jest również dostępny w panelu zaproszeń partnera.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground">
                Brak powiązanego wydarzenia. Utwórz wydarzenie, aby partnerzy mogli zapraszać gości na auto-webinary.
              </p>
              <Button onClick={handleCreateLinkedEvent} disabled={creatingEvent}>
                <Plus className="h-4 w-4 mr-2" />
                {creatingEvent ? 'Tworzenie...' : 'Utwórz wydarzenie Auto-Webinar'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Videos list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5" />
                Playlista wideo ({videos.length})
              </CardTitle>
              <CardDescription>Filmy MP4 odtwarzane cyklicznie</CardDescription>
            </div>
            <Button onClick={() => { resetVideoForm(); setVideoDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj wideo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak filmów w playliście. Dodaj pierwszy film MP4.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Lp.</TableHead>
                  <TableHead className="w-16">Miniaturka</TableHead>
                  <TableHead>Tytuł</TableHead>
                  <TableHead>Prowadzący</TableHead>
                  <TableHead>Czas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video, idx) => (
                  <TableRow key={video.id} className={!video.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        {idx + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(video.thumbnail_url || video.cover_image_url) ? (
                        <img
                          src={video.thumbnail_url || video.cover_image_url || ''}
                          alt={video.title}
                          className="w-14 h-10 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-14 h-10 rounded border bg-muted flex items-center justify-center">
                          <Video className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{video.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{video.host_name || '—'}</TableCell>
                    <TableCell>{formatDuration(video.duration_seconds)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={video.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleVideoActive(video)}
                      >
                        {video.is_active ? 'Aktywny' : 'Nieaktywny'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleMoveVideo(video, 'up')} disabled={idx === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleMoveVideo(video, 'down')} disabled={idx === videos.length - 1}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditVideo(video)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteVideo(video.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Video Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVideo ? 'Edytuj wideo' : 'Dodaj nowe wideo'}</DialogTitle>
            <DialogDescription>
              Dodaj nagranie MP4 do playlisty auto-webinarów
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tytuł *</Label>
              <Input
                value={videoForm.title}
                onChange={(e) => setVideoForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Nazwa webinaru"
              />
            </div>
            <div>
              <Label>Opis</Label>
              <Textarea
                value={videoForm.description}
                onChange={(e) => setVideoForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Krótki opis..."
                rows={2}
              />
            </div>
            <div>
              <Label>Plik wideo (MP4) *</Label>
              <MediaUpload
                onMediaUploaded={(url, type, altText, durationSeconds) => {
                  setVideoForm(prev => ({
                    ...prev,
                    video_url: url,
                    duration_seconds: durationSeconds || prev.duration_seconds
                  }));
                }}
                currentMediaUrl={videoForm.video_url}
                currentMediaType="video"
                allowedTypes={['video']}
                compact
              />
              {videoForm.video_url && videoForm.duration_seconds > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Wykryty czas: {Math.floor(videoForm.duration_seconds / 60)}:{String(videoForm.duration_seconds % 60).padStart(2, '0')}
                </p>
              )}
              {videoForm.video_url && videoForm.duration_seconds === 0 && (
                <div className="mt-2">
                  <Label className="text-xs">Czas trwania (sekundy) — nie wykryto automatycznie</Label>
                  <Input
                    type="number"
                    value={videoForm.duration_seconds}
                    onChange={(e) => setVideoForm(prev => ({ ...prev, duration_seconds: parseInt(e.target.value) || 0 }))}
                    placeholder="3600"
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
            <div>
              <Label>URL miniaturki (opcjonalnie)</Label>
              <Input
                value={videoForm.thumbnail_url}
                onChange={(e) => setVideoForm(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Prowadzący</Label>
              <Input
                value={videoForm.host_name}
                onChange={(e) => setVideoForm(prev => ({ ...prev, host_name: e.target.value }))}
                placeholder="np. Jan Kowalski"
              />
            </div>
            <div>
              <Label>Okładka webinaru (URL)</Label>
              <Input
                value={videoForm.cover_image_url}
                onChange={(e) => setVideoForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
                placeholder="https://..."
              />
              {videoForm.cover_image_url && (
                <img src={videoForm.cover_image_url} alt="Okładka" className="mt-2 w-full h-32 object-cover rounded border" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoDialogOpen(false)}>Anuluj</Button>
            <Button onClick={handleSaveVideo}>
              {editingVideo ? 'Zapisz zmiany' : 'Dodaj wideo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logo Picker Dialog */}
      <Dialog open={logoPickerOpen} onOpenChange={setLogoPickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wybierz logo z biblioteki mediów</DialogTitle>
          </DialogHeader>
          <AdminMediaLibrary
            mode="picker"
            allowedTypes={['image']}
            onSelect={(file) => {
              setRoomForm(prev => ({ ...prev, room_logo_url: file.file_url }));
              setLogoPickerOpen(false);
              toast({ title: 'Logo wybrane' });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
