import { Database } from '@/integrations/supabase/types';

// Database table types
export type DbEvent = Database['public']['Tables']['events']['Row'];
export type DbEventRegistration = Database['public']['Tables']['event_registrations']['Row'];
export type DbLeaderPermission = Database['public']['Tables']['leader_permissions']['Row'];
export type DbLeaderMeetingTopic = Database['public']['Tables']['leader_meeting_topics']['Row'];
export type DbLeaderAvailability = Database['public']['Tables']['leader_availability']['Row'];
export type DbEventsSettings = Database['public']['Tables']['events_settings']['Row'];
export type DbEventRemindersLog = Database['public']['Tables']['event_reminders_log']['Row'];

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

export interface EventRemindersLog extends DbEventRemindersLog {}

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
  registered_occurrences?: Set<number | null>;
  host_profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  participant_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  // Virtual fields set by expandEventsForCalendar
  _occurrence_index?: number;
  _is_multi_occurrence?: boolean;
}

// Partner with availability for booking interface
export interface PartnerWithAvailability {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  zoom_link: string | null;
  tripartite_meeting_enabled: boolean;
  partner_consultation_enabled: boolean;
  has_availability: boolean;
  // External booking (Calendly) support
  use_external_booking?: boolean;
  external_calendly_url?: string | null;
}

// All possible event types
export type EventType = 
  | 'webinar' 
  | 'meeting_public' 
  | 'meeting_private' 
  | 'team_training'
  | 'tripartite_meeting'
  | 'partner_consultation';

// Webinar form data with new fields
export type WebinarFormData = {
  title: string;
  description: string;
  event_type: 'webinar';
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
  // New webinar-specific fields
  webinar_type: string | null;
  host_name: string | null;
  duration_minutes: number;
  sms_reminder_enabled: boolean;
  email_reminder_enabled: boolean;
  is_published: boolean;
  guest_link: string | null;
  // Internal meeting fields
  use_internal_meeting?: boolean;
  meeting_room_id?: string | null;
  meeting_password?: string | null;
  // Extended fields
  allow_invites?: boolean;
  publish_at?: string | null;
  is_external_platform?: boolean;
  external_platform_message?: string | null;
  registration_form_config?: any;
  // Push reminder fields
  push_reminder_enabled: boolean;
  push_reminder_minutes: number[];
};

// Generic event form data (for team meetings, private meetings)
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
  // Optional webinar fields
  webinar_type?: string | null;
  host_name?: string | null;
  duration_minutes?: number;
  sms_reminder_enabled?: boolean;
  email_reminder_enabled?: boolean;
  is_published?: boolean;
  guest_link?: string | null;
  // Internal meeting fields
  use_internal_meeting?: boolean;
  meeting_room_id?: string | null;
  meeting_password?: string | null;
  // Extended fields
  allow_invites?: boolean;
  publish_at?: string | null;
};

// Webinar type options
export const WEBINAR_TYPES = [
  { value: 'biznesowy', label: 'Biznesowy' },
  { value: 'produktowy', label: 'Produktowy' },
  { value: 'motywacyjny', label: 'Motywacyjny' },
  { value: 'szkoleniowy', label: 'Szkoleniowy' },
] as const;

// Team Training type options
export const TEAM_TRAINING_TYPES = [
  { value: 'wewnetrzny', label: 'Wewnętrzny' },
  { value: 'zewnetrzny', label: 'Zewnętrzny' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'produktowy', label: 'Produktowy' },
  { value: 'biznesowy', label: 'Biznesowy' },
] as const;

// Duration options in minutes
export const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '120 min' },
] as const;

// Team Training form data
export type TeamTrainingFormData = {
  title: string;
  description: string;
  event_type: 'team_training';
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
  training_type: string | null;
  host_name: string | null;
  duration_minutes: number;
  sms_reminder_enabled: boolean;
  email_reminder_enabled: boolean;
  is_published: boolean;
  // Internal meeting fields
  use_internal_meeting?: boolean;
  meeting_room_id?: string | null;
  meeting_password?: string | null;
  // Extended fields
  allow_invites?: boolean;
  publish_at?: string | null;
};
