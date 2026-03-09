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
  created_at: string;
  updated_at: string;
}
