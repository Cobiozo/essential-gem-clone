import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, Clock, User, CheckCircle, AlertCircle, Video } from 'lucide-react';
import { getRegistrationLabels, getDateLocale } from '@/utils/invitationTemplates';

interface AutoWebinarSlotConfig {
  start_hour: number;
  end_hour: number;
  interval_minutes: number;
}

interface AutoWebinarVideoData {
  title: string;
  description: string | null;
  host_name: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
}

const getNextSlot = (config: AutoWebinarSlotConfig, preferredTime?: string | null): { date: Date; time: string } => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const totalMinutes = currentHour * 60 + currentMin;
  const interval = config.interval_minutes;

  // If a preferred time is provided (from URL slot param), use it
  if (preferredTime && /^\d{2}:\d{2}$/.test(preferredTime)) {
    const [ph, pm] = preferredTime.split(':').map(Number);
    const preferredMin = ph * 60 + pm;
    // Check if this time is a valid slot
    if (ph >= config.start_hour && ph < config.end_hour && preferredMin % interval === (config.start_hour * 60) % interval) {
      const slotDate = new Date(now);
      if (preferredMin > totalMinutes) {
        // Today
        slotDate.setHours(ph, pm, 0, 0);
      } else {
        // Tomorrow
        const tomorrow = addDays(now, 1);
        tomorrow.setHours(ph, pm, 0, 0);
        return { date: tomorrow, time: preferredTime };
      }
      return { date: slotDate, time: preferredTime };
    }
  }

  // Generate slots for today
  for (let h = config.start_hour; h < config.end_hour; h++) {
    for (let m = 0; m < 60; m += interval) {
      const slotMin = h * 60 + m;
      if (slotMin > totalMinutes) {
        const slotDate = new Date(now);
        slotDate.setHours(h, m, 0, 0);
        return { date: slotDate, time: format(slotDate, 'HH:mm') };
      }
    }
  }

  // No future slot today — return first slot tomorrow
  const tomorrow = addDays(now, 1);
  tomorrow.setHours(config.start_hour, 0, 0, 0);
  return { date: tomorrow, time: format(tomorrow, 'HH:mm') };
};
import pureLifeLogo from '@/assets/pure-life-droplet-new.png';

// Schema is created dynamically based on lang — see inside the component
type RegistrationFormData = {
  email: string;
  first_name: string;
  last_name?: string;
  phone?: string;
};

interface EventData {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  image_url: string | null;
  host_name: string | null;
  zoom_link: string | null;
  location: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  is_published: boolean;
  event_type: string | null;
  slug: string | null;
}

