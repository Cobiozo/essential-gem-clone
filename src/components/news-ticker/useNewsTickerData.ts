import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TickerItem, TickerSettings } from './types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { isAfter, isBefore } from 'date-fns';

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
          .eq('is_active', true)
          .eq('event_type', 'team_training')
          .gte('start_time', now.toISOString())
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
            const selectedItem = allSelectedEvents.find(s => s.event_id === event.id);
            const eventDate = new Date(event.start_time);
            const formattedDate = format(eventDate, 'd MMM HH:mm', { locale: pl });
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

      // Fetch live activity
      if (settings.sourceLiveActivity && settings.liveActivityTypes.length > 0) {
        const hoursAgo = new Date(now.getTime() - settings.liveActivityHours * 60 * 60 * 1000);
        
        // Map ticker activity types to user_activity_log action_types
        const activityTypeMap: Record<string, string> = {
          'training_module_complete': 'training_lesson_complete',
          'training_lesson_complete': 'training_lesson_complete',
          'certificate_generated': 'certificate_download',
          'event_registration': 'meeting_join',
          'profile_update': 'profile_update',
          'file_upload': 'file_upload',
        };

        // Fetch from user_activity_log
        const logTypes = settings.liveActivityTypes
          .map(t => activityTypeMap[t])
          .filter(Boolean);

        if (logTypes.length > 0) {
          const { data: activityLogs } = await supabase
            .from('user_activity_log' as any)
            .select('id, user_id, action_type, action_data, created_at')
            .in('action_type', logTypes)
            .gte('created_at', hoursAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(settings.liveActivityMaxItems);

          if (activityLogs && (activityLogs as any[]).length > 0) {
            // Fetch profiles for user names
            const userIds = [...new Set((activityLogs as any[]).map((l: any) => l.user_id))];
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, first_name, last_name')
              .in('user_id', userIds);

            const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

            (activityLogs as any[]).forEach((log: any) => {
              const profile = profileMap.get(log.user_id);
              const userName = profile 
                ? `${profile.first_name || ''} ${(profile.last_name || '').charAt(0)}.`.trim()
                : 'Użytkownik';
              const logDate = new Date(log.created_at);
              const timeStr = format(logDate, 'HH:mm dd.MM.yyyy', { locale: pl });
              const actionData = log.action_data || {};

              let content = '';
              let icon = 'Activity';

              switch (log.action_type) {
                case 'training_lesson_complete':
                  content = `${timeStr} — ${userName} ukończył lekcję${actionData.module_title ? ` w module „${actionData.module_title}"` : ''}`;
                  icon = 'BookOpen';
                  break;
                case 'certificate_download':
                  content = `${timeStr} — ${userName} wygenerował certyfikat ukończenia. GRATULUJEMY! 🎉`;
                  icon = 'Award';
                  break;
                case 'meeting_join':
                  content = `${timeStr} — ${userName} zarejestrowała się na wydarzenie${actionData.event_title ? ` „${actionData.event_title}"` : ''}`;
                  icon = 'CalendarCheck';
                  break;
                case 'profile_update':
                  content = `${timeStr} — ${userName} zaktualizował swój profil`;
                  icon = 'UserCog';
                  break;
                case 'file_upload':
                  content = `${timeStr} — ${userName} przesłał nowy plik`;
                  icon = 'Upload';
                  break;
                default:
                  content = `${timeStr} — ${userName} wykonał akcję w systemie`;
              }

              allItems.push({
                id: `activity-${log.id}`,
                type: 'activity',
                icon,
                content,
                isImportant: false,
                sourceId: log.id,
                priority: 30,
              });
            });
          }
        }

        // Fetch new user registrations
        if (settings.liveActivityTypes.includes('new_user_welcome')) {
          const { data: newUsers } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, created_at')
            .gte('created_at', hoursAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(settings.liveActivityMaxItems);

          if (newUsers) {
            newUsers.forEach(u => {
              const regDate = new Date(u.created_at!);
              const timeStr = format(regDate, 'HH:mm dd.MM.yyyy', { locale: pl });
              const name = `${u.first_name || ''} ${(u.last_name || '').charAt(0)}.`.trim();
              allItems.push({
                id: `activity-newuser-${u.user_id}`,
                type: 'activity',
                icon: 'UserPlus',
                content: `${timeStr} — Witamy ${name}, nowego użytkownika Pure Life Center! 🎉`,
                isImportant: false,
                sourceId: u.user_id,
                priority: 35,
              });
            });
          }
        }

        // Fetch new partners
        if (settings.liveActivityTypes.includes('new_partner_joined')) {
          const { data: newPartners } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, created_at')
            .eq('role', 'partner')
            .gte('created_at', hoursAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(settings.liveActivityMaxItems);

          if (newPartners) {
            newPartners.forEach(p => {
              const regDate = new Date(p.created_at!);
              const timeStr = format(regDate, 'HH:mm dd.MM.yyyy', { locale: pl });
              const name = `${p.first_name || ''} ${(p.last_name || '').charAt(0)}.`.trim();
              allItems.push({
                id: `activity-partner-${p.user_id}`,
                type: 'activity',
                icon: 'Handshake',
                content: `${timeStr} — Nowy partner dołączył do zespołu: ${name}`,
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
