import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, Users, UserRound, Video, Eye, Clock, History, Settings, ExternalLink, CalendarDays } from 'lucide-react';
import { MediaUpload } from '@/components/MediaUpload';
import { WeeklyAvailabilityScheduler, TimeSlot } from './WeeklyAvailabilityScheduler';
import { IndividualMeetingsHistory } from './IndividualMeetingsHistory';
import { format, addMonths, addMinutes, parse } from 'date-fns';
import { cn } from '@/lib/utils';

const SLOT_DURATIONS = [
  { value: 30, label: '30 minut' },
  { value: 45, label: '45 minut' },
  { value: 60, label: '60 minut' },
  { value: 90, label: '90 minut' },
];

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
  
  // New availability slots (specific dates instead of day-of-week)
  const [availabilitySlots, setAvailabilitySlots] = useState<TimeSlot[]>([]);
  
  // External booking (Calendly) options
  const [bookingMode, setBookingMode] = useState<'internal' | 'external'>('internal');
  const [externalCalendlyUrl, setExternalCalendlyUrl] = useState('');

  useEffect(() => {
    if (user) {
      loadExistingData();
    }
  }, [user, meetingType]);

  const loadExistingData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load availability for specific dates (next month)
      const today = format(new Date(), 'yyyy-MM-dd');
      const maxDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
      
      const { data: availData } = await supabase
        .from('leader_availability')
        .select('*')
        .eq('leader_user_id', user.id)
        .not('specific_date', 'is', null)
        .gte('specific_date', today)
        .lte('specific_date', maxDate);

      if (availData && availData.length > 0) {
        const slots: TimeSlot[] = availData
          .filter(s => s.is_active && s.specific_date)
          .map(s => ({
            date: s.specific_date!,
            time: s.start_time?.substring(0, 5) || '09:00',
          }));
        setAvailabilitySlots(slots);
      }

      // Load leader permissions for zoom link and external booking settings
      const { data: permData } = await supabase
        .from('leader_permissions')
        .select('zoom_link, use_external_booking, external_calendly_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (permData?.zoom_link) {
        setZoomLink(permData.zoom_link);
      }
      
      // Load external booking settings
      if (permData?.use_external_booking) {
        setBookingMode('external');
        setExternalCalendlyUrl(permData.external_calendly_url || '');
      } else {
        setBookingMode('internal');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const parsed = parse(startTime, 'HH:mm', new Date());
    const endTime = addMinutes(parsed, durationMinutes);
    return format(endTime, 'HH:mm');
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Delete old specific_date entries only (preserve day_of_week entries if any)
      await supabase
        .from('leader_availability')
        .delete()
        .eq('leader_user_id', user.id)
        .not('specific_date', 'is', null);

      // Insert new slots for specific dates
      if (availabilitySlots.length > 0) {
        const insertData = availabilitySlots.map((slot) => ({
          leader_user_id: user.id,
          specific_date: slot.date,
          start_time: slot.time,
          end_time: calculateEndTime(slot.time, slotDuration),
          is_active: true,
          slot_duration_minutes: slotDuration,
        }));

        const { error: availError } = await supabase
          .from('leader_availability')
          .insert(insertData);

        if (availError) throw availError;
      }

      // Update zoom link and external booking settings in leader_permissions
      const { error: permError } = await supabase
        .from('leader_permissions')
        .update({ 
          zoom_link: zoomLink || null,
          use_external_booking: bookingMode === 'external',
          external_calendly_url: bookingMode === 'external' ? externalCalendlyUrl : null,
        })
        .eq('user_id', user.id);

      if (permError) {
        console.error('Error updating leader_permissions:', permError);
        // Don't throw - this is not critical, just log it
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

  const handleSlotsChange = useCallback((slots: TimeSlot[]) => {
    setAvailabilitySlots(slots);
  }, []);

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
    <Tabs defaultValue="settings" className="space-y-6">
      <TabsList>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Ustawienia
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Historia spotkań
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings" className="space-y-6">
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

      {/* Booking Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5" />
            Sposób rezerwacji spotkań
          </CardTitle>
          <CardDescription>
            Wybierz jak partnerzy mają rezerwować spotkania z Tobą
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={bookingMode} 
            onValueChange={(value) => setBookingMode(value as 'internal' | 'external')}
            className="space-y-4"
          >
            <div className={cn(
              "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
              bookingMode === 'internal' ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            )}>
              <RadioGroupItem value="internal" id="internal" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="internal" className="font-medium cursor-pointer">
                  Wbudowany harmonogram
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Ustalaj dostępność w aplikacji. Partnerzy rezerwują spotkania bezpośrednio w systemie.
                </p>
              </div>
            </div>
            
            <div className={cn(
              "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
              bookingMode === 'external' ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            )}>
              <RadioGroupItem value="external" id="external" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="external" className="font-medium cursor-pointer flex items-center gap-2">
                  Zewnętrzny link (Calendly/Cal.com)
                  <ExternalLink className="h-3.5 w-3.5" />
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Przekieruj partnerów do swojego zewnętrznego kalendarza rezerwacji.
                </p>
              </div>
            </div>
          </RadioGroup>
          
          {bookingMode === 'external' && (
            <div className="mt-4 space-y-2">
              <Label>Link do rezerwacji</Label>
              <Input
                value={externalCalendlyUrl}
                onChange={(e) => setExternalCalendlyUrl(e.target.value)}
                placeholder="https://calendly.com/twoj-link"
              />
              <p className="text-xs text-muted-foreground">
                Wklej link do Calendly, Cal.com lub innego narzędzia do rezerwacji spotkań
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Settings - only show when internal mode */}
      {bookingMode === 'internal' && (
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
      )}

      {/* Availability Schedule - only show when internal mode */}
      {bookingMode === 'internal' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Harmonogram dostępności
            </CardTitle>
            <CardDescription>
              Kliknij na godziny, w których chcesz być dostępny dla innych partnerów (maks. 1 miesiąc do przodu)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyAvailabilityScheduler
              meetingType={meetingType}
              slotDuration={slotDuration}
              hostName={hostName}
              description={description}
              zoomLink={zoomLink}
              initialSlots={availabilitySlots}
              onSlotsChange={handleSlotsChange}
            />
          </CardContent>
        </Card>
      )}

      {/* Media Upload - only show when internal mode */}
      {bookingMode === 'internal' && (
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
      )}

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
      </TabsContent>

      <TabsContent value="history">
        <IndividualMeetingsHistory />
      </TabsContent>
    </Tabs>
  );
};

export default IndividualMeetingForm;
