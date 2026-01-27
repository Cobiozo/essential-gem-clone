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

      // Fetch SELECTED webinars from news_ticker_selected_events (instead of all)
      if (settings.sourceWebinars) {
        const { data: selectedWebinars } = await supabase
          .from('news_ticker_selected_events')
          .select(`
            id,
            is_enabled,
            custom_label,
            event_id
          `)
          .eq('is_enabled', true);

        if (selectedWebinars && selectedWebinars.length > 0) {
          // Fetch the actual events
          const eventIds = selectedWebinars.map(s => s.event_id);
          const { data: events } = await supabase
            .from('events')
            .select('*')
            .in('id', eventIds)
            .eq('is_active', true)
            .eq('event_type', 'webinar')
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
              const selectedItem = selectedWebinars.find(s => s.event_id === event.id);
              const eventDate = new Date(event.start_time);
              const formattedDate = format(eventDate, 'd MMM HH:mm', { locale: pl });
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
      }

      // Fetch SELECTED team meetings from news_ticker_selected_events
      if (settings.sourceTeamMeetings) {
        const { data: selectedMeetings } = await supabase
          .from('news_ticker_selected_events')
          .select(`
            id,
            is_enabled,
            custom_label,
            event_id
          `)
          .eq('is_enabled', true);

        if (selectedMeetings && selectedMeetings.length > 0) {
          const eventIds = selectedMeetings.map(s => s.event_id);
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
              const selectedItem = selectedMeetings.find(s => s.event_id === event.id);
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
