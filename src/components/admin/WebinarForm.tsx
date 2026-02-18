import React, { useState, useEffect } from 'react';
import type { Json } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RichTextEditor } from '@/components/RichTextEditor';
import { MediaUpload } from '@/components/MediaUpload';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addMinutes, parseISO } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { pl, enUS } from 'date-fns/locale';
import { DEFAULT_EVENT_TIMEZONE } from '@/utils/timezoneHelpers';
import { 
  Calendar, 
  Copy, 
  Users, 
  Link as LinkIcon,
  Pencil, 
  Trash2,
  Bell,
  Mail,
  MessageSquare,
  ExternalLink,
  Eye,
  EyeOff,
  Clock,
  Upload,
  FileText,
  Video
} from 'lucide-react';
import type { DbEvent, WebinarFormData, WEBINAR_TYPES, DURATION_OPTIONS } from '@/types/events';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RegistrationFormEditor, RegistrationFormConfig, defaultRegistrationFormConfig } from './RegistrationFormEditor';
import { ZoomMeetingGenerator } from './ZoomMeetingGenerator';
import { EventButtonsEditor } from './EventButtonsEditor';

interface WebinarFormProps {
  editingWebinar: DbEvent | null;
  onSave: () => void;
  onCancel: () => void;
}

// Webinar types will be generated with translations inside the component

const durationOptions = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '120 min' },
];

