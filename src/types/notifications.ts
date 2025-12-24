export interface NotificationEventType {
  id: string;
  event_key: string;
  name: string;
  description: string | null;
  source_module: string;
  icon_name: string;
  color: string;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  email_template_id: string | null;
  send_email: boolean;
}

export interface NotificationRoleRoute {
  id: string;
  event_type_id: string;
  source_role: string;
  target_role: string;
  is_enabled: boolean;
  created_at: string;
}

export interface NotificationLimit {
  id: string;
  event_type_id: string;
  max_per_hour: number;
  max_per_day: number;
  cooldown_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationEvent {
  id: string;
  event_type_id: string | null;
  event_key: string;
  sender_id: string;
  sender_role: string | null;
  payload: Record<string, any>;
  related_entity_type: string | null;
  related_entity_id: string | null;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
}

export interface UserNotificationPreference {
  id: string;
  user_id: string;
  event_type_id: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationDeliveryLog {
  id: string;
  event_id: string;
  user_id: string;
  event_type_id: string | null;
  delivered_at: string;
}

export interface EmitEventParams {
  eventKey: string;
  payload?: Record<string, any>;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export const EVENT_KEYS = {
  CONTACT_ADDED: 'contact_added',
  CONTACT_REMINDER: 'contact_reminder',
  REFLINK_SHARED: 'reflink_shared',
  RESOURCE_NEW: 'resource_new',
  RESOURCE_UPDATED: 'resource_updated',
  BANNER_NEW: 'banner_new',
  TRAINING_ASSIGNED: 'training_assigned',
  TRAINING_COMPLETED: 'training_completed',
  // Auth events
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGED: 'password_changed',
  FIRST_LOGIN: 'first_login',
  ACCOUNT_APPROVED: 'account_approved',
  USER_REGISTRATION: 'user_registration',
  PASSWORD_RESET_ADMIN: 'password_reset_admin',
  SPECIALIST_MESSAGE: 'specialist_message',
} as const;

export const MODULE_NAMES: Record<string, string> = {
  team_contacts: 'Kontakty',
  reflinks: 'Reflinki',
  knowledge: 'Baza wiedzy',
  banners: 'Banery',
  training: 'Szkolenia',
};

export const ROLE_NAMES: Record<string, string> = {
  admin: 'Administrator',
  partner: 'Partner',
  specjalista: 'Specjalista',
  client: 'Klient',
  user: 'Użytkownik',
};
