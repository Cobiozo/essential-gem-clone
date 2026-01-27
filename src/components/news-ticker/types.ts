export interface TickerItem {
  id: string;
  type: 'webinar' | 'meeting' | 'announcement' | 'banner';
  icon: string;
  content: string;
  isImportant: boolean;
  linkUrl?: string;
  thumbnailUrl?: string;
  sourceId: string;
  priority: number;
  // Enhanced styling fields
  fontSize?: 'normal' | 'large' | 'xlarge';
  customColor?: string;
  effect?: 'none' | 'blink' | 'pulse' | 'glow';
  iconAnimation?: 'none' | 'bounce' | 'spin' | 'shake';
  targetUserId?: string;
}

export interface TickerSettings {
  isEnabled: boolean;
  animationMode: 'scroll' | 'rotate' | 'static';
  scrollSpeed: number;
  rotateInterval: number;
  backgroundColor?: string | null;
  textColor?: string | null;
  visibleToClients: boolean;
  visibleToPartners: boolean;
  visibleToSpecjalista: boolean;
  sourceWebinars: boolean;
  sourceTeamMeetings: boolean;
  sourceAnnouncements: boolean;
  sourceImportantBanners: boolean;
}

export interface SelectedEvent {
  id: string;
  event_id: string;
  is_enabled: boolean;
  custom_label?: string | null;
  event?: {
    id: string;
    title: string;
    event_type: string;
    start_time: string;
    zoom_link?: string | null;
    image_url?: string | null;
    visible_to_clients: boolean;
    visible_to_partners: boolean;
    visible_to_specjalista: boolean;
  };
}
