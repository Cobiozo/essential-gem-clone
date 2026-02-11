export interface TemplateElement {
  id: string;
  type: 'static' | 'editable_text' | 'editable_image' | 'product_slot';
  label?: string;
  content?: string; // HTML content for static elements
  placeholder?: string;
  max_length?: number;
  position: number;
  style?: Record<string, any>;
  display?: 'accordion' | 'default';
  title?: string;
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
  template_data: TemplateElement[];
  updated_at: string;
}

export interface PartnerPage {
  id: string;
  user_id: string;
  alias: string | null;
  is_active: boolean;
  custom_data: Record<string, any>;
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
