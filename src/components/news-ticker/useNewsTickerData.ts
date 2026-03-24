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

      // Fetch live activity via RPC (SECURITY DEFINER — bypasses RLS)
      if (settings.sourceLiveActivity && settings.liveActivityTypes.length > 0) {
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('get_ticker_live_activity', {
            p_types: settings.liveActivityTypes,
            p_hours: settings.liveActivityHours,
            p_max_items: settings.liveActivityMaxItems,
          });

        if (!rpcError && rpcResult) {
          const parsed = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult;
          const activityItems = (parsed?.items || []) as Array<{
            id: string; type: string; icon: string; content: string;
            isImportant: boolean; sourceId: string; priority: number;
          }>;
          activityItems.forEach(item => {
            allItems.push({
              id: item.id,
              type: 'activity',
              icon: item.icon,
              content: item.content,
              isImportant: item.isImportant ?? false,
              sourceId: item.sourceId,
              priority: item.priority,
            });
          });
        } else if (rpcError) {
          console.error('Error fetching ticker live activity:', rpcError);
        }
      }

      // Filter out empty content and sort by priority (highest first)
      const validItems = allItems.filter(item => item.content && item.content.trim().length > 0);
      validItems.sort((a, b) => b.priority - a.priority);
      
      setItems(validItems);
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
