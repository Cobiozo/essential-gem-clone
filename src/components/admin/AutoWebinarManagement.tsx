import React, { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, GripVertical, Radio, Upload, Settings, ArrowUp, ArrowDown } from 'lucide-react';
import type { AutoWebinarVideo, AutoWebinarConfig } from '@/types/autoWebinar';

export const AutoWebinarManagement: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [videos, setVideos] = useState<AutoWebinarVideo[]>([]);
  const [config, setConfig] = useState<AutoWebinarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<AutoWebinarVideo | null>(null);
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    video_url: '',
    duration_seconds: 0,
    thumbnail_url: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [videosRes, configRes] = await Promise.all([
      supabase.from('auto_webinar_videos').select('*').order('sort_order', { ascending: true }),
      supabase.from('auto_webinar_config').select('*').limit(1).maybeSingle(),
    ]);
    setVideos((videosRes.data as AutoWebinarVideo[]) || []);
    setConfig((configRes.data as AutoWebinarConfig | null));
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
    const { error } = await supabase
      .from('auto_webinar_config')
      .update({ is_enabled: !cfg.is_enabled, updated_at: new Date().toISOString() })
      .eq('id', cfg.id);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    setConfig({ ...cfg, is_enabled: !cfg.is_enabled });
    toast({ title: 'Sukces', description: `Auto-webinary ${!cfg.is_enabled ? 'włączone' : 'wyłączone'}` });
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
    });
    setVideoDialogOpen(true);
  };

  const resetVideoForm = () => {
    setEditingVideo(null);
    setVideoForm({ title: '', description: '', video_url: '', duration_seconds: 0, thumbnail_url: '' });
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <TableHead>Tytuł</TableHead>
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
                    <TableCell className="font-medium">{video.title}</TableCell>
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
              <Label>URL wideo (MP4) *</Label>
              <Input
                value={videoForm.video_url}
                onChange={(e) => setVideoForm(prev => ({ ...prev, video_url: e.target.value }))}
                placeholder="https://purelife.info.pl/uploads/..."
              />
            </div>
            <div>
              <Label>Czas trwania (sekundy)</Label>
              <Input
                type="number"
                value={videoForm.duration_seconds}
                onChange={(e) => setVideoForm(prev => ({ ...prev, duration_seconds: parseInt(e.target.value) || 0 }))}
                placeholder="3600"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Np. 3600 = 60 minut. Ważne do synchronizacji odtwarzania.
              </p>
            </div>
            <div>
              <Label>URL miniaturki (opcjonalnie)</Label>
              <Input
                value={videoForm.thumbnail_url}
                onChange={(e) => setVideoForm(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                placeholder="https://..."
              />
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
    </div>
  );
};
