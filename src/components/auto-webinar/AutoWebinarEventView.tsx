import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, Clock, Copy, Check, Radio } from 'lucide-react';
import { useAutoWebinarConfig, type AutoWebinarCategory } from '@/hooks/useAutoWebinar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { copyToClipboard } from '@/lib/clipboardUtils';
import { getInvitationLabels, getDateLocale } from '@/utils/invitationTemplates';
import { InvitationLanguageSelect } from '@/components/InvitationLanguageSelect';

interface LinkedEvent {
  id: string;
  title: string;
  slug: string;
}

interface SlotKey {
  dayIndex: number;
  time: string;
}

export const AutoWebinarEventView: React.FC<{ category?: AutoWebinarCategory }> = ({ category = 'business_opportunity' }) => {
  const { config, loading: configLoading } = useAutoWebinarConfig(category);
  const { profile } = useAuth();
  const { toast } = useToast();
  const [linkedEvent, setLinkedEvent] = React.useState<LinkedEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = React.useState(true);
  const [selectedSlot, setSelectedSlot] = useState<SlotKey | null>(null);
  const [copied, setCopied] = useState(false);
  const { language } = useLanguage();
  const [inviteLang, setInviteLang] = useState(language);
  const [activeDay, setActiveDay] = useState(0);

  React.useEffect(() => {
    if (!config?.event_id) { setLoadingEvent(false); return; }
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

  const days = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 3 }, (_, i) => {
      const date = addDays(now, i);
      return {
        index: i,
        date,
        label: format(date, 'EEE, d MMM', { locale: pl }),
        fullLabel: format(date, 'EEEE, d MMMM', { locale: pl }),
        isToday: i === 0,
      };
    });
  }, []);

  const timeSlots = useMemo(() => {
    if (!config) return [];
    const slotHours = (config as any).slot_hours as string[] | undefined;
    if (slotHours && slotHours.length > 0) {
      return [...slotHours].sort();
    }
    // Legacy fallback
    const intervalMin = config.interval_minutes || 60;
    const slots: string[] = [];
    for (let m = config.start_hour * 60; m < config.end_hour * 60; m += intervalMin) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
    return slots;
  }, [config]);

  const getSlotStatus = (dayIndex: number, time: string) => {
    if (dayIndex > 0) return 'future';
    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    const intervalMin = config?.interval_minutes || 60;
    const slotStart = h * 60 + m;
    const slotEnd = slotStart + intervalMin;
    const currentMin = now.getHours() * 60 + now.getMinutes();
    if (currentMin >= slotStart && currentMin < slotStart + 2) return 'now';
    if (currentMin >= slotStart + 2 && currentMin < slotEnd) return 'ongoing';
    if (currentMin >= slotEnd) return 'past';
    return 'future';
  };

  const handleCopy = async () => {
    if (!selectedSlot || !config) return;
    const day = days[selectedSlot.dayIndex];
    const title = config.invitation_title || config.room_title || 'Webinar';
    const description = config.invitation_description || '';
    const eqId = profile?.eq_id;
    const slug = linkedEvent?.slug;
    const baseUrl = 'https://purelife.info.pl';
    const params = new URLSearchParams();
    if (eqId) params.set('ref', eqId);
    params.set('slot', selectedSlot.time);
    if (inviteLang !== 'pl') params.set('lang', inviteLang);
    const inviteUrl = slug
      ? `${baseUrl}/e/${slug}?${params.toString()}`
      : baseUrl;

    const labels = getInvitationLabels(inviteLang);
    const locale = getDateLocale(inviteLang);
    const dateStr = format(day.date, 'EEEE, d MMMM', { locale });

    const invitationText = `🎥 ${labels.webinarInvitation}: ${title}

📅 ${labels.date}: ${dateStr}
⏰ ${labels.time}: ${selectedSlot.time}
${description ? `\n${description}\n` : ''}
${labels.signUp}: ${inviteUrl}`.trim();

    const success = await copyToClipboard(invitationText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: labels.copied,
        description: `${labels.invitationCopied}`,
      });
    }
  };

  const isSelected = (dayIndex: number, time: string) =>
    selectedSlot?.dayIndex === dayIndex && selectedSlot?.time === time;

  if (configLoading || loadingEvent) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!config?.is_enabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
        <Radio className="h-10 w-10 text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold mb-1">Auto-webinary są wyłączone</h2>
        <p className="text-sm text-muted-foreground">Sprawdź ponownie później</p>
      </div>
    );
  }

  const imageUrl = config.invitation_image_url || config.room_logo_url;
  const title = config.invitation_title || config.room_title || 'Webinar';
  const description = config.invitation_description || config.room_subtitle || '';

  const [activeDay, setActiveDay] = useState(0);

  // Group time slots by period
  const groupedSlots = useMemo(() => {
    const groups: { label: string; icon: string; slots: string[] }[] = [
      { label: 'Rano', icon: '🌅', slots: [] },
      { label: 'Południe', icon: '☀️', slots: [] },
      { label: 'Wieczór', icon: '🌙', slots: [] },
    ];
    timeSlots.forEach(time => {
      const h = parseInt(time.split(':')[0]);
      if (h < 12) groups[0].slots.push(time);
      else if (h < 18) groups[1].slots.push(time);
      else groups[2].slots.push(time);
    });
    return groups.filter(g => g.slots.length > 0);
  }, [timeSlots]);

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardContent className="p-4 space-y-4">
          {/* Compact header */}
          <div className="flex gap-3 items-start">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={title}
                className="w-20 h-14 rounded-lg object-cover shrink-0"
                loading="lazy"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0 h-5">
                  <Video className="h-3 w-3" />
                  Webinar
                </Badge>
                <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 h-5 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Co {config.interval_minutes || 60} min
                </Badge>
              </div>
              <h2 className="text-base font-bold leading-tight truncate">{title}</h2>
              {description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
              )}
            </div>
          </div>

          {/* Day tabs */}
          <div className="flex gap-1.5">
            {days.map((day) => (
              <button
                key={day.index}
                onClick={() => setActiveDay(day.index)}
                className={`flex-1 text-center py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                  activeDay === day.index
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : day.isToday
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>

          {/* Time slots grid grouped by period */}
          <div className="space-y-3">
            {groupedSlots.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-sm">{group.icon}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{group.label}</span>
                  <span className="text-[10px] text-muted-foreground/60">({group.slots.length})</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {group.slots.map((time) => {
                    const status = getSlotStatus(activeDay, time);
                    const selected = isSelected(activeDay, time);
                    const isPast = status === 'past';
                    const isNow = status === 'now';
                    const isOngoing = status === 'ongoing';
                    const isLive = isNow || isOngoing;
                    const isUnavailable = isPast || isLive;

                    return (
                      <button
                        key={time}
                        disabled={isUnavailable}
                        onClick={() => !isUnavailable && setSelectedSlot(
                          selected ? null : { dayIndex: activeDay, time }
                        )}
                        className={`relative rounded-lg px-1 py-2 text-sm font-mono font-medium transition-all text-center ${
                          selected
                            ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30'
                            : isLive
                              ? 'bg-destructive/10 border border-destructive/30 text-foreground cursor-not-allowed'
                              : isPast
                                ? 'text-muted-foreground/40 line-through cursor-not-allowed bg-muted/20'
                                : 'bg-muted/40 hover:bg-primary/10 hover:text-primary text-foreground border border-transparent hover:border-primary/20'
                        }`}
                      >
                        {time}
                        {isLive && (
                          <span className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-destructive text-white text-[8px] font-sans font-bold px-1 py-0.5 rounded-full leading-none">
                            <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                            LIVE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Copy button with language select */}
          {selectedSlot && (
            <div className="flex items-center gap-2 pt-1">
              <InvitationLanguageSelect value={inviteLang} onValueChange={setInviteLang} />
              <Button
                variant="action"
                className="flex-1 gap-2"
                onClick={handleCopy}
              >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Skopiowano!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Kopiuj zaproszenie — {days[selectedSlot.dayIndex].fullLabel}, {selectedSlot.time}
                </>
              )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
