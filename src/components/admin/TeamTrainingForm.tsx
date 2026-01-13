import React, { useState, useEffect } from 'react';
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
import { addMinutes } from 'date-fns';
import { 
  Calendar, 
  Bell,
  Mail,
  MessageSquare,
  Users
} from 'lucide-react';
import type { DbEvent, TeamTrainingFormData, TEAM_TRAINING_TYPES } from '@/types/events';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
      });
      setImageUrlInput(editingTraining.image_url || '');
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
    if (!form.start_time) {
      toast({ title: 'Błąd', description: 'Data i godzina są wymagane', variant: 'destructive' });
      return;
    }

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
        start_time: form.start_time,
        end_time: form.end_time,
        location: form.location || null,
        zoom_link: form.zoom_link || null,
        max_participants: form.max_participants,
        requires_registration: form.requires_registration,
        visible_to_partners: form.visible_to_partners,
        visible_to_specjalista: form.visible_to_specjalista,
        visible_to_clients: form.visible_to_clients,
        visible_to_everyone: form.visible_to_everyone,
        image_url: form.image_url || null,
        buttons: buttonsJson,
        webinar_type: form.training_type, // Using webinar_type field for training_type
        host_name: form.host_name || null,
        duration_minutes: form.duration_minutes,
        sms_reminder_enabled: form.sms_reminder_enabled,
        email_reminder_enabled: form.email_reminder_enabled,
        is_published: form.is_published,
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
          .insert({ ...trainingData, created_by: user.id }));
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

        {/* Date/Time and Type row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-primary font-medium">
              Data i godzina <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                type="datetime-local"
                value={form.start_time ? form.start_time.slice(0, 16) : ''}
                onChange={(e) => setForm({ ...form, start_time: e.target.value ? new Date(e.target.value).toISOString() : '' })}
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

        {/* Meeting Link */}
        <div className="space-y-2">
          <Label className="text-muted-foreground font-medium">Link do spotkania (Zoom/Teams/Meet)</Label>
          <Input
            value={form.zoom_link}
            onChange={(e) => setForm({ ...form, zoom_link: e.target.value })}
            placeholder="https://zoom.us/j/..."
            className="h-10"
          />
        </div>

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

        {/* Publish immediately toggle */}
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_published}
            onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
          />
          <Label className="text-muted-foreground">Opublikuj od razu</Label>
        </div>

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
            disabled={saving || !form.title.trim() || !form.start_time}
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
  );
};

export default TeamTrainingForm;