// UUID validation helper
const isValidUUID = (str: string | null): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const EventGuestRegistration: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const invitedByRaw = searchParams.get('invited_by');
  const slotParam = searchParams.get('slot');
  const lang = searchParams.get('lang') || 'pl';
  
  // Validate UUID format - if invalid, set to null
  const invitedBy = isValidUUID(invitedByRaw) ? invitedByRaw : null;
  
  // Log warning if UUID was invalid
  if (invitedByRaw && !invitedBy) {
    console.warn('Invalid invited_by UUID format, ignoring:', invitedByRaw);
  }

  const labels = useMemo(() => getRegistrationLabels(lang), [lang]);
  const dateLocale = useMemo(() => getDateLocale(lang), [lang]);

  const registrationSchema = useMemo(() => z.object({
    email: z.string().email(labels.emailError),
    first_name: z.string().min(2, labels.nameError),
    last_name: z.string().optional(),
    phone: z.string().optional(),
  }), [labels]);
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [autoWebinarConfig, setAutoWebinarConfig] = useState<AutoWebinarSlotConfig | null>(null);
  const [autoWebinarVideo, setAutoWebinarVideo] = useState<AutoWebinarVideoData | null>(null);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
    },
  });

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      
      try {
        console.log('Fetching event with ID:', eventId);
        const { data, error } = await supabase
          .from('events')
          .select('id, title, description, start_time, end_time, image_url, host_name, zoom_link, location, duration_minutes, is_active, is_published, event_type, slug')
          .eq('id', eventId)
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Event fetch error:', error.message, error.code, error.details);
          throw error;
        }
        console.log('Event fetched successfully:', data?.title);
        setEvent(data);
      } catch (err: any) {
        console.error('Error fetching event:', err?.message || err);
        setError(`${labels.notFound} (${err?.code || 'unknown'})`);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  // Fetch auto-webinar config and first video when event is auto_webinar
  useEffect(() => {
    if (!event || event.event_type !== 'auto_webinar') return;
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('auto_webinar_config')
        .select('start_hour, end_hour, interval_minutes')
        .eq('event_id', event.id)
        .maybeSingle();
      if (data) setAutoWebinarConfig(data as AutoWebinarSlotConfig);

      // Fetch first active video for display data
      const { data: videoData } = await supabase
        .from('auto_webinar_videos')
        .select('title, description, host_name, cover_image_url, thumbnail_url')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (videoData) setAutoWebinarVideo(videoData as AutoWebinarVideoData);
    };
    fetchConfig();
  }, [event]);

  const onSubmit = async (data: RegistrationFormData) => {
    if (!eventId) return;
    
    setSubmitting(true);
    setError(null);

    try {
      // Use RPC for atomic registration with attempt counting
      const { data: rpcResult, error: rpcError } = await supabase.rpc('register_event_guest', {
        p_event_id: eventId,
        p_email: data.email,
        p_first_name: data.first_name,
        p_last_name: data.last_name || null,
        p_phone: data.phone || null,
        p_invited_by: invitedBy || null,
        p_source: 'webinar_form',
      });

      if (rpcError) throw rpcError;

      if ((rpcResult as any)?.status === 'already_registered') {
        setAlreadyRegistered(true);
        return;
      }

      // Call edge function to send confirmation email and add to contacts
      try {
        const nextSlot = autoWebinarConfig ? getNextSlot(autoWebinarConfig, slotParam) : null;
        const slotDiffMinutes = nextSlot ? (nextSlot.date.getTime() - Date.now()) / (1000 * 60) : null;

        await supabase.functions.invoke('send-webinar-confirmation', {
          body: {
            eventId,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            phone: data.phone,
            invitedByUserId: invitedBy,
            eventTitle: event?.title,
            eventDate: event?.start_time,
            eventHost: autoWebinarVideo?.host_name || event?.host_name,
            // Auto-webinar specific
            isAutoWebinar,
            nextSlotTime: nextSlot ? nextSlot.date.toISOString() : undefined,
            nextSlotTimeFormatted: nextSlot ? `${format(nextSlot.date, 'EEEE, d MMMM', { locale: dateLocale })} o godz. ${nextSlot.time}` : undefined,
            minutesToNextSlot: slotDiffMinutes !== null ? Math.round(slotDiffMinutes) : undefined,
            roomLink: isAutoWebinar && event?.slug ? `https://purelife.info.pl/auto-webinar/watch/${event.slug}` : (isAutoWebinar ? `https://purelife.info.pl/auto-webinar` : undefined),
            videoHostName: autoWebinarVideo?.host_name || undefined,
            videoCoverImageUrl: autoWebinarVideo?.cover_image_url || undefined,
            videoDescription: autoWebinarVideo?.description || undefined,
          },
        });
      } catch (emailError) {
        console.warn('Email confirmation failed, but registration succeeded:', emailError);
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Registration error:', err?.message || err, err?.code, err?.details);
      setError(`${labels.registrationError}: ${err?.message || 'unknown'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) return null;

  const isAutoWebinar = event.event_type === 'auto_webinar';
  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  const isPast = !isAutoWebinar && new Date() > endDate;
  const registrationCutoff = new Date(startDate.getTime() + 15 * 60 * 1000);
  const isAfterCutoff = !isAutoWebinar && new Date() > registrationCutoff && !isPast;
  const cutoffTimeStr = format(registrationCutoff, 'HH:mm');

  if (success || alreadyRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <img src={pureLifeLogo} alt="Pure Life" className="h-12 mx-auto mb-4" />
            {alreadyRegistered 
              ? <AlertCircle className="h-16 w-16 mx-auto text-amber-500 mb-4" />
              : <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            }
            <CardTitle className="text-2xl">
              {alreadyRegistered ? labels.alreadyRegisteredTitle : labels.successTitle}
            </CardTitle>
            <CardDescription className={alreadyRegistered ? 'text-left space-y-2' : ''}>
              {alreadyRegistered 
                ? (
                  <>
                    <p>{labels.alreadyRegisteredMsg1}</p>
                    <p>{labels.alreadyRegisteredMsg2}</p>
                    <p>{labels.alreadyRegisteredMsg3}</p>
                  </>
                )
                : labels.successMessage
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">{event.title}</h3>
              {isAutoWebinar ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Video className="h-4 w-4" />
                    <span>{labels.onlineWebinar}</span>
                  </div>
                  {autoWebinarConfig && (() => {
                     const slot = getNextSlot(autoWebinarConfig, slotParam);
                    return (
                      <>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{format(slot.date, 'EEEE, d MMMM', { locale: dateLocale })} • {slot.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {autoWebinarConfig.interval_minutes >= 30
                            ? labels.roomOpens5min
                            : labels.roomOpensOnTime}
                        </p>
                      </>
                    );
                  })()}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(startDate, 'PPP', { locale: pl })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}</span>
                  </div>
                </>
              )}
              {event.host_name && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{event.host_name}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {isAutoWebinar
                ? (() => {
                    if (autoWebinarConfig) {
                       const slot = getNextSlot(autoWebinarConfig, slotParam);
                      const slotDate = new Date(`${slot.date.toISOString().split('T')[0]}T${slot.time}:00`);
                      const minutesToSlot = (slotDate.getTime() - Date.now()) / (1000 * 60);
                      
                      if (minutesToSlot <= 15) {
                        return 'Sprawdź swoją skrzynkę email — wysłaliśmy Ci link do natychmiastowego dołączenia! 🔴';
                      }
                      
                      const accessNote = autoWebinarConfig.interval_minutes >= 30
                        ? 'Pokój otworzy się 5 minut przed planowanym rozpoczęciem.'
                        : 'Pokój otworzy się punktualnie o wyznaczonej godzinie.';
                      return `Najbliższy webinar: ${format(slot.date, 'EEEE, d MMMM', { locale: pl })} o godz. ${slot.time}. ${accessNote}`;
                    }
                    return 'Dziękujemy za rejestrację!';
                  })()
                : (() => {
                    const hoursUntilEvent = (startDate.getTime() - Date.now()) / (1000 * 60 * 60);
                    if (hoursUntilEvent > 24) {
                      return "Otrzymasz przypomnienia: 24 godziny, 12 godzin, 2 godziny, 1 godzinę i 15 minut przed webinarem z linkiem do spotkania.";
                    } else if (hoursUntilEvent > 12) {
                      return "Otrzymasz przypomnienia: 12 godzin, 2 godziny, 1 godzinę i 15 minut przed webinarem z linkiem do spotkania.";
                    } else if (hoursUntilEvent > 2) {
                      return "Otrzymasz przypomnienia: 2 godziny, 1 godzinę i 15 minut przed webinarem z linkiem do spotkania.";
                    } else if (hoursUntilEvent > 1) {
                      return "Otrzymasz przypomnienia: 1 godzinę i 15 minut przed webinarem z linkiem do spotkania.";
                    } else {
                      return "Otrzymasz przypomnienie 15 minut przed webinarem z linkiem do spotkania.";
                    }
                  })()
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-center">
          <img src={pureLifeLogo} alt="Pure Life" className="h-10" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="overflow-hidden">
          {/* Event Image — use cover from video for auto-webinar, or event image */}
          {(isAutoWebinar && autoWebinarVideo?.cover_image_url) ? (
            <div className="relative w-full bg-muted/30">
              <img
                src={autoWebinarVideo.cover_image_url}
                alt={event.title}
                className="w-full h-auto object-contain max-h-[400px]"
              />
            </div>
          ) : event.image_url ? (
            <div className="relative w-full bg-muted/30">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-auto object-contain max-h-[400px]"
              />
              {isPast && (
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary">Zakończone</Badge>
                </div>
              )}
            </div>
          ) : null}

          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">
                <Video className="h-3 w-3 mr-1" />
                Webinar
              </Badge>
            </div>
            <CardTitle className="text-2xl">{event.title}</CardTitle>
            {event.description && (
              <CardDescription 
                className="text-base"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Event Details */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              {isAutoWebinar ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Webinar online</p>
                    </div>
                  </div>
                  {autoWebinarConfig && (() => {
                    const slot = getNextSlot(autoWebinarConfig, slotParam);
                    return (
                      <>
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{format(slot.date, 'EEEE, d MMMM', { locale: pl })} • godz. {slot.time}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground ml-8">
                          {autoWebinarConfig.interval_minutes >= 30
                            ? 'Pokój otworzy się 5 minut przed planowanym rozpoczęciem spotkania.'
                            : 'Pokój otworzy się punktualnie o wyznaczonej godzinie.'}
                        </p>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{format(startDate, 'PPPP', { locale: pl })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">
                        {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                        {event.duration_minutes && <span className="text-muted-foreground ml-2">({event.duration_minutes} min)</span>}
                      </p>
                    </div>
                  </div>
                </>
              )}
              {/* Show host from video data for auto-webinar, or from event */}
              {(isAutoWebinar && autoWebinarVideo?.host_name) ? (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Prowadzący: {autoWebinarVideo.host_name}</p>
                  </div>
                </div>
              ) : event.host_name ? (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Prowadzący: {event.host_name}</p>
                  </div>
                </div>
              ) : null}
            </div>

            {isPast ? (
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground">Ten webinar już się odbył.</p>
              </div>
            ) : isAfterCutoff ? (
              <div className="text-center p-4 bg-destructive/10 rounded-lg space-y-2">
                <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
                <p className="text-sm font-medium">Rejestracja zamknięta</p>
                <p className="text-sm text-muted-foreground">
                  Zapisanie się na spotkanie było możliwe do godz. {cutoffTimeStr}. Aktualnie spotkanie trwa. W przyszłości, aby uniknąć takiej sytuacji, zapisz się wcześniej przed rozpoczęciem spotkania.
                </p>
              </div>
            ) : (
              <>
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Zapisz się na webinar</h3>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input placeholder="jan@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Imię *</FormLabel>
                            <FormControl>
                              <Input placeholder="Jan" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nazwisko</FormLabel>
                            <FormControl>
                              <Input placeholder="Kowalski" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon</FormLabel>
                            <FormControl>
                              <Input placeholder="+48 123 456 789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {error && (
                        <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                          {error}
                        </div>
                      )}

                      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                        {submitting ? (
                          <>
                            <LoadingSpinner className="mr-2 h-4 w-4" />
                            Zapisywanie...
                          </>
                        ) : (
                          'Zapisz się na webinar'
                        )}
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        Zapisując się, wyrażasz zgodę na przetwarzanie danych osobowych w celu organizacji webinaru.
                      </p>
                    </form>
                  </Form>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t mt-8 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Pure Life. Wszelkie prawa zastrzeżone.
        </div>
      </footer>
    </div>
  );
};

export default EventGuestRegistration;
