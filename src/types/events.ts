export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: 'webinar' | 'meeting_public' | 'meeting_private';
  start_time: string;
  end_time: string;
  timezone: string;
  zoom_link: string | null;
  location: string | null;
  visible_to_everyone: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  visible_to_clients: boolean;
  created_by: string;
  host_user_id: string | null;
  image_url: string | null;
  buttons: EventButton[];
  max_participants: number | null;
  is_active: boolean;
  requires_registration: boolean;
  meeting_topic_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventButton {
  label: string;
  url: string;
  style?: 'primary' | 'secondary' | 'outline';
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: 'registered' | 'cancelled';
  registered_at: string;
  cancelled_at: string | null;
  reminder_sent: boolean;
}

export interface LeaderPermission {
  id: string;
  user_id: string;
  can_host_private_meetings: boolean;
  zoom_link: string | null;
  created_at: string;
  updated_at: string;
  activated_by: string | null;
  activated_at: string | null;
}

export interface LeaderMeetingTopic {
  id: string;
  leader_user_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface LeaderAvailability {
  id: string;
  leader_user_id: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  max_bookings_per_slot: number;
  is_active: boolean;
  created_at: string;
}

export interface EventsSettings {
  id: string;
  is_enabled: boolean;
  reminder_hours_before: number;
  send_email_reminders: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaderWithProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  zoom_link: string | null;
  can_host_private_meetings: boolean;
}

export interface AvailableSlot {
  date: string;
  time: string;
  datetime: string;
}

export interface EventWithRegistration extends Event {
  is_registered?: boolean;
  registration_count?: number;
}

export type EventFormData = {
  title: string;
  description: string;
  event_type: 'webinar' | 'meeting_public' | 'meeting_private';
  start_time: string;
  end_time: string;
  zoom_link: string;
  location: string;
  visible_to_everyone: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  visible_to_clients: boolean;
  image_url: string;
  buttons: EventButton[];
  max_participants: number | null;
  requires_registration: boolean;
};
