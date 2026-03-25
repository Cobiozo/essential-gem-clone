export interface AutoWebinarVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_seconds: number;
  thumbnail_url: string | null;
  sort_order: number;
  is_active: boolean;
  uploaded_by: string | null;
  host_name: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutoWebinarConfig {
  id: string;
  is_enabled: boolean;
  playlist_mode: 'sequential' | 'random';
  start_hour: number;
  end_hour: number;
  interval_minutes: number;
  event_id: string | null;
  chat_enabled: boolean;
  show_participant_count: boolean;
  welcome_message: string | null;
  // Room customization
  room_title: string | null;
  room_subtitle: string | null;
  room_background_color: string | null;
  room_show_live_badge: boolean;
  room_show_schedule_info: boolean;
  room_logo_url: string | null;
  // Invitation customization
  invitation_title: string | null;
  invitation_description: string | null;
  invitation_image_url: string | null;
  room_custom_section_title: string | null;
  room_custom_section_content: string | null;
  countdown_label: string | null;
  late_join_max_seconds: number | null;
  // Role visibility
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  visible_to_clients: boolean;
  show_in_calendar: boolean;
  // Fake participants
  fake_participants_enabled: boolean;
  fake_participants_min: number;
  fake_participants_max: number;
  // Fake chat
  fake_chat_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutoWebinarFakeMessage {
  id: string;
  config_id: string | null;
  appear_at_minute: number;
  author_name: string;
  content: string;
  sort_order: number;
  created_at: string;
}
