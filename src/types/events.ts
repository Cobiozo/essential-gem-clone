import { Database } from '@/integrations/supabase/types';

// Database table types
export type DbEvent = Database['public']['Tables']['events']['Row'];
export type DbEventRegistration = Database['public']['Tables']['event_registrations']['Row'];
export type DbLeaderPermission = Database['public']['Tables']['leader_permissions']['Row'];
export type DbLeaderMeetingTopic = Database['public']['Tables']['leader_meeting_topics']['Row'];
export type DbLeaderAvailability = Database['public']['Tables']['leader_availability']['Row'];
export type DbEventsSettings = Database['public']['Tables']['events_settings']['Row'];

// Frontend event type with parsed buttons
export interface Event extends Omit<DbEvent, 'buttons'> {
  buttons: EventButton[];
}

export interface EventButton {
  label: string;
  url: string;
  style?: 'primary' | 'secondary' | 'outline';
}

export interface EventRegistration extends DbEventRegistration {}

export interface LeaderPermission extends DbLeaderPermission {}

export interface MeetingTopic extends DbLeaderMeetingTopic {}

export interface LeaderAvailability extends DbLeaderAvailability {}

export interface EventsSettings extends DbEventsSettings {}

export interface LeaderWithProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  zoom_link: string | null;
  can_host_private_meetings: boolean;
}

// Full leader permission with profile data for admin
export interface AdminLeaderWithProfile extends LeaderPermission {
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

export interface TopicWithLeader extends MeetingTopic {
  leader?: {
    first_name: string | null;
    last_name: string | null;
  };
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
  event_type: string;
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
