import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Calendar, Loader2, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import type { TeamContact } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface ViewStats {
  joined_at: string;
  watch_duration_seconds: number | null;
}

interface EventRegistration {
  id: string;
  status: string;
  event_title: string;
  event_date: string;
  view_stats: ViewStats | null;
}

interface ContactEventInfoButtonProps {
  contact: TeamContact;
}

const formatDuration = (seconds: number | null): string => {
  if (!seconds || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
};

export const ContactEventInfoButton: React.FC<ContactEventInfoButtonProps> = ({ contact }) => {
  const { tf } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchRegistrations = async () => {
      setLoading(true);

      // 1. Fetch registrations for this contact
      const { data } = await supabase
        .from('guest_event_registrations')
        .select('id, status, registered_at, email, event_id, slot_time, events(title, start_time)')
        .eq('team_contact_id', contact.id)
        .neq('status', 'cancelled');

      if (!data) {
        setLoading(false);
        return;
      }

      // 2. Get registration IDs and fetch matching views by guest_registration_id
      const regIds = data.map((r: any) => r.id);
      let viewsMap = new Map<string, ViewStats>();

      if (regIds.length > 0) {
        const { data: views } = await supabase
          .from('auto_webinar_views')
          .select('guest_registration_id, joined_at, watch_duration_seconds')
          .in('guest_registration_id', regIds);

        if (views) {
          for (const v of views) {
            if (v.guest_registration_id) {
              const existing = viewsMap.get(v.guest_registration_id);
              if (!existing || (v.watch_duration_seconds || 0) > (existing.watch_duration_seconds || 0)) {
                viewsMap.set(v.guest_registration_id, {
                  joined_at: v.joined_at,
                  watch_duration_seconds: v.watch_duration_seconds,
                });
              }
            }
          }
        }
      }

      // 3. For registrations without views via guest_registration_id,
      //    try fallback matching by email + event_id (via video mapping) + slot_time
      const contactEmail = contact.email?.trim().toLowerCase();
      const regsWithoutViews = data.filter((r: any) => !viewsMap.has(r.id));
      
      if (contactEmail && regsWithoutViews.length > 0) {
        // 3a. Build video_id → event_id mapping
        const { data: videoConfigs } = await supabase
          .from('auto_webinar_videos')
          .select('id, config_id, auto_webinar_config!inner(event_id)')
          .eq('is_active', true);

        const videoToEventMap = new Map<string, string>();
        if (videoConfigs) {
          for (const vc of videoConfigs) {
            const eventId = (vc as any).auto_webinar_config?.event_id;
            if (eventId) {
              videoToEventMap.set(vc.id, eventId);
            }
          }
        }

        // 3b. Fetch unlinked views by email, including video_id
        const { data: emailViews } = await supabase
          .from('auto_webinar_views')
          .select('id, video_id, guest_email, joined_at, watch_duration_seconds, created_at')
          .eq('guest_email', contactEmail)
          .is('guest_registration_id', null)
          .order('watch_duration_seconds', { ascending: false });

        if (emailViews && emailViews.length > 0) {
          const usedViewIds = new Set<string>();

          for (const reg of regsWithoutViews) {
            const regEventId = (reg as any).event_id;
            const regSlotTime = (reg as any).slot_time;
            const regRegisteredAt = (reg as any).registered_at;
            if (!regEventId) continue;

            // Build proper datetime from date part of registered_at + slot_time (HH:MM)
            const slotDatetime = (regSlotTime && regRegisteredAt)
              ? `${regRegisteredAt.substring(0, 10)}T${regSlotTime}:00`
              : null;

            // Skip future slots — no view data possible yet
            if (slotDatetime && new Date(slotDatetime).getTime() > Date.now()) continue;

            const matchingView = emailViews.find(v => {
              if (usedViewIds.has(v.id)) return false;
              const viewEventId = videoToEventMap.get(v.video_id);
              if (viewEventId !== regEventId) return false;

              // When slot_time exists, require view to be within slot window
              if (slotDatetime && v.created_at) {
                const slotMs = new Date(slotDatetime).getTime();
                const viewMs = new Date(v.created_at).getTime();
                // View must be between 5 min before slot and 90 min after
                if (viewMs < slotMs - 5 * 60 * 1000 || viewMs > slotMs + 90 * 60 * 1000) return false;
              }

              return true;
            });

            if (matchingView) {
              usedViewIds.add(matchingView.id);
              viewsMap.set((reg as any).id, {
                joined_at: matchingView.joined_at,
                watch_duration_seconds: matchingView.watch_duration_seconds,
              });
            }
          }
        }
      }

      const mapped: EventRegistration[] = data.map((r: any) => ({
        id: r.id,
        status: r.status,
        event_title: r.events?.title || '-',
        event_date: r.slot_time || r.registered_at || r.events?.start_time || '',
        view_stats: viewsMap.get(r.id) || null,
      }));
      setRegistrations(mapped);
      setLoading(false);
    };
    fetchRegistrations();
  }, [contact.id, contact.email]);

  const hasRegistrations = registrations.length > 0;

  const tooltipText = loading
    ? tf('common.loading', 'Ładowanie...')
    : hasRegistrations
      ? `${tf('teamContacts.registeredFor', 'Zarejestrowany na')} ${registrations.length} ${registrations.length === 1 ? tf('teamContacts.meeting', 'spotkanie') : tf('teamContacts.meetings', 'spotkań')}`
      : tf('teamContacts.noRegistrations', 'Brak rejestracji na spotkania');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <Badge className="bg-green-100 text-green-800 text-xs">{tf('teamContacts.registered', 'Zapisano')}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-xs">{tf('teamContacts.cancelled', 'Anulowany')}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={loading}
                className={hasRegistrations ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground hover:text-muted-foreground/80'}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : hasRegistrations ? (
                  <CalendarCheck className="w-4 h-4" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>

        <PopoverContent className="w-80" align="end">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">
              {tf('teamContacts.eventRegistrations', 'Rejestracje na spotkania')}
            </h4>
            {registrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tf('teamContacts.noRegistrations', 'Brak rejestracji na spotkania')}
              </p>
            ) : (
              <ul className="space-y-2">
                {registrations.map((reg) => (
                  <li key={reg.id} className="text-sm border-b pb-2 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{reg.event_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {reg.event_date ? new Date(reg.event_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' }) : '-'}
                        </p>
                      </div>
                      {getStatusBadge(reg.status)}
                    </div>
                    {/* Watch stats */}
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                      {reg.view_stats ? (
                        <>
                          <Eye className="w-3 h-3 text-green-600 shrink-0" />
                          <span className="text-green-700 dark:text-green-400 font-medium">Dołączył</span>
                          <span className="text-muted-foreground">
                            {new Date(reg.view_stats.joined_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' })}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            Oglądał: {formatDuration(reg.view_stats.watch_duration_seconds)}
                          </span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Nie dołączył</span>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};
