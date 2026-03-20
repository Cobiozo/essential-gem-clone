export type TemplateElementType =
  | 'static'
  | 'editable_text'
  | 'editable_image'
  | 'product_slot'
  | 'hero'
  | 'text_image'
  | 'steps'
  | 'timeline'
  | 'testimonials'
  | 'products_grid'
  | 'faq'
  | 'cta_banner'
  | 'header'
  | 'contact_form'
  | 'footer'
  | 'products_with_form'
  | 'survey';

export interface TemplateElement {
  id: string;
  type: TemplateElementType;
  label?: string;
  title?: string;
  content?: string;
  placeholder?: string;
  max_length?: number;
  position: number;
  style?: Record<string, any>;
  config?: Record<string, any>;
}

export interface PartnerPageSettings {
  id: string;
  is_system_active: boolean;
  enabled_for_partner: boolean;
  enabled_for_specjalista: boolean;
  enabled_for_client: boolean;
  enabled_for_admin: boolean;
}

export interface PartnerPageUserAccess {
  id: string;
  user_id: string;
  is_enabled: boolean;
  granted_by: string | null;
  created_at: string;
}

export interface PartnerPageTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  position: number;
  template_data: TemplateElement[];
  updated_at: string;
}

export interface PartnerPage {
  id: string;
  user_id: string;
  alias: string | null;
  is_active: boolean;
  custom_data: Record<string, any>;
  selected_template_id: string | null;
  template_changed_at: string | null;
  template_history: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ProductCatalogItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerProductLink {
  id: string;
  partner_page_id: string;
  product_id: string;
  purchase_url: string;
  position: number;
  is_active: boolean;
  created_at: string;
}

export const RESERVED_ALIASES = [
  'auth', 'admin', 'dashboard', 'my-account', 'training', 'knowledge',
  'page', 'html', 'events', 'infolink', 'zdrowa-wiedza', 'calculator',
  'messages', 'paid-events', 'install', 'api', 'static', 'public',
];