export const WebinarForm: React.FC<WebinarFormProps> = ({
  editingWebinar,
  onSave,
  onCancel
}) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const dateLocale = language === 'pl' ? pl : enUS;

  // Translated webinar types
  const webinarTypes = [
    { value: 'biznesowy', label: t('admin.webinar.types.business') },
    { value: 'produktowy', label: t('admin.webinar.types.product') },
    { value: 'motywacyjny', label: t('admin.webinar.types.motivational') },
    { value: 'szkoleniowy', label: t('admin.webinar.types.training') },
  ];

  const [form, setForm] = useState<WebinarFormData & { registration_form_config: RegistrationFormConfig | null; is_external_platform?: boolean; external_platform_message?: string }>({
    title: '',
    description: '',
    event_type: 'webinar',
    start_time: '',
    end_time: '',
    zoom_link: '',
    location: '',
    visible_to_everyone: false,
    visible_to_partners: true,
    visible_to_specjalista: true,
    visible_to_clients: true,
    image_url: '',
    buttons: [],
    max_participants: null,
    requires_registration: true,
    webinar_type: 'biznesowy',
    host_name: '',
    duration_minutes: 60,
    sms_reminder_enabled: false,
    email_reminder_enabled: true,
    is_published: true,
    guest_link: '',
    registration_form_config: defaultRegistrationFormConfig,
    is_external_platform: false,
    external_platform_message: '',
  });

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [remindersOpen, setRemindersOpen] = useState(true);
  const [formEditorOpen, setFormEditorOpen] = useState(false);
  const [buttonsEditorOpen, setButtonsEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Zoom API integration state
  const [zoomMeetingId, setZoomMeetingId] = useState<string | null>(null);
  const [zoomStartUrl, setZoomStartUrl] = useState<string | null>(null);
  const [zoomPassword, setZoomPassword] = useState<string | null>(null);

  useEffect(() => {
    if (editingWebinar) {
      // Parse registration_form_config from database
      let parsedFormConfig: RegistrationFormConfig | null = null;
      if (editingWebinar.registration_form_config) {
        try {
          const rawConfig = editingWebinar.registration_form_config;
          parsedFormConfig = typeof rawConfig === 'string' 
            ? JSON.parse(rawConfig)
            : (rawConfig as unknown as RegistrationFormConfig);
        } catch {
          parsedFormConfig = defaultRegistrationFormConfig;
        }
      }
      
      setForm({
        title: editingWebinar.title || '',
        description: editingWebinar.description || '',
        event_type: 'webinar',
        start_time: editingWebinar.start_time || '',
        end_time: editingWebinar.end_time || '',
        zoom_link: editingWebinar.zoom_link || '',
        location: editingWebinar.location || '',
        visible_to_everyone: editingWebinar.visible_to_everyone ?? false,
        visible_to_partners: editingWebinar.visible_to_partners ?? true,
        visible_to_specjalista: editingWebinar.visible_to_specjalista ?? true,
        visible_to_clients: editingWebinar.visible_to_clients ?? true,
        image_url: editingWebinar.image_url || '',
        buttons: Array.isArray(editingWebinar.buttons) ? editingWebinar.buttons as any : [],
        max_participants: editingWebinar.max_participants,
        requires_registration: editingWebinar.requires_registration ?? true,
        webinar_type: editingWebinar.webinar_type || 'biznesowy',
        host_name: editingWebinar.host_name || '',
        duration_minutes: editingWebinar.duration_minutes || 60,
        sms_reminder_enabled: editingWebinar.sms_reminder_enabled ?? false,
        email_reminder_enabled: editingWebinar.email_reminder_enabled ?? true,
        is_published: editingWebinar.is_published ?? true,
        guest_link: editingWebinar.guest_link || '',
        registration_form_config: parsedFormConfig || defaultRegistrationFormConfig,
        allow_invites: editingWebinar.allow_invites ?? false,
        publish_at: editingWebinar.publish_at || null,
        is_external_platform: editingWebinar.is_external_platform ?? false,
        external_platform_message: editingWebinar.external_platform_message || '',
        use_internal_meeting: editingWebinar.use_internal_meeting ?? false,
        meeting_room_id: editingWebinar.meeting_room_id || null,
      });
      setImageUrlInput(editingWebinar.image_url || '');
      
      // Load existing Zoom API data (from dynamic properties)
      const webinarAny = editingWebinar as any;
      setZoomMeetingId(webinarAny.zoom_meeting_id || null);
      setZoomStartUrl(webinarAny.zoom_start_url || null);
      setZoomPassword(webinarAny.zoom_password || null);
    }
  }, [editingWebinar]);

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
      toast({ title: t('common.error'), description: t('admin.webinar.error.titleRequired'), variant: 'destructive' });
      return;
    }
    if (!form.start_time) {
      toast({ title: t('common.error'), description: t('admin.webinar.error.dateRequired'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Check for conflicts with other high-priority events
      const { data: conflictingEvents } = await supabase
        .from('events')
        .select('id, title, event_type')
        .neq('id', editingWebinar?.id || '')
        .in('event_type', ['webinar', 'team_training', 'spotkanie_zespolu'])
        .lte('start_time', form.end_time)
        .gte('end_time', form.start_time)
        .eq('is_active', true);

      if (conflictingEvents && conflictingEvents.length > 0) {
        toast({
          title: t('admin.webinar.error.conflict'),
          description: `${t('admin.webinar.error.conflictDesc')}: ${conflictingEvents[0].title}`,
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      // Convert buttons to JSON-compatible format
      const buttonsJson = form.buttons.map(b => ({ 
        label: b.label, 
        url: b.url, 
        style: b.style || 'primary' 
      }));

      const webinarData = {
        title: form.title,
        description: form.description || null,
        event_type: 'webinar' as const,
        start_time: form.start_time,
        end_time: form.end_time,
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
        webinar_type: form.webinar_type,
        host_name: form.host_name || null,
        duration_minutes: form.duration_minutes,
        sms_reminder_enabled: form.sms_reminder_enabled,
        email_reminder_enabled: form.email_reminder_enabled,
        is_published: form.is_published,
        guest_link: form.guest_link || null,
        registration_form_config: JSON.parse(JSON.stringify(form.registration_form_config)) as Json,
        allow_invites: form.allow_invites || false,
        publish_at: form.publish_at || null,
        is_external_platform: form.is_external_platform || false,
        external_platform_message: form.external_platform_message || null,
        use_internal_meeting: form.use_internal_meeting || false,
        meeting_room_id: form.use_internal_meeting ? (form.meeting_room_id || crypto.randomUUID()) : null,
      };

      let error;
      if (editingWebinar) {
        ({ error } = await supabase
          .from('events')
          .update(webinarData)
          .eq('id', editingWebinar.id));
      } else {
        ({ error } = await supabase
          .from('events')
          .insert({ ...webinarData, created_by: user.id }));
      }

      if (error) {
        toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
        return;
      }

      toast({ 
        title: t('common.success'), 
        description: editingWebinar ? t('admin.webinar.success.updated') : t('admin.webinar.success.added') 
      });
      onSave();
    } finally {
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
      toast({ title: t('common.success'), description: t('admin.webinar.success.thumbnailAdded') });
    }
  };

  return (
    <Card className="border-muted">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">
          {editingWebinar ? t('admin.webinar.edit') : t('admin.webinar.new')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label className="text-primary font-medium">
            {t('admin.webinar.title')} <span className="text-destructive">*</span>
          </Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Nazwa webinaru..."
            className="h-10"
          />
        </div>

        {/* Description with RichTextEditor */}
        <div className="space-y-2">
          <Label className="text-primary font-medium">
            {t('admin.webinar.description')} <span className="text-destructive">*</span>
          </Label>
          <RichTextEditor
            value={form.description}
            onChange={(value) => setForm({ ...form, description: value })}
            placeholder="Wprowadź opis webinaru..."
            rows={5}
          />
        </div>

        {/* Date/Time and Type row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-primary font-medium">
              {t('admin.webinar.dateTime')} <span className="text-destructive">*</span>
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
            <Label className="text-muted-foreground font-medium">{t('admin.webinar.type')}</Label>
            <Select
              value={form.webinar_type || 'biznesowy'}
              onValueChange={(value) => setForm({ ...form, webinar_type: value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder={t('admin.webinar.selectType')} />
              </SelectTrigger>
              <SelectContent>
                {webinarTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Host and Duration row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground font-medium">{t('admin.webinar.host')}</Label>
            <Input
              value={form.host_name || ''}
              onChange={(e) => setForm({ ...form, host_name: e.target.value })}
              placeholder="np. Dr Katarzyna Tyl"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground font-medium">{t('admin.webinar.duration')}</Label>
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

        {/* Zoom Link - only show when internal meeting is OFF */}
        {!form.use_internal_meeting && (
          <div className="space-y-2">
            <Label className="text-muted-foreground font-medium">{t('admin.webinar.zoomLink')}</Label>
            <div className="flex gap-2">
              <Input
                value={form.zoom_link}
                onChange={(e) => setForm({ ...form, zoom_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
                className="h-10 flex-1"
              />
              <ZoomMeetingGenerator
                eventId={editingWebinar?.id}
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

        {/* Image Upload Section */}
        <div className="space-y-2">
          <Label className="text-muted-foreground font-medium">{t('admin.webinar.thumbnailUrl')}</Label>
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
              {t('admin.webinar.addUrl')}
            </Button>
          </div>
        </div>

        {/* Action Buttons Editor Section */}
        <Collapsible open={buttonsEditorOpen} onOpenChange={setButtonsEditorOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 h-10 px-3 hover:bg-muted">
              <ExternalLink className="h-4 w-4" />
              <span className="font-medium">Przyciski akcji</span>
              {form.buttons.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {form.buttons.length}
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 pl-2">
            <EventButtonsEditor
              buttons={form.buttons}
              onChange={(buttons) => setForm({ ...form, buttons })}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* External platform toggle */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_external_platform || false}
              onCheckedChange={(checked) => setForm({ ...form, is_external_platform: checked })}
            />
            <Label className="text-muted-foreground">
              Zewnętrzna platforma (webinar odbywa się poza PureLife)
            </Label>
          </div>
          
          {form.is_external_platform && (
            <div className="pl-6 space-y-2">
              <Label className="text-xs text-muted-foreground">Komunikat dla uczestników</Label>
              <Input
                value={form.external_platform_message || ''}
                onChange={(e) => setForm({ ...form, external_platform_message: e.target.value })}
                placeholder="Ten webinar odbywa się na zewnętrznej platformie. Zapisz się tutaj, aby otrzymać przypomnienie..."
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Zostaw puste, aby użyć domyślnego komunikatu
              </p>
            </div>
          )}
        </div>

        {/* Internal registration toggle */}
        <div className="flex items-center gap-3">
          <Switch
            checked={form.requires_registration}
            onCheckedChange={(checked) => setForm({ ...form, requires_registration: checked })}
          />
          <Label className="text-muted-foreground">
            Wymagaj rejestracji uczestników (wewnętrzny system)
          </Label>
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
          <Label className="text-muted-foreground">{t('admin.webinar.publishImmediately')}</Label>
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

        {/* Reminders Section */}
        <Collapsible open={remindersOpen} onOpenChange={setRemindersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 h-10 px-3 hover:bg-muted">
              <Bell className="h-4 w-4" />
              <span className="font-medium">{t('admin.webinar.reminders')}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 pt-3 space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.sms_reminder_enabled}
                onCheckedChange={(checked) => setForm({ ...form, sms_reminder_enabled: checked })}
              />
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label className="text-muted-foreground">{t('admin.webinar.smsReminder')}</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.email_reminder_enabled}
                onCheckedChange={(checked) => setForm({ ...form, email_reminder_enabled: checked })}
              />
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label className="text-muted-foreground">{t('admin.webinar.emailReminder')}</Label>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Registration Form Editor Section */}
        <Collapsible open={formEditorOpen} onOpenChange={setFormEditorOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 h-10 px-3 hover:bg-muted">
              <FileText className="h-4 w-4" />
              <span className="font-medium">{t('admin.webinar.formConfig')}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <RegistrationFormEditor
              config={form.registration_form_config}
              onChange={(config) => setForm({ ...form, registration_form_config: config })}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving || !form.title.trim() || !form.start_time}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? t('admin.webinar.saving') : (editingWebinar ? t('admin.webinar.save') : t('admin.webinar.add'))}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            {t('admin.webinar.cancel')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebinarForm;
