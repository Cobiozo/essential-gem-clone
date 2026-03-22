import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TickerItem, TickerSettings } from './types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { isAfter, isBefore } from 'date-fns';
import { isMultiOccurrenceEvent, getNextActiveOccurrence } from '@/hooks/useOccurrences';

interface NewsTickerData {
  items: TickerItem[];
  settings: TickerSettings | null;
  loading: boolean;
}

export const useNewsTickerData = (): NewsTickerData => {
  const { profile, isAdmin, user } = useAuth();
  const [settings, setSettings] = useState<TickerSettings | null>(null);
  const [items, setItems] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  const userRole = profile?.role || 'user';

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('news_ticker_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching ticker settings:', error);
        setSettings(null);
      } else if (data) {
        setSettings({
          isEnabled: data.is_enabled,
          animationMode: data.animation_mode as 'scroll' | 'rotate' | 'static',
          scrollSpeed: data.scroll_speed,
          rotateInterval: data.rotate_interval,
          backgroundColor: data.background_color,
          textColor: data.text_color,
          visibleToClients: data.visible_to_clients,
          visibleToPartners: data.visible_to_partners,
          visibleToSpecjalista: data.visible_to_specjalista,
          sourceWebinars: data.source_webinars,
          sourceTeamMeetings: data.source_team_meetings,
          sourceAnnouncements: data.source_announcements,
          sourceImportantBanners: data.source_important_banners,
          sourceLiveActivity: (data as any).source_live_activity ?? false,
          liveActivityTypes: (data as any).live_activity_types ?? [],
          liveActivityMaxItems: (data as any).live_activity_max_items ?? 5,
          liveActivityHours: (data as any).live_activity_hours ?? 24,
        });
      }
    };

    fetchSettings();
  }, []);

  // Check if user should see ticker based on role
  const isVisibleForRole = useMemo(() => {
    if (!settings) return false;
    if (isAdmin) return true;
    
    switch (userRole) {
      case 'client':
      case 'user':
        return settings.visibleToClients;
      case 'partner':
        return settings.visibleToPartners;
      case 'specjalista':
        return settings.visibleToSpecjalista;
      default:
        return false;
    }
  }, [settings, userRole, isAdmin]);

  // Fetch items from all enabled sources
  useEffect(() => {
    if (!settings || !settings.isEnabled || !isVisibleForRole) {
      setItems([]);
      setLoading(false);
      return;
    }

    const fetchItems = async () => {
      setLoading(true);
      const allItems: TickerItem[] = [];
      const now = new Date();

      // Fetch announcements from news_ticker_items
      if (settings.sourceAnnouncements) {
        const { data: announcements } = await supabase
          .from('news_ticker_items')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false });

        if (announcements) {
          const filteredAnnouncements = announcements.filter(item => {
            // Check date range
            if (item.start_date && isBefore(now, new Date(item.start_date))) return false;
            if (item.end_date && isAfter(now, new Date(item.end_date))) return false;
            
            // Check if targeted to specific user
            if (item.target_user_id) {
              // Only show to that specific user
              return item.target_user_id === user?.id;
            }
            
            // Check role visibility
            if (isAdmin) return true;
            if (userRole === 'client' || userRole === 'user') return item.visible_to_clients;
            if (userRole === 'partner') return item.visible_to_partners;
            if (userRole === 'specjalista') return item.visible_to_specjalista;
            return false;
          });

          filteredAnnouncements.forEach(item => {
            allItems.push({
              id: item.id,
              type: 'announcement',
              icon: item.icon || 'Megaphone',
              content: item.short_description || item.content,
              isImportant: item.is_important,
              linkUrl: item.link_url || undefined,
              thumbnailUrl: item.thumbnail_url || undefined,
              sourceId: item.id,
              priority: item.priority,
              // Enhanced styling
              fontSize: (item.font_size as 'normal' | 'large' | 'xlarge') || 'normal',
              customColor: item.custom_color || undefined,
              effect: (item.effect as 'none' | 'blink' | 'pulse' | 'glow') || 'none',
              iconAnimation: (item.icon_animation as 'none' | 'bounce' | 'spin' | 'shake') || 'none',
              targetUserId: item.target_user_id || undefined,
            });
          });
        }
      }

      // Fetch ALL selected events once (deduplicated query)
      let allSelectedEvents: any[] = [];
      if (settings.sourceWebinars || settings.sourceTeamMeetings) {
        const { data: selected } = await supabase
          .from('news_ticker_selected_events')
          .select('id, is_enabled, custom_label, event_id')
          .eq('is_enabled', true);
        allSelectedEvents = selected || [];
      }

      // Fetch SELECTED webinars
      if (settings.sourceWebinars && allSelectedEvents.length > 0) {
        const eventIds = allSelectedEvents.map(s => s.event_id);
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds)
          .eq('is_active', true)
          .eq('event_type', 'webinar')
          .order('start_time', { ascending: true });

        if (events) {
          const filteredEvents = events.filter(event => {
            if (isAdmin) return true;
            if (userRole === 'client' || userRole === 'user') return event.visible_to_clients;
            if (userRole === 'partner') return event.visible_to_partners;
            if (userRole === 'specjalista') return event.visible_to_specjalista;
            return false;
          });

          filteredEvents.forEach(event => {
            const eventAsAny = event as any;
            let displayDate: Date;

            if (isMultiOccurrenceEvent(eventAsAny)) {
              const nextOcc = getNextActiveOccurrence(eventAsAny);
              if (!nextOcc) return; // all occurrences past
              displayDate = nextOcc.start_datetime;
            } else {
              const endTime = event.end_time ? new Date(event.end_time) : new Date(event.start_time);
              if (endTime < now) return; // past event
              displayDate = new Date(event.start_time);
            }

            const selectedItem = allSelectedEvents.find(s => s.event_id === event.id);
            const formattedDate = format(displayDate, 'd MMM HH:mm', { locale: pl });
            const label = selectedItem?.custom_label || event.title;
            
            allItems.push({
              id: `webinar-${event.id}`,
              type: 'webinar',
              icon: 'Video',
              content: `WEBINAR: ${label} - ${formattedDate}`,
              isImportant: false,
              linkUrl: event.zoom_link || undefined,
              thumbnailUrl: event.image_url || undefined,
              sourceId: event.id,
              priority: 50,
            });
          });
        }
      }

      // Fetch SELECTED team meetings
      if (settings.sourceTeamMeetings && allSelectedEvents.length > 0) {
        const eventIds = allSelectedEvents.map(s => s.event_id);
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds)
          .in('event_type', ['team_training', 'meeting_public'])
          .eq('is_active', true)
          .order('start_time', { ascending: true });

        if (events) {
          const filteredEvents = events.filter(event => {
            if (isAdmin) return true;
            if (userRole === 'client' || userRole === 'user') return event.visible_to_clients;
            if (userRole === 'partner') return event.visible_to_partners;
            if (userRole === 'specjalista') return event.visible_to_specjalista;
            return false;
          });

          filteredEvents.forEach(event => {
            const eventAsAny = event as any;
            let displayDate: Date;

            if (isMultiOccurrenceEvent(eventAsAny)) {
              const nextOcc = getNextActiveOccurrence(eventAsAny);
              if (!nextOcc) return; // all occurrences past
              displayDate = nextOcc.start_datetime;
            } else {
              const endTime = event.end_time ? new Date(event.end_time) : new Date(event.start_time);
              if (endTime < now) return; // past event
              displayDate = new Date(event.start_time);
            }

            const selectedItem = allSelectedEvents.find(s => s.event_id === event.id);
            const formattedDate = format(displayDate, 'd MMM HH:mm', { locale: pl });
            const label = selectedItem?.custom_label || event.title;
            
            allItems.push({
              id: `meeting-${event.id}`,
              type: 'meeting',
              icon: 'Users',
              content: `SPOTKANIE: ${label} - ${formattedDate}`,
              isImportant: false,
              linkUrl: event.zoom_link || undefined,
              thumbnailUrl: event.image_url || undefined,
              sourceId: event.id,
              priority: 40,
            });
          });
        }
      }

      // Fetch live activity from source tables
      if (settings.sourceLiveActivity && settings.liveActivityTypes.length > 0) {
        const hoursAgo = new Date(now.getTime() - settings.liveActivityHours * 60 * 60 * 1000);
        const maxItems = settings.liveActivityMaxItems;

        // Helper to format user name
        const formatName = (p: { first_name?: string | null; last_name?: string | null }) =>
          `${p.first_name || ''} ${(p.last_name || '').charAt(0)}.`.trim() || 'Użytkownik';

        // 1. Lesson completions
        if (settings.liveActivityTypes.includes('training_lesson_complete')) {
          const { data: lessonProgress } = await supabase
            .from('training_progress')
            .select('id, user_id, completed_at, lesson_id')
            .eq('is_completed', true)
            .gte('completed_at', hoursAgo.toISOString())
            .order('completed_at', { ascending: false })
            .limit(maxItems);

          if (lessonProgress && lessonProgress.length > 0) {
            // Fetch lesson+module titles
            const lessonIds = [...new Set(lessonProgress.map(l => l.lesson_id))];
            const { data: lessons } = await supabase
              .from('training_lessons')
              .select('id, title, module_id')
              .in('id', lessonIds);
            const lessonMap = new Map((lessons || []).map(l => [l.id, l]));

            const moduleIds = [...new Set((lessons || []).map(l => l.module_id))];
            const { data: modules } = await supabase
              .from('training_modules')
              .select('id, title')
              .in('id', moduleIds);
            const moduleMap = new Map((modules || []).map(m => [m.id, m]));

            // Fetch profiles
            const userIds = [...new Set(lessonProgress.map(l => l.user_id))];
            const { data: profs } = await supabase
              .from('profiles')
              .select('user_id, first_name, last_name')
              .in('user_id', userIds);
            const profMap = new Map((profs || []).map(p => [p.user_id, p]));

            lessonProgress.forEach(lp => {
              const prof = profMap.get(lp.user_id);
              const lesson = lessonMap.get(lp.lesson_id);
              const mod = lesson ? moduleMap.get(lesson.module_id) : null;
              const timeStr = format(new Date(lp.completed_at!), 'HH:mm dd.MM', { locale: pl });
              const modulePart = mod ? ` w module „${mod.title}"` : '';
              allItems.push({
                id: `activity-lesson-${lp.id}`,
                type: 'activity',
                icon: 'BookOpen',
                content: `${timeStr} — ${formatName(prof || {})} ukończył lekcję${lesson ? ` „${lesson.title}"` : ''}${modulePart}`,
                isImportant: false,
                sourceId: lp.id,
                priority: 30,
              });
            });
          }
        }

        // 2. Module completions
        if (settings.liveActivityTypes.includes('training_module_complete')) {
          const { data: moduleCompletions } = await supabase
            .from('training_assignments')
            .select('id, user_id, completed_at, module_id')
            .eq('is_completed', true)
            .not('completed_at', 'is', null)
            .gte('completed_at', hoursAgo.toISOString())
            .order('completed_at', { ascending: false })
            .limit(maxItems);

          if (moduleCompletions && moduleCompletions.length > 0) {
            const modIds = [...new Set(moduleCompletions.map(m => m.module_id))];
            const { data: mods } = await supabase
              .from('training_modules')
              .select('id, title')
              .in('id', modIds);
            const modMap = new Map((mods || []).map(m => [m.id, m]));

            const userIds = [...new Set(moduleCompletions.map(m => m.user_id))];
            const { data: profs } = await supabase
              .from('profiles')
              .select('user_id, first_name, last_name')
              .in('user_id', userIds);
            const profMap = new Map((profs || []).map(p => [p.user_id, p]));

            moduleCompletions.forEach(mc => {
              const prof = profMap.get(mc.user_id);
              const mod = modMap.get(mc.module_id);
              const timeStr = format(new Date(mc.completed_at!), 'HH:mm dd.MM', { locale: pl });
              allItems.push({
                id: `activity-module-${mc.id}`,
                type: 'activity',
                icon: 'GraduationCap',
                content: `${timeStr} — ${formatName(prof || {})} ukończył moduł${mod ? ` „${mod.title}"` : ''} 🎓`,
                isImportant: false,
                sourceId: mc.id,
                priority: 32,
              });
            });
          }
        }

        // 3. Certificates
        if (settings.liveActivityTypes.includes('certificate_generated')) {
          const { data: certs } = await supabase
            .from('certificates')
            .select('id, user_id, module_id, generated_at, created_at')
            .gte('created_at', hoursAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(maxItems);

          if (certs && certs.length > 0) {
            const modIds = [...new Set(certs.map(c => c.module_id))];
            const { data: mods } = await supabase
              .from('training_modules')
              .select('id, title')
              .in('id', modIds);
            const modMap = new Map((mods || []).map(m => [m.id, m]));

            const userIds = [...new Set(certs.map(c => c.user_id))];
            const { data: profs } = await supabase
              .from('profiles')
              .select('user_id, first_name, last_name')
              .in('user_id', userIds);
            const profMap = new Map((profs || []).map(p => [p.user_id, p]));

            certs.forEach(cert => {
              const prof = profMap.get(cert.user_id);
              const mod = modMap.get(cert.module_id);
              const dateCol = cert.generated_at || cert.created_at;
              const timeStr = format(new Date(dateCol), 'HH:mm dd.MM', { locale: pl });
              allItems.push({
                id: `activity-cert-${cert.id}`,
                type: 'activity',
                icon: 'Award',
                content: `${timeStr} — ${formatName(prof || {})} zdobył certyfikat${mod ? ` „${mod.title}"` : ''}. GRATULUJEMY! 🎉`,
                isImportant: false,
                sourceId: cert.id,
                priority: 33,
              });
            });
          }
        }

        // 4. Event registrations
        if (settings.liveActivityTypes.includes('event_registration')) {
          const { data: regs } = await supabase
            .from('event_registrations')
            .select('id, user_id, event_id, created_at')
            .gte('created_at', hoursAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(maxItems);

          if (regs && regs.length > 0) {
            const eventIds = [...new Set(regs.map(r => r.event_id))];
            const { data: evts } = await supabase
              .from('events')
              .select('id, title')
              .in('id', eventIds);
            const evtMap = new Map((evts || []).map(e => [e.id, e]));

            const userIds = [...new Set(regs.map(r => r.user_id))];
            const { data: profs } = await supabase
              .from('profiles')
              .select('user_id, first_name, last_name')
              .in('user_id', userIds);
            const profMap = new Map((profs || []).map(p => [p.user_id, p]));

            regs.forEach(reg => {
              const prof = profMap.get(reg.user_id);
              const evt = evtMap.get(reg.event_id);
              const timeStr = format(new Date(reg.created_at!), 'HH:mm dd.MM', { locale: pl });
              allItems.push({
                id: `activity-reg-${reg.id}`,
                type: 'activity',
                icon: 'CalendarCheck',
                content: `${timeStr} — ${formatName(prof || {})} zarejestrował się na${evt ? ` „${evt.title}"` : ' wydarzenie'}`,
                isImportant: false,
                sourceId: reg.id,
                priority: 30,
              });
            });
          }
        }

        // 5. New user registrations (unchanged)
        if (settings.liveActivityTypes.includes('new_user_welcome')) {
          const { data: newUsers } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, created_at')
            .gte('created_at', hoursAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(maxItems);

          if (newUsers) {
            newUsers.forEach(u => {
              const timeStr = format(new Date(u.created_at!), 'HH:mm dd.MM', { locale: pl });
              allItems.push({
                id: `activity-newuser-${u.user_id}`,
                type: 'activity',
                icon: 'UserPlus',
                content: `${timeStr} — Witamy ${formatName(u)}, nowego użytkownika Pure Life Center! 🎉`,
                isImportant: false,
                sourceId: u.user_id,
                priority: 35,
              });
            });
          }
        }

        // 6. New partners (unchanged)
        if (settings.liveActivityTypes.includes('new_partner_joined')) {
          const { data: newPartners } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, created_at')
            .eq('role', 'partner')
            .gte('created_at', hoursAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(maxItems);

          if (newPartners) {
            newPartners.forEach(p => {
              const timeStr = format(new Date(p.created_at!), 'HH:mm dd.MM', { locale: pl });
              allItems.push({
                id: `activity-partner-${p.user_id}`,
                type: 'activity',
                icon: 'Handshake',
                content: `${timeStr} — Nowy partner dołączył do zespołu: ${formatName(p)}`,
                isImportant: false,
                sourceId: p.user_id,
                priority: 35,
              });
            });
          }
        }
      }

      // Sort by priority (highest first)
      allItems.sort((a, b) => b.priority - a.priority);
      
      setItems(allItems);
      setLoading(false);
    };

    fetchItems();
  }, [settings, isVisibleForRole, userRole, isAdmin, user?.id]);

  return {
    items,
    settings: isVisibleForRole ? settings : null,
    loading,
  };
};
