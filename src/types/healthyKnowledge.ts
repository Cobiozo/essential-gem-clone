// Types for the "Zdrowa Wiedza" (Healthy Knowledge) module

export type ContentType = 'video' | 'audio' | 'document' | 'image' | 'text';

export interface HealthyKnowledge {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  content_type: ContentType;
  media_url: string | null;
  thumbnail_url: string | null;
  text_content: string | null;
  file_name: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_client: boolean;
  visible_to_specjalista: boolean;
  visible_to_everyone: boolean;
  allow_external_share: boolean;
  otp_validity_hours: number;
  otp_max_sessions: number;
  share_message_template: string | null;
  category: string | null;
  tags: string[];
  position: number;
  is_active: boolean;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface HkOtpCode {
  id: string;
  knowledge_id: string;
  partner_id: string;
  code: string;
  expires_at: string;
  is_invalidated: boolean;
  used_sessions: number;
  recipient_name: string | null;
  recipient_email: string | null;
  created_at: string;
  // First use tracking - timer starts from this moment
  first_used_at: string | null;
  // Soft-delete for user
  is_deleted_by_user: boolean;
  deleted_by_user_at: string | null;
  // Relations - partial for queries
  healthy_knowledge?: Partial<HealthyKnowledge> & { id: string; title: string; slug: string; otp_validity_hours?: number };
  partner?: { first_name: string; last_name: string; email: string; role?: string };
  // Computed for widget
  first_session_expires_at?: string | null;
}

export interface HkOtpSession {
  id: string;
  otp_code_id: string;
  session_token: string;
  device_fingerprint: string | null;
  expires_at: string;
  created_at: string;
  last_activity_at: string;
}

export const HEALTHY_KNOWLEDGE_CATEGORIES = [
  'Zdrowie ogólne',
  'Suplementacja',
  'Odżywianie',
  'Aktywność fizyczna',
  'Wellbeing',
  'Produkty EQ',
  'Webinary archiwalne',
  'Materiały eksperckie',
  'Inne'
] as const;

export type HealthyKnowledgeCategory = typeof HEALTHY_KNOWLEDGE_CATEGORIES[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  video: 'Wideo',
  audio: 'Audio',
  document: 'Dokument',
  image: 'Obraz',
  text: 'Tekst'
};

export const DEFAULT_SHARE_MESSAGE_TEMPLATE = `Cześć!

Mam dla Ciebie ciekawy materiał: "{title}"

{description}

Wejdź na link poniżej i użyj kodu dostępu:

🔗 Link: {share_url}
🔑 Kod dostępu: {otp_code}

⏰ Kod ważny przez {validity_hours} godzin.

Pozdrawiam,
{partner_name}`;
