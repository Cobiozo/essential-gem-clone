import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Save, Loader2, Users, UserRound, Video, Eye } from 'lucide-react';
import { MediaUpload } from '@/components/MediaUpload';

const DAYS_OF_WEEK = [
  { value: 1, labelKey: 'Poniedziałek' },
  { value: 2, labelKey: 'Wtorek' },
  { value: 3, labelKey: 'Środa' },
  { value: 4, labelKey: 'Czwartek' },
  { value: 5, labelKey: 'Piątek' },
  { value: 6, labelKey: 'Sobota' },
  { value: 0, labelKey: 'Niedziela' },
];

const SLOT_DURATIONS = [
  { value: 30, label: '30 minut' },
  { value: 45, label: '45 minut' },
  { value: 60, label: '60 minut' },
  { value: 90, label: '90 minut' },
];

interface DayAvailability {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

interface IndividualMeetingFormProps {
  meetingType: 'tripartite' | 'consultation';
}

export const IndividualMeetingForm: React.FC<IndividualMeetingFormProps> = ({ meetingType }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState(
    meetingType === 'tripartite' ? 'Spotkanie trójstronne' : 'Konsultacje dla partnerów'
  );
  const [description, setDescription] = useState('');
  const [zoomLink, setZoomLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [slotDuration, setSlotDuration] = useState(60);
  const [visibleToPartners, setVisibleToPartners] = useState(true);
  const [visibleToSpecjalista, setVisibleToSpecjalista] = useState(true);
  
  // Availability
  const [availability, setAvailability] = useState<DayAvailability[]>(
    DAYS_OF_WEEK.map((day) => ({
      dayOfWeek: day.value,
      isAvailable: false,
      startTime: '09:00',
      endTime: '17:00',
    }))
  );

  useEffect(() => {
    if (user) {
      loadExistingData();
    }
  }, [user, meetingType]);

  const loadExistingData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load availability
      const { data: availData } = await supabase
        .from('leader_availability')
        .select('*')
        .eq('leader_user_id', user.id);

      if (availData && availData.length > 0) {
        setAvailability(
          DAYS_OF_WEEK.map((day) => {
            const existing = availData.find((d) => d.day_of_week === day.value);
            return {
              dayOfWeek: day.value,
              isAvailable: existing?.is_active ?? false,
              startTime: existing?.start_time ?? '09:00',
              endTime: existing?.end_time ?? '17:00',
            };
          })
        );
      }

      // Load leader permissions for zoom link
      const { data: permData } = await supabase
        .from('leader_permissions')
        .select('zoom_link')
        .eq('user_id', user.id)
        .maybeSingle();

      if (permData?.zoom_link) {
        setZoomLink(permData.zoom_link);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Save availability
      await supabase
        .from('leader_availability')
        .delete()
        .eq('leader_user_id', user.id);

      const insertData = availability.map((day) => ({
        leader_user_id: user.id,
        day_of_week: day.dayOfWeek,
        start_time: day.startTime,
        end_time: day.endTime,
        is_active: day.isAvailable,
        slot_duration_minutes: slotDuration,
      }));

      const { error: availError } = await supabase
        .from('leader_availability')
        .insert(insertData);

      if (availError) throw availError;

      // Update zoom link in leader_permissions
      if (zoomLink) {
        const { error: permError } = await supabase
          .from('leader_permissions')
          .update({ zoom_link: zoomLink })
          .eq('user_id', user.id);

        if (permError) throw permError;
      }

      toast({
        title: t('toast.success'),
        description: 'Ustawienia spotkań zostały zapisane',
      });
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({
        title: t('toast.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (dayOfWeek: number, updates: Partial<DayAvailability>) => {
    setAvailability((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...updates } : day
      )
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const hostName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';

  return (
    <div className="space-y-6">
      {/* Meeting Type Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {meetingType === 'tripartite' ? (
              <Users className="h-5 w-5" />
            ) : (
              <UserRound className="h-5 w-5" />
            )}
            {meetingType === 'tripartite' ? 'Spotkanie trójstronne' : 'Konsultacje dla partnerów'}
          </CardTitle>
          <CardDescription>
            {meetingType === 'tripartite' 
              ? 'Skonfiguruj dostępność dla spotkań trójstronnych z nowymi partnerami'
              : 'Skonfiguruj dostępność dla konsultacji z innymi partnerami'
            }
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Host Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prowadzący</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{hostName || 'Brak danych'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ustawienia spotkania</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tytuł spotkania</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nazwa spotkania"
            />
          </div>

          <div className="space-y-2">
            <Label>Opis</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opisz, czego dotyczy spotkanie..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Link do spotkania (Zoom/Google Meet)
            </Label>
            <Input
              value={zoomLink}
              onChange={(e) => setZoomLink(e.target.value)}
              placeholder="https://zoom.us/j/..."
            />
          </div>

          <div className="space-y-2">
            <Label>Czas trwania spotkania</Label>
            <Select
              value={slotDuration.toString()}
              onValueChange={(value) => setSlotDuration(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOT_DURATIONS.map((duration) => (
                  <SelectItem key={duration.value} value={duration.value.toString()}>
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Availability Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Harmonogram dostępności
          </CardTitle>
          <CardDescription>
            Wybierz dni i godziny, w których inni partnerzy mogą się zapisać na spotkanie z Tobą
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayData = availability.find((a) => a.dayOfWeek === day.value)!;
            return (
              <div
                key={day.value}
                className="flex items-center gap-4 p-3 rounded-lg border"
              >
                <div className="w-36">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={dayData.isAvailable}
                      onCheckedChange={(checked) =>
                        updateDay(day.value, { isAvailable: checked })
                      }
                    />
                    <Label className="font-medium">{day.labelKey}</Label>
                  </div>
                </div>
                
                {dayData.isAvailable && (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Od</Label>
                      <Input
                        type="time"
                        value={dayData.startTime}
                        onChange={(e) =>
                          updateDay(day.value, { startTime: e.target.value })
                        }
                        className="w-28"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Do</Label>
                      <Input
                        type="time"
                        value={dayData.endTime}
                        onChange={(e) =>
                          updateDay(day.value, { endTime: e.target.value })
                        }
                        className="w-28"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Media Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Multimedia</CardTitle>
          <CardDescription>Dodaj obraz wyróżniający dla spotkania</CardDescription>
        </CardHeader>
        <CardContent>
          <MediaUpload
            onMediaUploaded={(url, type) => setImageUrl(url)}
            currentMediaUrl={imageUrl}
            currentMediaType="image"
            allowedTypes={['image']}
          />
        </CardContent>
      </Card>

      {/* Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5" />
            Widoczność
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Widoczne dla partnerów</Label>
              <p className="text-sm text-muted-foreground">Partnerzy mogą zapisać się na to spotkanie</p>
            </div>
            <Switch
              checked={visibleToPartners}
              onCheckedChange={setVisibleToPartners}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Widoczne dla specjalistów</Label>
              <p className="text-sm text-muted-foreground">Specjaliści mogą zapisać się na to spotkanie</p>
            </div>
            <Switch
              checked={visibleToSpecjalista}
              onCheckedChange={setVisibleToSpecjalista}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Zapisz ustawienia
        </Button>
      </div>
    </div>
  );
};

export default IndividualMeetingForm;
