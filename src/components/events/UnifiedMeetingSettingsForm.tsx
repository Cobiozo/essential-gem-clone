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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Save, 
  Loader2, 
  Users, 
  UserRound, 
  Video, 
  Clock, 
  History, 
  Settings, 
  ExternalLink, 
  CalendarDays, 
  AlertTriangle,
  CheckCircle 
} from 'lucide-react';
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

interface MeetingTypeSettings {
  title: string;
  description: string;
  image_url: string;
  is_active: boolean;
}

export const UnifiedMeetingSettingsForm: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Common settings
  const [zoomLink, setZoomLink] = useState('');
  const [slotDuration, setSlotDuration] = useState(60);
  const [bookingMode, setBookingMode] = useState<'internal' | 'external'>('internal');
  const [externalCalendlyUrl, setExternalCalendlyUrl] = useState('');
  const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
  
  // Unified availability slots
  const [availabilitySlots, setAvailabilitySlots] = useState<TimeSlot[]>([]);
  
  // Meeting type specific settings
  const [tripartiteSettings, setTripartiteSettings] = useState<MeetingTypeSettings>({
    title: 'Spotkanie trójstronne',
    description: '',
    image_url: '',
    is_active: true,
  });
  
  const [consultationSettings, setConsultationSettings] = useState<MeetingTypeSettings>({
    title: 'Konsultacje dla partnerów',
    description: '',
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Check Google Calendar connection
      const { data: gcalData } = await supabase
        .from('user_google_tokens')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setHasGoogleCalendar(!!gcalData);

      // Load leader permissions (common settings)
      const { data: permData } = await supabase
        .from('leader_permissions')
        .select('zoom_link, use_external_booking, external_calendly_url, tripartite_meeting_enabled, partner_consultation_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (permData) {
        setZoomLink(permData.zoom_link || '');
        setBookingMode(permData.use_external_booking ? 'external' : 'internal');
        setExternalCalendlyUrl(permData.external_calendly_url || '');
        
        // Update is_active from permissions
        setTripartiteSettings(prev => ({ ...prev, is_active: permData.tripartite_meeting_enabled ?? true }));
        setConsultationSettings(prev => ({ ...prev, is_active: permData.partner_consultation_enabled ?? true }));
      }

      // Load unified availability (specific dates)
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
        
        // Get slot duration from first entry
        if (availData[0].slot_duration_minutes) {
          setSlotDuration(availData[0].slot_duration_minutes);
        }
      }

      // Load meeting type settings
      const { data: meetingSettings } = await supabase
        .from('leader_meeting_settings')
        .select('*')
        .eq('leader_user_id', user.id);

      if (meetingSettings) {
        const tripartite = meetingSettings.find(s => s.meeting_type === 'tripartite');
        const consultation = meetingSettings.find(s => s.meeting_type === 'consultation');
        
        if (tripartite) {
          setTripartiteSettings({
            title: tripartite.title || 'Spotkanie trójstronne',
            description: tripartite.description || '',
            image_url: tripartite.image_url || '',
            is_active: tripartiteSettings.is_active,
          });
        }
        
        if (consultation) {
          setConsultationSettings({
            title: consultation.title || 'Konsultacje dla partnerów',
            description: consultation.description || '',
            image_url: consultation.image_url || '',
            is_active: consultationSettings.is_active,
          });
        }
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

    // Validate: cannot use external booking if Google Calendar is connected
    if (bookingMode === 'external' && hasGoogleCalendar) {
      toast({
        title: 'Konflikt konfiguracji',
        description: 'Nie możesz używać zewnętrznego Calendly gdy masz połączony Google Calendar.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // 1. Delete old specific_date availability entries
      await supabase
        .from('leader_availability')
        .delete()
        .eq('leader_user_id', user.id)
        .not('specific_date', 'is', null);

      // 2. Insert new unified availability slots
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

      // 3. Update leader_permissions
      const { error: permError } = await supabase
        .from('leader_permissions')
        .update({ 
          zoom_link: zoomLink || null,
          use_external_booking: bookingMode === 'external',
          external_calendly_url: bookingMode === 'external' ? externalCalendlyUrl : null,
          tripartite_meeting_enabled: tripartiteSettings.is_active,
          partner_consultation_enabled: consultationSettings.is_active,
        })
        .eq('user_id', user.id);

      if (permError) {
        console.error('Error updating leader_permissions:', permError);
      }

      // 4. Upsert meeting type settings
      const settingsToUpsert = [
        {
          leader_user_id: user.id,
          meeting_type: 'tripartite',
          title: tripartiteSettings.title,
          description: tripartiteSettings.description,
          image_url: tripartiteSettings.image_url,
        },
        {
          leader_user_id: user.id,
          meeting_type: 'consultation',
          title: consultationSettings.title,
          description: consultationSettings.description,
          image_url: consultationSettings.image_url,
        },
      ];

      for (const setting of settingsToUpsert) {
        const { error: settingsError } = await supabase
          .from('leader_meeting_settings')
          .upsert(setting, { 
            onConflict: 'leader_user_id,meeting_type',
          });

        if (settingsError) {
          console.error('Error saving meeting settings:', settingsError);
        }
      }

      toast({
        title: t('toast.success'),
        description: 'Wszystkie ustawienia zostały zapisane',
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
    <Tabs defaultValue="settings" className="space-y-4">
      <TabsList>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Ustawienia
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Historia
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings" className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Spotkania indywidualne
            </CardTitle>
            <CardDescription>
              Jeden wspólny harmonogram dla wszystkich typów spotkań. Zarezerwowany termin znika dla obu rodzajów.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Common Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ustawienia wspólne</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Booking Mode */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Sposób rezerwacji</Label>
              <RadioGroup 
                value={bookingMode} 
                onValueChange={(value) => setBookingMode(value as 'internal' | 'external')}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                <div className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  bookingMode === 'internal' ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                )}>
                  <RadioGroupItem value="internal" id="internal" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="internal" className="font-medium cursor-pointer text-sm">
                      Wbudowany harmonogram
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Partnerzy rezerwują bezpośrednio w systemie
                    </p>
                  </div>
                </div>
                
                <div className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  hasGoogleCalendar ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                  bookingMode === 'external' && !hasGoogleCalendar ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                )}>
                  <RadioGroupItem 
                    value="external" 
                    id="external" 
                    className="mt-0.5" 
                    disabled={hasGoogleCalendar}
                  />
                  <div className="flex-1">
                    <Label htmlFor="external" className={cn(
                      "font-medium flex items-center gap-1.5 text-sm",
                      hasGoogleCalendar ? "cursor-not-allowed" : "cursor-pointer"
                    )}>
                      Zewnętrzny (Calendly)
                      <ExternalLink className="h-3 w-3" />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Przekierowanie do zewnętrznego kalendarza
                    </p>
                  </div>
                </div>
              </RadioGroup>
              
              {hasGoogleCalendar && bookingMode !== 'external' && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Masz połączony Google Calendar - synchronizacja aktywna
                </p>
              )}
              
              {bookingMode === 'external' && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Link do rezerwacji</Label>
                  <Input
                    value={externalCalendlyUrl}
                    onChange={(e) => setExternalCalendlyUrl(e.target.value)}
                    placeholder="https://calendly.com/twoj-link"
                    className="h-9"
                  />
                </div>
              )}
            </div>

            {/* Video Link & Duration - only for internal mode */}
            {bookingMode === 'internal' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5" />
                    Link do spotkania
                  </Label>
                  <Input
                    value={zoomLink}
                    onChange={(e) => setZoomLink(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Czas trwania
                  </Label>
                  <Select
                    value={slotDuration.toString()}
                    onValueChange={(value) => setSlotDuration(parseInt(value))}
                  >
                    <SelectTrigger className="h-9">
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unified Availability Schedule - only for internal mode */}
        {bookingMode === 'internal' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Wspólny harmonogram dostępności
              </CardTitle>
              <CardDescription className="text-xs">
                Ten sam harmonogram dla wszystkich typów spotkań. Sloty kolidujące z webinarami/szkoleniami są oznaczone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyAvailabilityScheduler
                meetingType="tripartite"
                slotDuration={slotDuration}
                hostName={hostName}
                description=""
                zoomLink={zoomLink}
                initialSlots={availabilitySlots}
                onSlotsChange={handleSlotsChange}
              />
            </CardContent>
          </Card>
        )}

        {/* Meeting Types Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Typy spotkań</CardTitle>
            <CardDescription className="text-xs">
              Osobne tytuły, opisy i obrazki dla każdego typu spotkania
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={['tripartite', 'consultation']} className="space-y-2">
              {/* Tripartite Meeting */}
              <AccordionItem value="tripartite" className="border rounded-lg px-3">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Spotkanie trójstronne</span>
                    <Switch
                      checked={tripartiteSettings.is_active}
                      onCheckedChange={(checked) => {
                        setTripartiteSettings(prev => ({ ...prev, is_active: checked }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Tytuł</Label>
                    <Input
                      value={tripartiteSettings.title}
                      onChange={(e) => setTripartiteSettings(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Nazwa spotkania"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Opis</Label>
                    <Textarea
                      value={tripartiteSettings.description}
                      onChange={(e) => setTripartiteSettings(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Opisz, czego dotyczy spotkanie..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Obrazek</Label>
                    <MediaUpload
                      onMediaUploaded={(url) => setTripartiteSettings(prev => ({ ...prev, image_url: url }))}
                      currentMediaUrl={tripartiteSettings.image_url}
                      currentMediaType="image"
                      allowedTypes={['image']}
                      compact
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Partner Consultation */}
              <AccordionItem value="consultation" className="border rounded-lg px-3">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <UserRound className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Konsultacje dla partnerów</span>
                    <Switch
                      checked={consultationSettings.is_active}
                      onCheckedChange={(checked) => {
                        setConsultationSettings(prev => ({ ...prev, is_active: checked }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Tytuł</Label>
                    <Input
                      value={consultationSettings.title}
                      onChange={(e) => setConsultationSettings(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Nazwa spotkania"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Opis</Label>
                    <Textarea
                      value={consultationSettings.description}
                      onChange={(e) => setConsultationSettings(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Opisz, czego dotyczy spotkanie..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Obrazek</Label>
                    <MediaUpload
                      onMediaUploaded={(url) => setConsultationSettings(prev => ({ ...prev, image_url: url }))}
                      currentMediaUrl={consultationSettings.image_url}
                      currentMediaType="image"
                      allowedTypes={['image']}
                      compact
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Zapisywanie...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Zapisz wszystkie ustawienia
              </>
            )}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="history">
        <IndividualMeetingsHistory />
      </TabsContent>
    </Tabs>
  );
};
