import React, { useState, useEffect } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RichTextEditor } from '@/components/RichTextEditor';
import { MediaUpload } from '@/components/MediaUpload';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addMinutes, format } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { DEFAULT_EVENT_TIMEZONE } from '@/utils/timezoneHelpers';
import { 
  Calendar, 
  Bell,
  Mail,
  MessageSquare,
  Users,
  CalendarDays,
  Clock,
  Video
} from 'lucide-react';
import type { DbEvent, TeamTrainingFormData, TEAM_TRAINING_TYPES } from '@/types/events';
import type { EventOccurrence } from '@/types/occurrences';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ZoomMeetingGenerator } from './ZoomMeetingGenerator';
import { OccurrencesEditor } from './OccurrencesEditor';

interface TeamTrainingFormProps {
  editingTraining: DbEvent | null;
  onSave: () => void;
  onCancel: () => void;
}

const trainingTypes = [
  { value: 'wewnetrzny', label: 'Wewnętrzny' },
  { value: 'zewnetrzny', label: 'Zewnętrzny' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'produktowy', label: 'Produktowy' },
  { value: 'biznesowy', label: 'Biznesowy' },
];

const durationOptions = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '120 min' },
  { value: 180, label: '180 min' },
];

export const TeamTrainingForm: React.FC<TeamTrainingFormProps> = ({
  editingTraining,
  onSave,
  onCancel
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState<TeamTrainingFormData>({
    title: '',
    description: '',
    event_type: 'team_training',
    start_time: '',
    end_time: '',
    zoom_link: '',
    location: '',
    visible_to_everyone: false,
    visible_to_partners: true,
    visible_to_specjalista: true,
    visible_to_clients: false,
    image_url: '',
    buttons: [],
    max_participants: null,
    requires_registration: true,
    training_type: 'wewnetrzny',
    host_name: '',
    duration_minutes: 60,
    sms_reminder_enabled: false,
    email_reminder_enabled: true,
    is_published: true,
  });

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [remindersOpen, setRemindersOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conflictData, setConflictData] = useState<Array<{ id: string; title: string; event_type: string; host_name: string | null; conflict_start: string; conflict_end: string; team_registered_count: number }> | null>(null);
  const [pendingSaveCallback, setPendingSaveCallback] = useState<(() => Promise<void>) | null>(null);
  
  // Multi-occurrence state
  const [isMultiOccurrence, setIsMultiOccurrence] = useState(false);
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  
  // Zoom API integration state
  const [zoomMeetingId, setZoomMeetingId] = useState<string | null>(null);
  const [zoomStartUrl, setZoomStartUrl] = useState<string | null>(null);
  const [zoomPassword, setZoomPassword] = useState<string | null>(null);

  useEffect(() => {
    if (editingTraining) {
      setForm({
        title: editingTraining.title || '',
        description: editingTraining.description || '',
        event_type: 'team_training',
        start_time: editingTraining.start_time || '',
        end_time: editingTraining.end_time || '',
        zoom_link: editingTraining.zoom_link || '',
        location: editingTraining.location || '',
        visible_to_everyone: editingTraining.visible_to_everyone ?? false,
        visible_to_partners: editingTraining.visible_to_partners ?? true,
        visible_to_specjalista: editingTraining.visible_to_specjalista ?? true,
        visible_to_clients: editingTraining.visible_to_clients ?? false,
        image_url: editingTraining.image_url || '',
        buttons: Array.isArray(editingTraining.buttons) ? editingTraining.buttons as any : [],
        max_participants: editingTraining.max_participants,
        requires_registration: editingTraining.requires_registration ?? true,
        training_type: editingTraining.webinar_type || 'wewnetrzny',
        host_name: editingTraining.host_name || '',
        duration_minutes: editingTraining.duration_minutes || 60,
        sms_reminder_enabled: editingTraining.sms_reminder_enabled ?? false,
        email_reminder_enabled: editingTraining.email_reminder_enabled ?? true,
        is_published: editingTraining.is_published ?? true,
        allow_invites: editingTraining.allow_invites ?? false,
        publish_at: editingTraining.publish_at || null,
        use_internal_meeting: editingTraining.use_internal_meeting ?? false,
        meeting_room_id: editingTraining.meeting_room_id || null,
      });
      setImageUrlInput(editingTraining.image_url || '');
      
      // Load multi-occurrence data
      if (editingTraining.occurrences && Array.isArray(editingTraining.occurrences)) {
        setIsMultiOccurrence(true);
        setOccurrences(editingTraining.occurrences as unknown as EventOccurrence[]);
      } else {
        setIsMultiOccurrence(false);
        setOccurrences([]);
      }
      
      // Load existing Zoom API data (from dynamic properties)
      const trainingAny = editingTraining as any;
      setZoomMeetingId(trainingAny.zoom_meeting_id || null);
      setZoomStartUrl(trainingAny.zoom_start_url || null);
      setZoomPassword(trainingAny.zoom_password || null);
    }
  }, [editingTraining]);

  // Auto-calculate end time when start time or duration changes
  useEffect(() => {
    if (form.start_time && form.duration_minutes) {
      const startDate = new Date(form.start_time);
      const endDate = addMinutes(startDate, form.duration_minutes);
      setForm(prev => ({
        ...prev,
        end_time: endDate.toISOString()
      }));
    }
  }, [form.start_time, form.duration_minutes]);

  const handleSave = async () => {
    if (!user) return;
    if (!form.title.trim()) {
      toast({ title: 'Błąd', description: 'Tytuł jest wymagany', variant: 'destructive' });
      return;
    }
    
    // Validate based on multi-occurrence mode
    if (isMultiOccurrence) {
      if (occurrences.length === 0) {
        toast({ title: 'Błąd', description: 'Dodaj co najmniej jeden termin', variant: 'destructive' });
        return;
      }
    } else {
      if (!form.start_time) {
        toast({ title: 'Błąd', description: 'Data i godzina są wymagane', variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    try {
      // Calculate startTime/endTime BEFORE conflict validation
      let startTime = form.start_time;
      let endTime = form.end_time;
      
      if (isMultiOccurrence && occurrences.length > 0) {
        // Use first occurrence as primary start/end time for backwards compatibility
        const firstOcc = occurrences[0];
        const [year, month, day] = firstOcc.date.split('-').map(Number);
        const [hours, minutes] = firstOcc.time.split(':').map(Number);
        const startDate = new Date(year, month - 1, day, hours, minutes);
        startTime = startDate.toISOString();
        endTime = addMinutes(startDate, firstOcc.duration_minutes).toISOString();
      }

      // Check for conflicts across ALL occurrences (not just the first one)
      let conflictingEvents: { id: string; title: string; event_type: string; host_name: string | null; conflict_start: string; conflict_end: string; team_registered_count: number }[] = [];
      
      if (isMultiOccurrence && occurrences.length > 0) {
        // Check each occurrence separately and collect all conflicts
        for (const occ of occurrences) {
          const [y, m, d] = occ.date.split('-').map(Number);
          const [h, min] = occ.time.split(':').map(Number);
          const occStart = new Date(y, m - 1, d, h, min);
          const occEnd = addMinutes(occStart, occ.duration_minutes);
          
          const { data } = await supabase.rpc('check_event_conflicts', {
            p_start_time: occStart.toISOString(),
            p_end_time: occEnd.toISOString(),
            p_exclude_event_id: editingTraining?.id || null,
            p_user_id: user.id,
          });
          
          if (data?.length) {
            conflictingEvents.push(...data);
          }
        }
        // Deduplicate by id
        const seen = new Set<string>();
        conflictingEvents = conflictingEvents.filter(e => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });
      } else {
        // Single occurrence - check normally
        const { data } = await supabase.rpc('check_event_conflicts', {
          p_start_time: startTime,
          p_end_time: endTime,
          p_exclude_event_id: editingTraining?.id || null,
          p_user_id: user.id,
        });
        conflictingEvents = data || [];
      }

      const performSave = async () => {
        setSaving(true);
        try {
          const buttonsJson = form.buttons.map(b => ({ 
            label: b.label, 
            url: b.url, 
            style: b.style || 'primary' 
          }));

          const trainingData = {
            title: form.title,
            description: form.description || null,
            event_type: 'team_training' as const,
            start_time: startTime,
            end_time: endTime,
            location: form.location || null,
            zoom_link: form.use_internal_meeting ? null : (form.zoom_link || null),
            max_participants: form.max_participants,
            requires_registration: form.requires_registration,
            visible_to_partners: form.visible_to_partners,
            visible_to_specjalista: form.visible_to_specjalista,
            visible_to_clients: form.visible_to_clients,
            visible_to_everyone: form.visible_to_everyone,
            image_url: form.image_url || null,
            buttons: buttonsJson,
            webinar_type: form.training_type,
            host_name: form.host_name || null,
            duration_minutes: form.duration_minutes,
            sms_reminder_enabled: form.sms_reminder_enabled,
            email_reminder_enabled: form.email_reminder_enabled,
            is_published: form.is_published,
            occurrences: isMultiOccurrence ? JSON.parse(JSON.stringify(occurrences)) : null,
            allow_invites: form.allow_invites || false,
            publish_at: form.publish_at || null,
            use_internal_meeting: form.use_internal_meeting || false,
            meeting_room_id: form.use_internal_meeting ? (form.meeting_room_id || crypto.randomUUID()) : null,
          };

          let error;
          if (editingTraining) {
            ({ error } = await supabase
              .from('events')
              .update(trainingData)
              .eq('id', editingTraining.id));
          } else {
            ({ error } = await supabase
              .from('events')
              .insert({ ...trainingData, created_by: user.id, host_user_id: user.id }));
          }

          if (error) {
            toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
            return;
          }

          toast({ 
            title: 'Sukces', 
            description: editingTraining ? 'Szkolenie zostało zaktualizowane' : 'Szkolenie zostało dodane' 
          });
          onSave();
        } finally {
          setSaving(false);
        }
      };

      if (conflictingEvents && conflictingEvents.length > 0) {
        setConflictData(conflictingEvents);
        setPendingSaveCallback(() => performSave);
        setSaving(false);
        return;
      }

      await performSave();
    } catch (err) {
      setSaving(false);
    }
  };

  const handleImageUploaded = (url: string) => {
    setForm(prev => ({ ...prev, image_url: url }));
    setImageUrlInput(url);
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setForm(prev => ({ ...prev, image_url: imageUrlInput }));
      toast({ title: 'Sukces', description: 'URL miniatury został dodany' });
    }
  };

  return (
    <>
    <Card className="border-muted">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          {editingTraining ? 'Edytuj Szkolenie zespołu' : 'Nowe Szkolenie zespołu'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label className="text-primary font-medium">
            Tytuł <span className="text-destructive">*</span>
          </Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Nazwa szkolenia..."
            className="h-10"
          />
        </div>

        {/* Description with RichTextEditor */}
        <div className="space-y-2">
          <Label className="text-primary font-medium">
            Opis
          </Label>
          <RichTextEditor
            value={form.description}
            onChange={(value) => setForm({ ...form, description: value })}
            placeholder="Wprowadź opis szkolenia..."
            rows={5}
          />
        </div>

        {/* Multi-occurrence toggle */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
          <Switch
            checked={isMultiOccurrence}
            onCheckedChange={(checked) => {
              setIsMultiOccurrence(checked);
              if (!checked) {
                setOccurrences([]);
              }
            }}
          />
          <CalendarDays className="h-4 w-4 text-primary" />
          <div>
            <Label className="text-primary font-medium">Wydarzenie wieloterminowe</Label>
            <p className="text-xs text-muted-foreground">
              Jedno wydarzenie z wieloma datami (np. cykliczne spotkania)
            </p>
          </div>
        </div>

        {/* Occurrences Editor (multi-occurrence mode) */}
        {isMultiOccurrence ? (
          <OccurrencesEditor
            occurrences={occurrences}
            onChange={setOccurrences}
            defaultDuration={form.duration_minutes}
          />
        ) : (
          /* Date/Time and Type row (single occurrence mode) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-primary font-medium">
                Data i godzina <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={form.start_time ? format(new Date(form.start_time), "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Parse the input as time in event timezone (Europe/Warsaw)
                      const [datePart, timePart] = e.target.value.split('T');
                      const [year, month, day] = datePart.split('-').map(Number);
                      const [hours, minutes] = timePart.split(':').map(Number);
                      const localDateTime = new Date(year, month - 1, day, hours, minutes);
                      // Convert from event timezone to UTC for storage
                      const utcDateTime = fromZonedTime(localDateTime, DEFAULT_EVENT_TIMEZONE);
                      setForm({ ...form, start_time: utcDateTime.toISOString() });
                    } else {
                      setForm({ ...form, start_time: '' });
                    }
                  }}
                  className="h-10 pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground font-medium">Typ szkolenia</Label>
              <Select
                value={form.training_type || 'wewnetrzny'}
                onValueChange={(value) => setForm({ ...form, training_type: value })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Wybierz typ" />
                </SelectTrigger>
                <SelectContent>
                  {trainingTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Type selector (visible in both modes) */}
        {isMultiOccurrence && (
          <div className="space-y-2">
            <Label className="text-muted-foreground font-medium">Typ szkolenia</Label>
            <Select
              value={form.training_type || 'wewnetrzny'}
              onValueChange={(value) => setForm({ ...form, training_type: value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Wybierz typ" />
              </SelectTrigger>
              <SelectContent>
                {trainingTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Host and Duration row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground font-medium">Prowadzący</Label>
            <Input
              value={form.host_name || ''}
              onChange={(e) => setForm({ ...form, host_name: e.target.value })}
              placeholder="np. Jan Kowalski"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground font-medium">Czas trwania</Label>
            <Select
              value={form.duration_minutes.toString()}
              onValueChange={(value) => setForm({ ...form, duration_minutes: parseInt(value) })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Internal Meeting Toggle (admin only) */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
          <Switch
            checked={form.use_internal_meeting || false}
            onCheckedChange={(checked) => {
              const newForm = { ...form, use_internal_meeting: checked };
              if (checked && !newForm.meeting_room_id) {
                newForm.meeting_room_id = crypto.randomUUID();
              }
              if (checked) {
                newForm.zoom_link = '';
              }
              setForm(newForm);
            }}
          />
          <Video className="h-4 w-4 text-primary" />
          <div>
            <Label className="text-primary font-medium">Wewnętrzny pokój spotkania</Label>
            <p className="text-xs text-muted-foreground">
              Użyj wbudowanego systemu wideokonferencji zamiast Zoom
            </p>
          </div>
        </div>

        {/* Meeting Link - only show when internal meeting is OFF */}
        {!form.use_internal_meeting && (
          <div className="space-y-2">
            <Label className="text-muted-foreground font-medium">Link do spotkania (Zoom/Teams/Meet)</Label>
            <div className="flex gap-2">
              <Input
                value={form.zoom_link}
                onChange={(e) => setForm({ ...form, zoom_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
                className="h-10 flex-1"
              />
              <ZoomMeetingGenerator
                eventId={editingTraining?.id}
                eventTitle={form.title}
                startTime={form.start_time}
                duration={form.duration_minutes}
                currentZoomLink={form.zoom_link}
                existingMeetingId={zoomMeetingId}
                existingPassword={zoomPassword}
                existingStartUrl={zoomStartUrl}
                onGenerated={(data) => {
                  setForm({ ...form, zoom_link: data.join_url });
                  setZoomMeetingId(data.meeting_id);
                  setZoomStartUrl(data.start_url);
                  setZoomPassword(data.password || null);
                }}
              />
            </div>
          </div>
        )}

        {/* Location */}
        <div className="space-y-2">
          <Label className="text-muted-foreground font-medium">Lokalizacja (opcjonalnie)</Label>
          <Input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="np. Sala konferencyjna A"
            className="h-10"
          />
        </div>

        {/* Max participants */}
        <div className="space-y-2">
          <Label className="text-muted-foreground font-medium">Maks. liczba uczestników (opcjonalnie)</Label>
          <Input
            type="number"
            value={form.max_participants || ''}
            onChange={(e) => setForm({ ...form, max_participants: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="Bez limitu"
            className="h-10"
          />
        </div>

        {/* Image Upload Section */}
        <div className="space-y-2">
          <Label className="text-muted-foreground font-medium">Miniatura szkolenia</Label>
          <MediaUpload
            onMediaUploaded={(url) => handleImageUploaded(url)}
            currentMediaUrl={form.image_url}
            currentMediaType="image"
            allowedTypes={['image']}
            maxSizeMB={10}
          />
          
          <Separator className="my-3" />
          
          <div className="flex gap-2">
            <Input
              type="url"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="h-10 flex-1"
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleAddImageUrl}
              className="h-10"
            >
              Dodaj
            </Button>
          </div>
        </div>

        {/* Visibility toggles */}
        <div className="space-y-3">
          <Label className="text-muted-foreground font-medium">Widoczność</Label>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.visible_to_partners}
                onCheckedChange={(checked) => setForm({ ...form, visible_to_partners: checked })}
              />
              <Label className="text-sm">Partnerzy</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.visible_to_specjalista}
                onCheckedChange={(checked) => setForm({ ...form, visible_to_specjalista: checked })}
              />
              <Label className="text-sm">Specjaliści</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.visible_to_clients}
                onCheckedChange={(checked) => setForm({ ...form, visible_to_clients: checked })}
              />
              <Label className="text-sm">Klienci</Label>
            </div>
          </div>
        </div>

        {/* Allow invites toggle */}
        <div className="flex items-center gap-3">
          <Switch
            checked={(form as any).allow_invites || false}
            onCheckedChange={(checked) => setForm({ ...form, allow_invites: checked } as any)}
          />
          <Label className="text-muted-foreground">Zezwól na zapraszanie gości</Label>
        </div>

        {/* Publish immediately toggle */}
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_published}
            onCheckedChange={(checked) => setForm({ ...form, is_published: checked, publish_at: checked ? null : (form as any).publish_at } as any)}
          />
          <Label className="text-muted-foreground">Opublikuj od razu</Label>
        </div>

        {/* Scheduled publication (when publish immediately is OFF) */}
        {!form.is_published && (
          <div className="space-y-2 pl-6">
            <Label className="text-muted-foreground font-medium">Zaplanowana data publikacji</Label>
            <div className="relative">
              <Input
                type="datetime-local"
                value={(form as any).publish_at ? format(new Date((form as any).publish_at), "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const [datePart, timePart] = e.target.value.split('T');
                    const [year, month, day] = datePart.split('-').map(Number);
                    const [hours, minutes] = timePart.split(':').map(Number);
                    const localDate = new Date(year, month - 1, day, hours, minutes);
                    setForm({ ...form, publish_at: localDate.toISOString() } as any);
                  } else {
                    setForm({ ...form, publish_at: null } as any);
                  }
                }}
                className="h-10 pl-10"
              />
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Wydarzenie zostanie automatycznie opublikowane w podanym terminie
            </p>
          </div>
        )}

        {/* Requires registration */}
        <div className="flex items-center gap-3">
          <Switch
            checked={form.requires_registration}
            onCheckedChange={(checked) => setForm({ ...form, requires_registration: checked })}
          />
          <Label className="text-muted-foreground">Wymagaj rejestracji uczestników</Label>
        </div>

        {/* Reminders Section */}
        <Collapsible open={remindersOpen} onOpenChange={setRemindersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 h-10 px-3 hover:bg-muted">
              <Bell className="h-4 w-4" />
              <span className="font-medium">Przypomnienia</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 pt-3 space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.sms_reminder_enabled}
                onCheckedChange={(checked) => setForm({ ...form, sms_reminder_enabled: checked })}
              />
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label className="text-muted-foreground">Włącz przypomnienie SMS</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.email_reminder_enabled}
                onCheckedChange={(checked) => setForm({ ...form, email_reminder_enabled: checked })}
              />
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label className="text-muted-foreground">Włącz przypomnienie Email</Label>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving || !form.title.trim() || (isMultiOccurrence ? occurrences.length === 0 : !form.start_time)}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? 'Zapisywanie...' : (editingTraining ? 'Zapisz zmiany' : 'Dodaj Szkolenie')}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Anuluj
          </Button>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={!!conflictData} onOpenChange={(open) => { if (!open) { setConflictData(null); setPendingSaveCallback(null); } }}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Wykryto kolizję czasową</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Znaleziono {conflictData?.length} kolidujące wydarzenie/a. Czy mimo to chcesz zapisać?</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {conflictData?.map((conflict) => {
                  const startDate = new Date(conflict.conflict_start);
                  const endDate = new Date(conflict.conflict_end);
                  const timeRange = `${format(startDate, 'dd.MM HH:mm')} - ${format(endDate, 'HH:mm')}`;
                  const typeLabel = conflict.event_type === 'webinar' ? 'Webinar' : conflict.event_type === 'team_training' ? 'Szkolenie' : 'Spotkanie';
                  return (
                    <div key={`${conflict.id}-${conflict.conflict_start}`} className="rounded-lg border p-3 bg-muted/30 text-left space-y-1">
                      <div className="font-medium text-sm text-foreground">{conflict.title}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                        <span>{typeLabel}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeRange}</span>
                        <span>Prowadzący: {conflict.host_name ?? 'Nie podano'}</span>
                      </div>
                      <div className={`text-xs flex items-center gap-1 ${Number(conflict.team_registered_count ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                        <Users className="h-3 w-3" />
                        {(() => {
                          const count = Number(conflict.team_registered_count ?? 0);
                          if (count === 0) return '0 uczestników z Twojego zespołu zapisanych';
                          if (count === 1) return '1 uczestnik z Twojego zespołu zapisany';
                          if (count >= 2 && count <= 4) return `${count} uczestników z Twojego zespołu zapisanych`;
                          return `${count} uczestników z Twojego zespołu zapisanych`;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setConflictData(null); pendingSaveCallback?.(); setPendingSaveCallback(null); }}>
            Zapisz mimo kolizji
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default TeamTrainingForm;
