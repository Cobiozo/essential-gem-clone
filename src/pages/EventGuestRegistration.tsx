import React, { useState, useEffect } from 'react';
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
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, Clock, User, CheckCircle, AlertCircle, Video } from 'lucide-react';
import pureLifeLogo from '@/assets/pure-life-logo-new.png';

const registrationSchema = z.object({
  email: z.string().email('Podaj prawidłowy adres email'),
  first_name: z.string().min(2, 'Imię musi mieć minimum 2 znaki'),
  last_name: z.string().optional(),
  phone: z.string().optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

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
  
  // Validate UUID format - if invalid, set to null
  const invitedBy = isValidUUID(invitedByRaw) ? invitedByRaw : null;
  
  // Log warning if UUID was invalid
  if (invitedByRaw && !invitedBy) {
    console.warn('Invalid invited_by UUID format, ignoring:', invitedByRaw);
  }
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

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
          .select('id, title, description, start_time, end_time, image_url, host_name, zoom_link, location, duration_minutes, is_active, is_published')
          .eq('id', eventId)
          .eq('is_active', true)
          .eq('is_published', true)
          .single();

        if (error) {
          console.error('Event fetch error:', error.message, error.code, error.details);
          throw error;
        }
        console.log('Event fetched successfully:', data?.title);
        setEvent(data);
      } catch (err: any) {
        console.error('Error fetching event:', err?.message || err);
        setError(`Nie znaleziono wydarzenia lub jest nieaktywne. (${err?.code || 'unknown'})`);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const onSubmit = async (data: RegistrationFormData) => {
    if (!eventId) return;
    
    setSubmitting(true);
    setError(null);

    try {
      // Check if already registered
      const { data: existing } = await supabase
        .from('guest_event_registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('email', data.email)
        .maybeSingle();

      if (existing) {
        setAlreadyRegistered(true);
        return;
      }

      // Insert registration
      const { error: insertError } = await supabase
        .from('guest_event_registrations')
        .insert({
          event_id: eventId,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name || null,
          phone: data.phone || null,
          invited_by_user_id: invitedBy || null,
          source: 'webinar_form',
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setAlreadyRegistered(true);
          return;
        }
        throw insertError;
      }

      // Call edge function to send confirmation email and add to contacts
      try {
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
            eventHost: event?.host_name,
          },
        });
      } catch (emailError) {
        console.warn('Email confirmation failed, but registration succeeded:', emailError);
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Registration error:', err?.message || err, err?.code, err?.details);
      setError(`Wystąpił błąd podczas rejestracji: ${err?.message || 'nieznany błąd'}. Spróbuj ponownie.`);
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

  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  const isPast = new Date() > endDate;

  if (success || alreadyRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <img src={pureLifeLogo} alt="Pure Life" className="h-12 mx-auto mb-4" />
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <CardTitle className="text-2xl">
              {alreadyRegistered ? 'Już jesteś zapisany!' : 'Rejestracja zakończona!'}
            </CardTitle>
            <CardDescription>
              {alreadyRegistered 
                ? 'Ten adres email jest już zarejestrowany na to wydarzenie.'
                : 'Dziękujemy za zapisanie się na webinar. Wysłaliśmy potwierdzenie na podany adres email.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">{event.title}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(startDate, 'PPP', { locale: pl })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}</span>
              </div>
              {event.host_name && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{event.host_name}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Przypomnienie o webinarze otrzymasz 24 godziny przed jego rozpoczęciem.
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
          {/* Event Image */}
          {event.image_url && (
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
          )}

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
              {event.host_name && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Prowadzący: {event.host_name}</p>
                  </div>
                </div>
              )}
            </div>

            {isPast ? (
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground">Ten webinar już się odbył.</p>
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
