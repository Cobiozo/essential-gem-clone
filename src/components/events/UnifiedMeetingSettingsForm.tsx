import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  History, 
  Settings, 
  ExternalLink, 
  CalendarDays, 
  CheckCircle,
} from 'lucide-react';
import { getDefaultSchedule, WeeklySchedule } from './WorkingHoursScheduler';
import { DateException } from './DateExceptionsManager';
import { MeetingTypeCard, MeetingTypeSettings } from './MeetingTypeCard';
import { IndividualMeetingsHistory } from './IndividualMeetingsHistory';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const getDefaultMeetingTypeSettings = (
  type: 'tripartite' | 'consultation'
): MeetingTypeSettings => ({
  title: type === 'tripartite' ? 'Spotkanie trójstronne' : 'Konsultacje dla partnerów',
  description: '',
  image_url: '',
  is_active: true,
  slot_duration: 60,
  weeklySchedule: getDefaultSchedule(),
  dateExceptions: [],
});

export const UnifiedMeetingSettingsForm: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Common settings
  const [zoomLink, setZoomLink] = useState('');
  const [bookingMode, setBookingMode] = useState<'internal' | 'external'>('internal');
  const [externalCalendlyUrl, setExternalCalendlyUrl] = useState('');
  const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
  
  // Separate settings per meeting type
  const [tripartiteSettings, setTripartiteSettings] = useState<MeetingTypeSettings>(
    getDefaultMeetingTypeSettings('tripartite')
  );
  const [consultationSettings, setConsultationSettings] = useState<MeetingTypeSettings>(
    getDefaultMeetingTypeSettings('consultation')
  );

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const buildScheduleFromData = (
    data: Array<{ day_of_week: number; start_time: string; end_time: string }> | undefined
  ): WeeklySchedule => {
    const schedule: WeeklySchedule = {};
    
    // Initialize all days as disabled
    for (let i = 0; i < 7; i++) {
      schedule[i] = { enabled: false, ranges: [{ start: '09:00', end: '17:00' }] };
    }
    
    if (!data || data.length === 0) return schedule;
    
    // Group by day_of_week
    data.forEach(entry => {
      const day = entry.day_of_week;
      if (!schedule[day] || !schedule[day].enabled) {
        schedule[day] = { enabled: true, ranges: [] };
      }
      schedule[day].ranges.push({
        start: entry.start_time?.substring(0, 5) || '09:00',
        end: entry.end_time?.substring(0, 5) || '17:00',
      });
    });
    
    return schedule;
  };

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

      // Load leader permissions (common settings + durations)
      const { data: permData } = await supabase
        .from('leader_permissions')
        .select('zoom_link, use_external_booking, external_calendly_url, tripartite_meeting_enabled, partner_consultation_enabled, tripartite_slot_duration, consultation_slot_duration')
        .eq('user_id', user.id)
        .maybeSingle();

      if (permData) {
        setZoomLink(permData.zoom_link || '');
        setBookingMode(permData.use_external_booking ? 'external' : 'internal');
        setExternalCalendlyUrl(permData.external_calendly_url || '');
        
        setTripartiteSettings(prev => ({
          ...prev,
          is_active: permData.tripartite_meeting_enabled ?? true,
          slot_duration: permData.tripartite_slot_duration || 60,
        }));
        setConsultationSettings(prev => ({
          ...prev,
          is_active: permData.partner_consultation_enabled ?? true,
          slot_duration: permData.consultation_slot_duration || 60,
        }));
      }

      // Load weekly availability grouped by meeting_type
      const { data: weeklyData } = await supabase
        .from('leader_availability')
        .select('day_of_week, start_time, end_time, slot_duration_minutes, meeting_type')
        .eq('leader_user_id', user.id)
        .not('day_of_week', 'is', null)
        .is('specific_date', null)
        .eq('is_active', true);

      if (weeklyData && weeklyData.length > 0) {
        // Separate by meeting_type
        const tripartiteData = weeklyData.filter(
          d => d.meeting_type === 'tripartite' || d.meeting_type === 'both'
        );
        const consultationData = weeklyData.filter(
          d => d.meeting_type === 'consultation' || d.meeting_type === 'both'
        );
        
        // If all entries are 'both', use the same schedule for both types
        const allBoth = weeklyData.every(d => d.meeting_type === 'both');
        
        if (allBoth) {
          const sharedSchedule = buildScheduleFromData(weeklyData);
          setTripartiteSettings(prev => ({ ...prev, weeklySchedule: sharedSchedule }));
          setConsultationSettings(prev => ({ ...prev, weeklySchedule: sharedSchedule }));
        } else {
          setTripartiteSettings(prev => ({
            ...prev,
            weeklySchedule: buildScheduleFromData(tripartiteData),
          }));
          setConsultationSettings(prev => ({
            ...prev,
            weeklySchedule: buildScheduleFromData(consultationData),
          }));
        }
      }

      // Load date exceptions grouped by meeting_type
      const { data: exceptionsData } = await supabase
        .from('leader_availability_exceptions')
        .select('id, exception_date, reason, meeting_type')
        .eq('leader_user_id', user.id);

      if (exceptionsData) {
        const tripartiteExceptions = exceptionsData
          .filter(e => e.meeting_type === 'tripartite' || e.meeting_type === 'both')
          .map(e => ({
            id: e.id,
            date: parseISO(e.exception_date),
            reason: e.reason || 'Niedostępny/a',
          }));
          
        const consultationExceptions = exceptionsData
          .filter(e => e.meeting_type === 'consultation' || e.meeting_type === 'both')
          .map(e => ({
            id: e.id,
            date: parseISO(e.exception_date),
            reason: e.reason || 'Niedostępny/a',
          }));
        
        // If all are 'both', use same for both types
        const allExceptionsBoth = exceptionsData.every(e => e.meeting_type === 'both');
        
        if (allExceptionsBoth) {
          const sharedExceptions = exceptionsData.map(e => ({
            id: e.id,
            date: parseISO(e.exception_date),
            reason: e.reason || 'Niedostępny/a',
          }));
          setTripartiteSettings(prev => ({ ...prev, dateExceptions: sharedExceptions }));
          setConsultationSettings(prev => ({ ...prev, dateExceptions: sharedExceptions }));
        } else {
          setTripartiteSettings(prev => ({ ...prev, dateExceptions: tripartiteExceptions }));
          setConsultationSettings(prev => ({ ...prev, dateExceptions: consultationExceptions }));
        }
      }

      // Load meeting type settings (title, description, image)
      const { data: meetingSettings } = await supabase
        .from('leader_meeting_settings')
        .select('*')
        .eq('leader_user_id', user.id);

      if (meetingSettings) {
        const tripartite = meetingSettings.find(s => s.meeting_type === 'tripartite');
        const consultation = meetingSettings.find(s => s.meeting_type === 'consultation');
        
        if (tripartite) {
          setTripartiteSettings(prev => ({
            ...prev,
            title: tripartite.title || 'Spotkanie trójstronne',
            description: tripartite.description || '',
            image_url: tripartite.image_url || '',
          }));
        }
        
        if (consultation) {
          setConsultationSettings(prev => ({
            ...prev,
            title: consultation.title || 'Konsultacje dla partnerów',
            description: consultation.description || '',
            image_url: consultation.image_url || '',
          }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildInsertData = (
    schedule: WeeklySchedule,
    meetingType: 'tripartite' | 'consultation',
    slotDuration: number
  ) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const insertData: any[] = [];
    
    Object.entries(schedule).forEach(([dayStr, daySchedule]) => {
      if (daySchedule.enabled) {
        daySchedule.ranges.forEach(range => {
          insertData.push({
            leader_user_id: user!.id,
            day_of_week: parseInt(dayStr),
            specific_date: null,
            start_time: range.start,
            end_time: range.end,
            is_active: true,
            slot_duration_minutes: slotDuration,
            timezone,
            meeting_type: meetingType,
          });
        });
      }
    });
    
    return insertData;
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
      // 1. Delete old weekly availability (day_of_week based)
      await supabase
        .from('leader_availability')
        .delete()
        .eq('leader_user_id', user.id)
        .not('day_of_week', 'is', null);

      // 2. Insert new weekly schedules for both types
      const tripartiteInsertData = buildInsertData(
        tripartiteSettings.weeklySchedule,
        'tripartite',
        tripartiteSettings.slot_duration
      );
      const consultationInsertData = buildInsertData(
        consultationSettings.weeklySchedule,
        'consultation',
        consultationSettings.slot_duration
      );

      const allInsertData = [...tripartiteInsertData, ...consultationInsertData];
      
      if (allInsertData.length > 0) {
        const { error: weeklyError } = await supabase
          .from('leader_availability')
          .insert(allInsertData);

        if (weeklyError) throw weeklyError;
      }

      // 3. Update date exceptions
      // Delete all existing exceptions for this user
      await supabase
        .from('leader_availability_exceptions')
        .delete()
        .eq('leader_user_id', user.id);

      // Insert new exceptions for both types
      const tripartiteExceptionsInsert = tripartiteSettings.dateExceptions.map(ex => ({
        leader_user_id: user.id,
        exception_date: format(ex.date, 'yyyy-MM-dd'),
        reason: ex.reason,
        meeting_type: 'tripartite',
      }));
      
      const consultationExceptionsInsert = consultationSettings.dateExceptions.map(ex => ({
        leader_user_id: user.id,
        exception_date: format(ex.date, 'yyyy-MM-dd'),
        reason: ex.reason,
        meeting_type: 'consultation',
      }));

      const allExceptionsInsert = [...tripartiteExceptionsInsert, ...consultationExceptionsInsert];
      
      if (allExceptionsInsert.length > 0) {
        const { error: excError } = await supabase
          .from('leader_availability_exceptions')
          .insert(allExceptionsInsert);

        if (excError) throw excError;
      }

      // 4. Update leader_permissions
      const { error: permError } = await supabase
        .from('leader_permissions')
        .update({ 
          zoom_link: zoomLink || null,
          use_external_booking: bookingMode === 'external',
          external_calendly_url: bookingMode === 'external' ? externalCalendlyUrl : null,
          tripartite_meeting_enabled: tripartiteSettings.is_active,
          partner_consultation_enabled: consultationSettings.is_active,
          tripartite_slot_duration: tripartiteSettings.slot_duration,
          consultation_slot_duration: consultationSettings.slot_duration,
        })
        .eq('user_id', user.id);

      if (permError) {
        console.error('Error updating leader_permissions:', permError);
      }

      // 5. Upsert meeting type settings
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

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
              Ustaw osobne harmonogramy dla każdego typu spotkania. Oba typy blokują wzajemnie te same godziny.
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
                  Masz połączony Google Calendar - zajętość będzie automatycznie sprawdzana
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

            {/* Video Link - only for internal mode */}
            {bookingMode === 'internal' && (
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5" />
                  Link do spotkania (Zoom/Meet)
                </Label>
                <Input
                  value={zoomLink}
                  onChange={(e) => setZoomLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="h-9"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meeting Type Cards - two column layout for internal mode */}
        {bookingMode === 'internal' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MeetingTypeCard
              type="tripartite"
              title="Spotkanie trójstronne"
              icon={<Users className="h-4 w-4" />}
              colorClass="text-violet-500"
              settings={tripartiteSettings}
              onSettingsChange={setTripartiteSettings}
              compact
            />
            
            <MeetingTypeCard
              type="consultation"
              title="Konsultacje dla partnerów"
              icon={<UserRound className="h-4 w-4" />}
              colorClass="text-fuchsia-500"
              settings={consultationSettings}
              onSettingsChange={setConsultationSettings}
              compact
            />
          </div>
        )}

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
