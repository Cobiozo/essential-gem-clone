import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AutoWebinarEmbed } from '@/components/auto-webinar/AutoWebinarEmbed';
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
import { Plus, Pencil, Trash2, GripVertical, Radio, Settings, ArrowUp, ArrowDown, Link2, ExternalLink, Copy, Check, Power, Eye, Palette, FileText, Image, Upload, ImageIcon, X, Video, Monitor, Users, MessageSquare, AlertTriangle } from 'lucide-react';
import type { AutoWebinarVideo, AutoWebinarConfig, AutoWebinarFakeMessage } from '@/types/autoWebinar';
import { cn } from '@/lib/utils';
import { AdminMediaLibrary } from '@/components/admin/AdminMediaLibrary';
import { AutoWebinarGuestStats } from '@/components/admin/AutoWebinarGuestStats';

interface LinkedEvent {
  id: string;
  title: string;
  slug: string | null;
  is_active: boolean;
}

interface AutoWebinarManagementProps {
  category: 'business_opportunity' | 'health_conversation';
}

export const AutoWebinarManagement: React.FC<AutoWebinarManagementProps> = ({ category }) => {
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
  const [logo2PickerOpen, setLogo2PickerOpen] = useState(false);
  const [invitationClickCount, setInvitationClickCount] = useState<number>(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoPreviewTitle, setVideoPreviewTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);
  const [invitationBaseUrl, setInvitationBaseUrl] = useState('https://purelife.info.pl/e/');
  const logoFileRef = useRef<HTMLInputElement>(null);
  const logo2FileRef = useRef<HTMLInputElement>(null);
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
    room_logo_url_2: '',
    countdown_label: 'Następny webinar za',
    room_custom_section_title: '',
    room_custom_section_content: '',
  });

  // Fake participants/chat state
  const [fakeParticipantsEnabled, setFakeParticipantsEnabled] = useState(true);
  const [fakeParticipantsMin, setFakeParticipantsMin] = useState(45);
  const [fakeParticipantsMax, setFakeParticipantsMax] = useState(120);
  const [fakeChatEnabled, setFakeChatEnabled] = useState(true);
  const [fakeMessages, setFakeMessages] = useState<AutoWebinarFakeMessage[]>([]);
  const [fakeMessageForm, setFakeMessageForm] = useState({ appear_at_minute: 0, author_name: '', content: '', phase: 'during' as 'welcome' | 'during' | 'ending' });
  const [editingFakeMessage, setEditingFakeMessage] = useState<AutoWebinarFakeMessage | null>(null);

  useEffect(() => {
    loadData();
  }, [category]);

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
        room_logo_url_2: (config as any).room_logo_url_2 || '',
        countdown_label: config.countdown_label || 'Następny webinar za',
        room_custom_section_title: config.room_custom_section_title || '',
        room_custom_section_content: config.room_custom_section_content || '',
      });
      setFakeParticipantsEnabled(config.fake_participants_enabled !== false);
      setFakeParticipantsMin(config.fake_participants_min || 45);
      setFakeParticipantsMax(config.fake_participants_max || 120);
      setFakeChatEnabled(config.fake_chat_enabled !== false);
      loadFakeMessages(config.id);
    }
  }, [config]);

  const loadFakeMessages = async (configId: string) => {
    const { data } = await supabase
      .from('auto_webinar_fake_messages')
      .select('*')
      .eq('config_id', configId)
      .order('appear_at_minute', { ascending: true })
      .order('sort_order', { ascending: true });
    setFakeMessages((data as AutoWebinarFakeMessage[]) || []);
  };

  const handleSaveFakeParticipants = async () => {
    await handleUpdateConfig({
      fake_participants_enabled: fakeParticipantsEnabled,
      fake_participants_min: fakeParticipantsMin,
      fake_participants_max: fakeParticipantsMax,
    } as Partial<AutoWebinarConfig>);
  };

  const handleSaveFakeChat = async () => {
    await handleUpdateConfig({
      fake_chat_enabled: fakeChatEnabled,
    } as Partial<AutoWebinarConfig>);
  };

  const handleAddFakeMessage = async () => {
    if (!config || !fakeMessageForm.author_name || !fakeMessageForm.content) return;
    const { error } = await supabase.from('auto_webinar_fake_messages').insert({
      config_id: config.id,
      appear_at_minute: fakeMessageForm.appear_at_minute,
      author_name: fakeMessageForm.author_name,
      content: fakeMessageForm.content,
      phase: fakeMessageForm.phase,
      sort_order: fakeMessages.length,
    });
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    setFakeMessageForm({ appear_at_minute: 0, author_name: '', content: '', phase: 'during' });
    loadFakeMessages(config.id);
    toast({ title: 'Dodano wiadomość' });
  };

  const handleDeleteFakeMessage = async (id: string) => {
    if (!config) return;
    await supabase.from('auto_webinar_fake_messages').delete().eq('id', id);
    loadFakeMessages(config.id);
    toast({ title: 'Usunięto' });
  };

  const handleStartEditFakeMessage = (msg: AutoWebinarFakeMessage) => {
    setEditingFakeMessage(msg);
    setFakeMessageForm({
      appear_at_minute: msg.appear_at_minute,
      author_name: msg.author_name,
      content: msg.content,
      phase: (msg.phase as 'welcome' | 'during' | 'ending') || 'during',
    });
  };

  const handleSaveEditFakeMessage = async () => {
    if (!config || !editingFakeMessage) return;
    const { error } = await supabase
      .from('auto_webinar_fake_messages')
      .update({
        appear_at_minute: fakeMessageForm.appear_at_minute,
        author_name: fakeMessageForm.author_name,
        content: fakeMessageForm.content,
        phase: fakeMessageForm.phase,
      })
      .eq('id', editingFakeMessage.id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    setEditingFakeMessage(null);
    setFakeMessageForm({ appear_at_minute: 0, author_name: '', content: '', phase: 'during' });
    loadFakeMessages(config.id);
    toast({ title: 'Zapisano zmiany' });
  };

  const handleCancelEditFakeMessage = () => {
    setEditingFakeMessage(null);
    setFakeMessageForm({ appear_at_minute: 0, author_name: '', content: '', phase: 'during' });
  };

  const handleLoadDefaultMessages = async () => {
    if (!config) return;
    const defaults = [
      // Początkowe (minuta 0-2)
      { m: 0, a: 'Anna K.', c: 'Dzień dobry! 👋' },
      { m: 0, a: 'Marek W.', c: 'Witam serdecznie' },
      { m: 0, a: 'Katarzyna P.', c: 'Cześć wszystkim!' },
      { m: 1, a: 'Tomasz B.', c: 'Pozdrowienia z Łodzi 🙂' },
      { m: 1, a: 'Joanna M.', c: 'Witam, pierwszy raz tutaj' },
      { m: 1, a: 'Piotr S.', c: 'Dzień dobry, pozdrawiam z Krakowa' },
      { m: 2, a: 'Ewa L.', c: 'Witam wszystkich!' },
      { m: 2, a: 'Robert N.', c: 'Hej, cieszę się że mogę uczestniczyć' },
      { m: 2, a: 'Agnieszka D.', c: 'Pozdrawiam z Gdańska!' },
      { m: 3, a: 'Michał Z.', c: 'Super, że mogę tu być 💪' },
      // Środkowe (minuta 5-25)
      { m: 5, a: 'Anna K.', c: 'Bardzo ciekawe!' },
      { m: 7, a: 'Katarzyna P.', c: 'Świetna prezentacja' },
      { m: 8, a: 'Tomasz B.', c: 'Dokładnie tak!' },
      { m: 10, a: 'Joanna M.', c: 'To ma sens, dziękuję za wyjaśnienie' },
      { m: 12, a: 'Piotr S.', c: 'Wow, nie wiedziałem o tym' },
      { m: 14, a: 'Ewa L.', c: 'Mega wartościowe informacje 🔥' },
      { m: 15, a: 'Robert N.', c: 'Czy to dotyczy też nowych osób?' },
      { m: 17, a: 'Marek W.', c: 'Zgadzam się w 100%' },
      { m: 18, a: 'Agnieszka D.', c: 'Bardzo przydatna wiedza' },
      { m: 20, a: 'Michał Z.', c: 'Notuję sobie wszystko 📝' },
      { m: 22, a: 'Anna K.', c: 'To zmienia perspektywę!' },
      { m: 24, a: 'Katarzyna P.', c: 'Super przykłady!' },
      { m: 25, a: 'Tomasz B.', c: 'Najlepszy webinar jaki widziałem' },
      { m: 27, a: 'Joanna M.', c: 'Bardzo profesjonalnie' },
      { m: 28, a: 'Piotr S.', c: 'Właśnie o tym chciałem się dowiedzieć' },
      { m: 30, a: 'Robert N.', c: 'Fantastyczne podejście' },
      { m: 32, a: 'Ewa L.', c: 'Konkretna wiedza, zero lania wody' },
      { m: 35, a: 'Marek W.', c: 'To jest naprawdę wartościowe 👏' },
      // Końcowe (minuta 40+)
      { m: 40, a: 'Agnieszka D.', c: 'Dziękuję za super spotkanie! 🙏' },
      { m: 40, a: 'Michał Z.', c: 'Dzięki za wiedzę!' },
      { m: 41, a: 'Anna K.', c: 'Bardzo dziękuję, dużo się dowiedziałam' },
      { m: 41, a: 'Katarzyna P.', c: 'Dziękuję! Na pewno się odezwę do partnera który mnie tu zaprosił' },
      { m: 42, a: 'Tomasz B.', c: 'Super spotkanie, pozdrawiam!' },
      { m: 42, a: 'Joanna M.', c: 'Dziękuję za poświęcony czas' },
      { m: 43, a: 'Piotr S.', c: 'Do widzenia! Do zobaczenia następnym razem 👋' },
      { m: 43, a: 'Ewa L.', c: 'Świetne spotkanie, dziękuję!' },
      { m: 44, a: 'Robert N.', c: 'Bardzo inspirujące, będę polecać' },
      { m: 44, a: 'Marek W.', c: 'Dziękuję, do następnego razu!' },
      { m: 45, a: 'Agnieszka D.', c: 'Pozdrawiam i dziękuję! 🌟' },
      { m: 45, a: 'Michał Z.', c: 'Dzięki wielkie, na pewno wrócę!' },
    ];

    const rows = defaults.map((d, i) => ({
      config_id: config.id,
      appear_at_minute: d.m,
      author_name: d.a,
      content: d.c,
      phase: d.m <= 3 ? 'welcome' : d.m >= 40 ? 'ending' : 'during',
      sort_order: i,
    }));

    const { error } = await supabase.from('auto_webinar_fake_messages').insert(rows);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    loadFakeMessages(config.id);
    toast({ title: 'Załadowano domyślne wiadomości', description: `Dodano ${defaults.length} wiadomości` });
  };

  const loadData = async () => {
    setLoading(true);
    // First load config to know the config_id for filtering videos
    const configRes = await supabase.from('auto_webinar_config').select('*').eq('category', category).maybeSingle();
    const cfg = configRes.data as AutoWebinarConfig | null;
    setConfig(cfg);

    // Load videos filtered by config_id
    if (cfg) {
      const videosRes = await supabase.from('auto_webinar_videos').select('*').eq('config_id', cfg.id).order('sort_order', { ascending: true });
      setVideos((videosRes.data as AutoWebinarVideo[]) || []);
    } else {
      setVideos([]);
    }

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
      setEditSlug(eventData?.slug || '');
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
      .insert({ is_enabled: false, category })
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
      room_logo_url_2: roomForm.room_logo_url_2 || null,
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
    const link = `${invitationBaseUrl}${editSlug || linkedEvent.slug}`;
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
    if (!videoForm.duration_seconds || videoForm.duration_seconds <= 0) {
      toast({ title: 'Błąd', description: 'Czas trwania wideo jest wymagany. Wpisz ręcznie liczbę sekund jeśli nie został wykryty automatycznie.', variant: 'destructive' });
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
      const cfg = await ensureConfig();
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
          config_id: cfg.id,
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
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Monitor className="h-4 w-4 mr-1" /> Podgląd
              </Button>
              <Switch checked={config?.is_enabled ?? false} onCheckedChange={handleToggleEnabled} />
            </div>
          </div>

          {/* Slot Hours Configuration */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Godziny emisji (sloty)</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Wybierz konkretne godziny, w których webinar będzie dostępny. Goście otrzymają linki z przypisaną godziną.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: 24 }, (_, h) => {
                  const times = ['00', '30'];
                  return times.map(m => {
                    const timeStr = `${String(h).padStart(2, '0')}:${m}`;
                    const currentSlots = (config as any)?.slot_hours as string[] || [];
                    const isSelected = currentSlots.includes(timeStr);
                    return (
                      <Button
                        key={timeStr}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs px-2 py-1 h-7"
                        onClick={() => {
                          const newSlots = isSelected
                            ? currentSlots.filter((s: string) => s !== timeStr)
                            : [...currentSlots, timeStr].sort();
                          handleUpdateConfig({ slot_hours: newSlots } as any);
                        }}
                      >
                        {timeStr}
                      </Button>
                    );
                  });
                })}
              </div>
              {((config as any)?.slot_hours as string[] || []).length > 0 && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Aktywne sloty: {((config as any)?.slot_hours as string[]).sort().join(', ')}
                  </Badge>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Pokój otwiera się (min przed)</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={(config as any)?.room_open_minutes_before ?? 5}
                  onChange={(e) => handleUpdateConfig({ room_open_minutes_before: parseInt(e.target.value) || 5 } as any)}
                />
                <p className="text-xs text-muted-foreground mt-1">Ile minut przed startem gość widzi countdown</p>
              </div>
              <div>
                <Label>Odliczanie precyzyjne (min przed)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={(config as any)?.countdown_minutes_before ?? 2}
                  onChange={(e) => handleUpdateConfig({ countdown_minutes_before: parseInt(e.target.value) || 2 } as any)}
                />
                <p className="text-xs text-muted-foreground mt-1">Odliczanie co 1 sekundę</p>
              </div>
              <div>
                <Label>Wygaśnięcie linku (min po starcie)</Label>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  value={(config as any)?.link_expiry_minutes ?? 10}
                  onChange={(e) => handleUpdateConfig({ link_expiry_minutes: parseInt(e.target.value) || 10 } as any)}
                />
                <p className="text-xs text-muted-foreground mt-1">Link wygasa po tylu minutach od startu slotu</p>
              </div>
            </div>

            {/* Legacy fallback info */}
            {((config as any)?.slot_hours as string[] || []).length === 0 && (
              <div className="border rounded-lg p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  ⚠️ Brak zdefiniowanych godzin emisji. System używa trybu legacy: co {config?.interval_minutes || 60} min od {config?.start_hour}:00 do {config?.end_hour}:00.
                  Dodaj godziny emisji powyżej, aby przejść na nowy system z walidacją linków.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label>Logo 1 (opcjonalnie)</Label>
                {roomForm.room_logo_url ? (
                  <div className="flex items-center gap-3 mt-2">
                    <img src={roomForm.room_logo_url} alt="Logo 1" className="h-12 w-12 rounded-lg object-cover border" />
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
              <div>
                <Label>Logo 2 (opcjonalnie)</Label>
                {roomForm.room_logo_url_2 ? (
                  <div className="flex items-center gap-3 mt-2">
                    <img src={roomForm.room_logo_url_2} alt="Logo 2" className="h-12 w-12 rounded-lg object-cover border" />
                    <Button variant="ghost" size="icon" onClick={() => setRoomForm(prev => ({ ...prev, room_logo_url_2: '' }))}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-1">
                    <Button variant="outline" size="sm" onClick={() => setLogo2PickerOpen(true)}>
                      <ImageIcon className="h-4 w-4 mr-1" />
                      Z biblioteki
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => logo2FileRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" />
                      Z komputera
                    </Button>
                    <input
                      ref={logo2FileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        e.target.value = '';
                        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
                        const fileName = `auto-webinar-logo2-${Date.now()}.${ext}`;
                        const { error: uploadError } = await supabase.storage.from('cms-images').upload(fileName, file, { cacheControl: '3600' });
                        if (uploadError) { toast({ title: 'Błąd uploadu', description: uploadError.message, variant: 'destructive' }); return; }
                        const { data: urlData } = supabase.storage.from('cms-images').getPublicUrl(fileName);
                        setRoomForm(prev => ({ ...prev, room_logo_url_2: urlData.publicUrl }));
                        toast({ title: 'Logo 2 przesłane' });
                      }}
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
                    {(roomForm.room_logo_url || roomForm.room_logo_url_2) ? (
                      <div className="flex items-center gap-1.5">
                        {roomForm.room_logo_url && <img src={roomForm.room_logo_url} alt="" className="h-8 max-w-[100px] object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                        {roomForm.room_logo_url_2 && <img src={roomForm.room_logo_url_2} alt="" className="h-8 max-w-[100px] object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                      </div>
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

      {/* Fake Participants Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Fikcyjni uczestnicy
          </CardTitle>
          <CardDescription>
            Wyświetlaj fikcyjną liczbę uczestników w prawym górnym rogu odtwarzacza
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Włącz licznik uczestników</Label>
              <p className="text-xs text-muted-foreground">Pokaż fikcyjną liczbę osób na webinarze</p>
            </div>
            <Switch checked={fakeParticipantsEnabled} onCheckedChange={setFakeParticipantsEnabled} />
          </div>
          {fakeParticipantsEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minimum uczestników</Label>
                <Input
                  type="number"
                  value={fakeParticipantsMin}
                  onChange={(e) => setFakeParticipantsMin(parseInt(e.target.value) || 0)}
                  min={1}
                />
              </div>
              <div>
                <Label>Maksimum uczestników</Label>
                <Input
                  type="number"
                  value={fakeParticipantsMax}
                  onChange={(e) => setFakeParticipantsMax(parseInt(e.target.value) || 0)}
                  min={1}
                />
              </div>
            </div>
          )}
          <Button onClick={handleSaveFakeParticipants}>Zapisz ustawienia uczestników</Button>
        </CardContent>
      </Card>

      {/* Fake Chat Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Czat fikcyjny
          </CardTitle>
          <CardDescription>
            Automatyczne wiadomości od fikcyjnych uczestników pojawiające się wg harmonogramu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Włącz czat fikcyjny</Label>
              <p className="text-xs text-muted-foreground">Wysuwany panel czatu z automatycznymi wiadomościami</p>
            </div>
            <Switch checked={fakeChatEnabled} onCheckedChange={setFakeChatEnabled} />
          </div>
          <Button onClick={handleSaveFakeChat} variant="outline" size="sm">Zapisz ustawienia czatu</Button>

          {fakeChatEnabled && (
            <>
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Wiadomości ({fakeMessages.length})</Label>
                  <Button variant="outline" size="sm" onClick={handleLoadDefaultMessages}>
                    <Plus className="h-4 w-4 mr-1" />
                    Załaduj domyślne
                  </Button>
                </div>

                {/* Add message form */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-2">
                    <Label className="text-xs">Faza</Label>
                    <select
                      value={fakeMessageForm.phase}
                      onChange={(e) => setFakeMessageForm(p => ({ ...p, phase: e.target.value as 'welcome' | 'during' | 'ending' }))}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="welcome">Powitalne</option>
                      <option value="during">W trakcie</option>
                      <option value="ending">Na koniec</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Min.</Label>
                    <Input
                      type="number"
                      value={fakeMessageForm.appear_at_minute}
                      onChange={(e) => setFakeMessageForm(p => ({ ...p, appear_at_minute: parseInt(e.target.value) || 0 }))}
                      min={0}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Autor</Label>
                    <Input
                      value={fakeMessageForm.author_name}
                      onChange={(e) => setFakeMessageForm(p => ({ ...p, author_name: e.target.value }))}
                      placeholder="Jan K."
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs">Treść</Label>
                    <Input
                      value={fakeMessageForm.content}
                      onChange={(e) => setFakeMessageForm(p => ({ ...p, content: e.target.value }))}
                      placeholder="Dzień dobry!"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-2 flex gap-1">
                    {editingFakeMessage ? (
                      <>
                        <Button size="sm" className="flex-1 h-8" onClick={handleSaveEditFakeMessage} disabled={!fakeMessageForm.author_name || !fakeMessageForm.content}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8" onClick={handleCancelEditFakeMessage}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="w-full h-8" onClick={handleAddFakeMessage} disabled={!fakeMessageForm.author_name || !fakeMessageForm.content}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Messages grouped by phase */}
                {fakeMessages.length > 0 && (
                  <div className="space-y-3">
                    {([
                      { phase: 'welcome' as const, label: '🟢 Powitalne', color: 'text-green-600' },
                      { phase: 'during' as const, label: '🔵 W trakcie', color: 'text-blue-600' },
                      { phase: 'ending' as const, label: '🟠 Na koniec', color: 'text-orange-600' },
                    ]).map(({ phase, label, color }) => {
                      const phaseMessages = fakeMessages.filter(m => (m.phase || 'during') === phase);
                      if (phaseMessages.length === 0) return null;
                      return (
                        <div key={phase}>
                          <p className={`text-xs font-semibold mb-1 ${color}`}>{label} ({phaseMessages.length})</p>
                          <div className="max-h-40 overflow-y-auto border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16 text-xs">Min.</TableHead>
                                  <TableHead className="w-28 text-xs">Autor</TableHead>
                                  <TableHead className="text-xs">Treść</TableHead>
                                 <TableHead className="w-20 text-xs"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {phaseMessages.map((msg) => (
                                  <TableRow key={msg.id} className={editingFakeMessage?.id === msg.id ? 'bg-muted/50' : ''}>
                                    <TableCell className="text-xs font-mono">{msg.appear_at_minute}</TableCell>
                                    <TableCell className="text-xs font-medium">{msg.author_name}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{msg.content}</TableCell>
                                    <TableCell>
                                      <div className="flex gap-0.5">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleStartEditFakeMessage(msg)}>
                                          <Pencil className="h-3 w-3 text-muted-foreground" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteFakeMessage(msg.id)}>
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
                <Label className="text-sm">Slug wydarzenia</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={editSlug || linkedEvent.slug || ''}
                    onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="font-mono text-sm"
                    placeholder="np. webinar-biznesowy"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingSlug || !editSlug || editSlug === linkedEvent.slug}
                    onClick={async () => {
                      if (!editSlug || !linkedEvent) return;
                      setSavingSlug(true);
                      const { error } = await supabase
                        .from('events')
                        .update({ slug: editSlug })
                        .eq('id', linkedEvent.id);
                      setSavingSlug(false);
                      if (error) {
                        toast({ title: 'Błąd zapisu slugu', description: error.message, variant: 'destructive' });
                      } else {
                        setLinkedEvent({ ...linkedEvent, slug: editSlug });
                        toast({ title: 'Slug zapisany' });
                      }
                    }}
                  >
                    {savingSlug ? 'Zapisuję...' : 'Zapisz'}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm">Bazowy URL zaproszeniowy</Label>
                <Input
                  value={invitationBaseUrl}
                  onChange={(e) => setInvitationBaseUrl(e.target.value)}
                  className="font-mono text-sm mt-1"
                  placeholder="https://purelife.info.pl/e/"
                />
              </div>

              <div>
                <Label className="text-sm">Link zaproszeniowy (podgląd)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    readOnly
                    value={`${invitationBaseUrl}${editSlug || linkedEvent.slug || ''}`}
                    className="font-mono text-sm bg-muted"
                  />
                  <Button variant="outline" size="icon" onClick={copyInviteLink}>
                    {copiedLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Partnerzy mogą dodać <code>?ref=EQID</code> do linku, aby śledzić zaproszenia.
                  Link jest również dostępny w panelu zaproszeń partnera.
                </p>
                {invitationClickCount > 0 && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
                    <Badge variant="secondary" className="text-xs">
                      {invitationClickCount} kliknięć
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Każde kliknięcie z parametrem <code>?ref=EQID</code> jest logowane
                    </span>
                  </div>
                )}
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

      {/* Guest Stats */}
      <AutoWebinarGuestStats />

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
                    <TableCell>
                      {video.duration_seconds > 0 ? (
                        formatDuration(video.duration_seconds)
                      ) : (
                        <span className="text-destructive font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          0:00 — wymaga poprawy
                        </span>
                      )}
                    </TableCell>
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
                        <Button variant="ghost" size="sm" onClick={() => { setVideoPreviewUrl(video.video_url); setVideoPreviewTitle(video.title); }} title="Podgląd wideo">
                          <Eye className="h-4 w-4 text-blue-500" />
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
                    duration_seconds: durationSeconds ?? 0
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
              <Label>Okładka webinaru</Label>
              <MediaUpload
                onMediaUploaded={(url) => {
                  setVideoForm(prev => ({ ...prev, cover_image_url: url }));
                }}
                currentMediaUrl={videoForm.cover_image_url}
                currentMediaType="image"
                allowedTypes={['image']}
                compact
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

      {/* Logo 1 Picker Dialog */}
      <Dialog open={logoPickerOpen} onOpenChange={setLogoPickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wybierz logo 1 z biblioteki mediów</DialogTitle>
          </DialogHeader>
          <AdminMediaLibrary
            mode="picker"
            allowedTypes={['image']}
            onSelect={(file) => {
              setRoomForm(prev => ({ ...prev, room_logo_url: file.file_url }));
              setLogoPickerOpen(false);
              toast({ title: 'Logo 1 wybrane' });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Logo 2 Picker Dialog */}
      <Dialog open={logo2PickerOpen} onOpenChange={setLogo2PickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wybierz logo 2 z biblioteki mediów</DialogTitle>
          </DialogHeader>
          <AdminMediaLibrary
            mode="picker"
            allowedTypes={['image']}
            onSelect={(file) => {
              setRoomForm(prev => ({ ...prev, room_logo_url_2: file.file_url }));
              setLogo2PickerOpen(false);
              toast({ title: 'Logo 2 wybrane' });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Admin Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Podgląd pokoju webinarowego
            </DialogTitle>
            <DialogDescription>
              Tryb podglądu — odtwarza pierwszy aktywny film niezależnie od harmonogramu
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-4">
            <AutoWebinarEmbed previewMode category={category} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={!!videoPreviewUrl} onOpenChange={(open) => { if (!open) setVideoPreviewUrl(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Podgląd: {videoPreviewTitle}
            </DialogTitle>
          </DialogHeader>
          {videoPreviewUrl && (
            <video
              src={videoPreviewUrl}
              controls
              autoPlay
              className="w-full rounded-lg"
              style={{ maxHeight: '70vh' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
