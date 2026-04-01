import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Copy, Check, Share2, ChevronDown } from 'lucide-react';
import { useAutoWebinarConfig, type AutoWebinarCategory } from '@/hooks/useAutoWebinar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { copyToClipboard } from '@/lib/clipboardUtils';
import { getInvitationLabels, getDateLocale } from '@/utils/invitationTemplates';
import { InvitationLanguageSelect } from '@/components/InvitationLanguageSelect';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { isMobileDevice } from '@/lib/imageShareUtils';

interface LinkedEvent {
  id: string;
  title: string;
  slug: string;
}

interface SlotKey {
  dayIndex: number;
  time: string;
}

const CATEGORY_LABELS: Record<AutoWebinarCategory, string> = {
  business_opportunity: 'Business Opportunity',
  health_conversation: 'Health Conversation',
};

const CategoryColumn: React.FC<{ category: AutoWebinarCategory; isOpen: boolean; onOpenChange: (open: boolean) => void }> = ({ category, isOpen, onOpenChange }) => {
  const { config, loading: configLoading } = useAutoWebinarConfig(category);
  const { profile, isAdmin, isPartner, isSpecjalista, isClient } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const [linkedEvent, setLinkedEvent] = useState<LinkedEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<SlotKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteLang, setInviteLang] = useState(language);
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
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
        label: i === 0 ? 'Dziś' : i === 1 ? 'Jutro' : 'Pojutrze',
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
    const tz = (config as any)?.timezone || 'Europe/Warsaw';
    let currentMin: number;
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false
      }).formatToParts(new Date());
      const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
      let h = get('hour');
      if (h === 24) h = 0;
      currentMin = h * 60 + get('minute');
    } catch {
      const now = new Date();
      currentMin = now.getHours() * 60 + now.getMinutes();
    }
    const [h, m] = time.split(':').map(Number);
    const slotStart = h * 60 + m;
    const slotIdx = timeSlots.indexOf(time);
    const nextSlotTime = slotIdx >= 0 && slotIdx < timeSlots.length - 1 ? timeSlots[slotIdx + 1] : null;
    const slotEnd = nextSlotTime
      ? (() => { const [nh, nm] = nextSlotTime.split(':').map(Number); return nh * 60 + nm; })()
      : slotStart + (config?.interval_minutes || 60);
    if (currentMin >= slotStart && currentMin < slotStart + 2) return 'now';
    if (currentMin >= slotStart + 2 && currentMin < slotEnd) return 'ongoing';
    if (currentMin >= slotEnd) return 'past';
    return 'future';
  };

  const buildInvitationText = () => {
    if (!selectedSlot || !config) return '';
    const day = days[selectedSlot.dayIndex];
    const title = config.invitation_title || config.room_title || 'Webinar';
    const description = config.invitation_description || '';
    const eqId = profile?.eq_id;
    const slug = linkedEvent?.slug;
    const baseUrl = 'https://purelife.info.pl';
    const params = new URLSearchParams();
    if (eqId) params.set('ref', eqId);
    params.set('slot', format(day.date, 'yyyy-MM-dd') + '_' + selectedSlot.time);
    if (inviteLang !== 'pl') params.set('lang', inviteLang);
    const inviteUrl = slug ? `${baseUrl}/e/${slug}?${params.toString()}` : baseUrl;

    const labels = getInvitationLabels(inviteLang);
    const locale = getDateLocale(inviteLang);
    const dateStr = format(day.date, 'EEEE, d MMMM', { locale });

    return `🎥 ${labels.webinarInvitation}: ${title}

📅 ${labels.date}: ${dateStr}
⏰ ${labels.time}: ${selectedSlot.time}
${description ? `\n${description}\n` : ''}
${labels.signUp}: ${inviteUrl}`.trim();
  };

  const handleCopy = async () => {
    const text = buildInvitationText();
    if (!text) return;
    const success = await copyToClipboard(text);
    const labels = getInvitationLabels(inviteLang);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: labels.copied, description: labels.invitationCopied });
    }
  };

  const handleShare = async () => {
    const text = buildInvitationText();
    if (!text) return;
    try {
      await navigator.share({ title: 'Zaproszenie na webinar', text });
    } catch {
      await handleCopy();
    }
  };

  if (configLoading || loadingEvent) {
    return (
      <div className="animate-pulse space-y-2 p-4">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-8 bg-muted rounded" />
      </div>
    );
  }

  if (!config?.is_enabled) return null;

  const hasLiveSlot = timeSlots.some(t => {
    const s = getSlotStatus(0, t);
    return s === 'now' || s === 'ongoing';
  });

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex items-center justify-center w-full p-3 rounded-lg hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">LIVE</Badge>
          <span className="font-semibold text-sm">{CATEGORY_LABELS[category]}</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-3 pb-3 space-y-3">
        {/* Day tabs */}
        <div className="flex gap-1">
          {days.map((day) => (
            <button
              key={day.index}
              onClick={() => { setActiveDay(day.index); setSelectedSlot(null); }}
              className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors font-medium ${
                activeDay === day.index
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        {/* Slots grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {timeSlots.map((time) => {
            const status = getSlotStatus(activeDay, time);
            const selected = selectedSlot?.dayIndex === activeDay && selectedSlot?.time === time;
            const isPast = status === 'past';
            const isLive = status === 'now' || status === 'ongoing';

            return (
              <button
                key={time}
                disabled={isPast || isLive}
                onClick={() => setSelectedSlot({ dayIndex: activeDay, time })}
                className={`relative text-xs py-1.5 rounded-md font-medium transition-all ${
                  selected
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                    : isPast
                    ? 'bg-muted/30 text-muted-foreground/40 line-through cursor-not-allowed'
                    : isLive
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 cursor-not-allowed border border-red-500/20'
                    : 'bg-muted/50 text-foreground hover:bg-accent cursor-pointer'
                }`}
              >
                {time}
                {isLive && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        {selectedSlot && (
          <div className="flex items-center gap-2 pt-1">
            <InvitationLanguageSelect value={inviteLang} onValueChange={setInviteLang} />
            <Button
              size="sm"
              variant="default"
              className="flex-1 gap-1.5 text-xs"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Skopiowano!' : 'Kopiuj zaproszenie'}
            </Button>
            {isMobileDevice() && navigator.share && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={handleShare}
              >
                <Share2 className="h-3.5 w-3.5" />
                Udostępnij
              </Button>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

const WebinarInviteWidget: React.FC = () => {
  const { isAdmin, isPartner, isSpecjalista, isClient, user } = useAuth();
  const [openCategory, setOpenCategory] = useState<AutoWebinarCategory | null>(null);
  const [masterVisible, setMasterVisible] = useState<boolean | null>(null);
  const [hasAutoWebinarAccess, setHasAutoWebinarAccess] = useState<boolean | null>(null);
  const { config: boConfig, loading: boLoading } = useAutoWebinarConfig('business_opportunity');
  const { config: hcConfig, loading: hcLoading } = useAutoWebinarConfig('health_conversation');

  useEffect(() => {
    const fetchVisibility = async () => {
      const { data } = await supabase
        .from('feature_visibility')
        .select('visible_to_admin, visible_to_partner, visible_to_specjalista, visible_to_client')
        .eq('feature_key', 'dashboard.webinar_invite')
        .single();
      if (!data) { setMasterVisible(false); return; }
      const visible =
        (isAdmin && data.visible_to_admin) ||
        (isPartner && data.visible_to_partner) ||
        (isSpecjalista && data.visible_to_specjalista) ||
        (isClient && data.visible_to_client) ||
        false;
      setMasterVisible(visible);
    };
    fetchVisibility();
  }, [isAdmin, isPartner, isSpecjalista, isClient]);

  // Check per-user auto-webinar access for non-admin users
  useEffect(() => {
    if (isAdmin) { setHasAutoWebinarAccess(true); return; }
    if (!user?.id || !isPartner) { setHasAutoWebinarAccess(false); return; }
    const checkAccess = async () => {
      const { data } = await supabase
        .from('leader_permissions')
        .select('can_access_auto_webinar')
        .eq('user_id', user.id)
        .maybeSingle();
      setHasAutoWebinarAccess((data as any)?.can_access_auto_webinar === true);
    };
    checkAccess();
  }, [user?.id, isAdmin, isPartner]);

  if (masterVisible !== true) return null;
  if (hasAutoWebinarAccess !== true) return null;
  if (boLoading || hcLoading) return null;

  const canSee = (cfg: typeof boConfig) => {
    if (!cfg?.is_enabled) return false;
    if (isAdmin) return true;
    return (isPartner && cfg.visible_to_partners) ||
           (isSpecjalista && cfg.visible_to_specjalista) ||
           (isClient && cfg.visible_to_clients);
  };

  const showBO = canSee(boConfig);
  const showHC = canSee(hcConfig);
  if (!showBO && !showHC) return null;

  const handleOpenChange = (category: AutoWebinarCategory) => (open: boolean) => {
    setOpenCategory(open ? category : null);
  };

  return (
    <Card className="col-span-full border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardContent className="p-4 space-y-2">
        <div className="flex flex-col items-center gap-1 py-1">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500" />
            <h2 className="text-xl font-bold text-foreground">Zaproś Swojego Gościa na Live Webinar</h2>
          </div>
          <p className="text-xs text-muted-foreground">kliknij, wybierz webinar, dobierz termin i skopiuj zaproszenie</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {showBO && <CategoryColumn category="business_opportunity" isOpen={openCategory === 'business_opportunity'} onOpenChange={handleOpenChange('business_opportunity')} />}
          {showHC && <CategoryColumn category="health_conversation" isOpen={openCategory === 'health_conversation'} onOpenChange={handleOpenChange('health_conversation')} />}
        </div>
      </CardContent>
    </Card>
  );
};

export default WebinarInviteWidget;
