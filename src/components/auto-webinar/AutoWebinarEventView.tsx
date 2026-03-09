import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, Clock, Copy, Check, Radio, CalendarDays } from 'lucide-react';
import { useAutoWebinarConfig } from '@/hooks/useAutoWebinar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { copyToClipboard } from '@/lib/clipboardUtils';

interface LinkedEvent {
  id: string;
  title: string;
  slug: string;
}

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
  isPast: boolean;
  isNow: boolean;
}

export const AutoWebinarEventView: React.FC = () => {
  const { config, loading: configLoading } = useAutoWebinarConfig();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [linkedEvent, setLinkedEvent] = React.useState<LinkedEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = React.useState(true);
  const [copiedSlot, setCopiedSlot] = useState<string | null>(null);

  // Fetch the linked event to get slug
  React.useEffect(() => {
    if (!config?.event_id) {
      setLoadingEvent(false);
      return;
    }
    const fetchEvent = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, slug')
        .eq('id', config.event_id)
        .single();
      setLinkedEvent(data as LinkedEvent | null);
      setLoadingEvent(false);
    };
    fetchEvent();
  }, [config?.event_id]);

  // Generate time slots based on config
  const slots = useMemo<TimeSlot[]>(() => {
    if (!config) return [];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const intervalMin = config.interval_minutes || 60;
    const result: TimeSlot[] = [];

    for (let m = config.start_hour * 60; m < config.end_hour * 60; m += intervalMin) {
      const hour = Math.floor(m / 60);
      const minute = m % 60;
      const slotEndMinutes = m + intervalMin;
      const isPast = currentMinutes >= slotEndMinutes;
      const isNow = currentMinutes >= m && currentMinutes < slotEndMinutes;
      result.push({
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        hour,
        minute,
        isPast,
        isNow,
      });
    }
    return result;
  }, [config]);

  const handleCopyInvitation = async (slot: TimeSlot) => {
    const title = config?.invitation_title || config?.room_title || 'Webinar';
    const description = config?.invitation_description || '';
    const eqId = profile?.eq_id;
    const slug = linkedEvent?.slug;
    const baseUrl = 'https://purelife.info.pl';

    const inviteUrl = slug
      ? `${baseUrl}/e/${slug}${eqId ? `?ref=${eqId}` : ''}`
      : baseUrl;

    const today = format(new Date(), 'PPP', { locale: pl });

    const invitationText = `🎥 Zaproszenie na webinar: ${title}

📅 Data: ${today}
⏰ Godzina: ${slot.time}
${description ? `\n${description}\n` : ''}
Zapisz się tutaj: ${inviteUrl}`.trim();

    const success = await copyToClipboard(invitationText);
    if (success) {
      setCopiedSlot(slot.time);
      setTimeout(() => setCopiedSlot(null), 2000);
      toast({
        title: 'Skopiowano!',
        description: `Zaproszenie na godzinę ${slot.time} skopiowane do schowka`,
      });
    }
  };

  if (configLoading || loadingEvent) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!config?.is_enabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <Radio className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Auto-webinary są wyłączone</h2>
        <p className="text-muted-foreground">Sprawdź ponownie później</p>
      </div>
    );
  }

  const imageUrl = config.invitation_image_url || config.room_logo_url;
  const title = config.invitation_title || config.room_title || 'Webinar';
  const description = config.invitation_description || config.room_subtitle || '';
  const todayFormatted = format(new Date(), 'EEEE, d MMMM', { locale: pl });

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Card className="overflow-hidden border-0 shadow-lg">
        {/* Banner image */}
        {imageUrl && (
          <div className="relative aspect-video bg-muted overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <CardContent className="p-5 space-y-4">
          {/* Badge + title */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Video className="h-3 w-3" />
                Webinar
              </Badge>
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Co {config.interval_minutes || 60} min
              </Badge>
            </div>
            <h2 className="text-xl font-bold">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{description}</p>
            )}
          </div>

          {/* Time slots */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Dostępne sesje — {todayFormatted}
            </h3>

            <div className="grid gap-1.5">
              {slots.map((slot) => (
                <div
                  key={slot.time}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                    slot.isNow
                      ? 'bg-primary/10 border border-primary/30'
                      : slot.isPast
                        ? 'bg-muted/40'
                        : 'bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        slot.isNow
                          ? 'bg-primary animate-pulse'
                          : slot.isPast
                            ? 'bg-muted-foreground/30'
                            : 'bg-primary/50'
                      }`}
                    />
                    <span
                      className={`font-mono text-sm font-medium ${
                        slot.isPast ? 'text-muted-foreground/50 line-through' : ''
                      }`}
                    >
                      {slot.time}
                    </span>
                    {slot.isNow && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 animate-pulse">
                        TRWA
                      </Badge>
                    )}
                  </div>

                  {slot.isPast ? (
                    <span className="text-xs text-muted-foreground/50">Zakończone</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => handleCopyInvitation(slot)}
                    >
                      {copiedSlot === slot.time ? (
                        <>
                          <Check className="h-3 w-3" />
                          Skopiowano
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Kopiuj zaproszenie
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
