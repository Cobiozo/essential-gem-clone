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
