export interface CookieConsentSettings {
  id: string;
  is_active: boolean;
  consent_template: 'gdpr' | 'us_laws' | 'combined';
  geo_targeting_enabled: boolean;
  geo_countries: string[];
  consent_expiration_days: number;
  reload_on_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface CookieBannerColors {
  background: string;
  border: string;
  title: string;
  text: string;
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;
  toggleOn: string;
  toggleOff: string;
  link: string;
}

export interface CookieBannerSettings {
  id: string;
  layout_type: 'box' | 'banner' | 'popup';
  position: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right' | 'top' | 'bottom' | 'center';
  preference_center_type: 'center' | 'sidebar' | 'pushdown';
  title: string;
  message: string;
  privacy_policy_url: string | null;
  show_close_button: boolean;
  show_accept_all: boolean;
  show_reject_all: boolean;
  show_customize: boolean;
  accept_all_text: string;
  reject_all_text: string;
  customize_text: string;
  read_more_text: string;
  save_preferences_text: string;
  categories_on_first_layer: boolean;
  custom_logo_url: string | null;
  show_branding: boolean;
  revisit_button_enabled: boolean;
  revisit_button_position: 'bottom-left' | 'bottom-center' | 'bottom-right';
  revisit_button_text: string;
  theme: 'light' | 'dark' | 'auto' | 'custom';
  colors: CookieBannerColors;
  custom_css: string | null;
  created_at: string;
  updated_at: string;
}

export interface CookieCategory {
  id: string;
  name: string;
  description: string | null;
  is_necessary: boolean;
  is_enabled: boolean;
  load_before_consent: boolean;
  is_hidden: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface UserCookieConsent {
  id: string;
  visitor_id: string;
  ip_address_hash: string | null;
  consents: Record<string, boolean>;
  consent_given_at: string;
  expires_at: string | null;
  user_agent: string | null;
  created_at: string;
}

export const LAYOUT_TYPES = [
  { value: 'box', label: 'Box (mały)' },
  { value: 'banner', label: 'Banner (pełna szerokość)' },
  { value: 'popup', label: 'Popup (centrum)' },
] as const;

export const POSITIONS = [
  { value: 'bottom-left', label: 'Dół-lewo' },
  { value: 'bottom-center', label: 'Dół-środek' },
  { value: 'bottom-right', label: 'Dół-prawo' },
  { value: 'top-left', label: 'Góra-lewo' },
  { value: 'top-center', label: 'Góra-środek' },
  { value: 'top-right', label: 'Góra-prawo' },
  { value: 'top', label: 'Góra (pełna)' },
  { value: 'bottom', label: 'Dół (pełna)' },
  { value: 'center', label: 'Centrum' },
] as const;

export const REVISIT_BUTTON_POSITIONS = [
  { value: 'bottom-left', label: 'Dół-lewo' },
  { value: 'bottom-center', label: 'Dół-środek' },
  { value: 'bottom-right', label: 'Dół-prawo' },
] as const;

export const PREFERENCE_CENTER_TYPES = [
  { value: 'center', label: 'Centrum' },
  { value: 'sidebar', label: 'Panel boczny' },
  { value: 'pushdown', label: 'Rozwijany' },
] as const;

export const THEMES = [
  { value: 'light', label: 'Jasny' },
  { value: 'dark', label: 'Ciemny' },
  { value: 'auto', label: 'Automatyczny' },
  { value: 'custom', label: 'Własny' },
] as const;

export const CONSENT_TEMPLATES = [
  { value: 'gdpr', label: 'GDPR (UE)' },
  { value: 'us_laws', label: 'US Laws (CCPA)' },
  { value: 'combined', label: 'Połączony' },
] as const;

export const DEFAULT_COLORS: CookieBannerColors = {
  background: '#ffffff',
  border: '#e5e7eb',
  title: '#1f2937',
  text: '#4b5563',
  buttonPrimaryBg: '#10b981',
  buttonPrimaryText: '#ffffff',
  buttonSecondaryBg: '#f3f4f6',
  buttonSecondaryText: '#374151',
  toggleOn: '#10b981',
  toggleOff: '#d1d5db',
  link: '#10b981',
};

export const DARK_COLORS: CookieBannerColors = {
  background: '#1f2937',
  border: '#374151',
  title: '#f9fafb',
  text: '#d1d5db',
  buttonPrimaryBg: '#10b981',
  buttonPrimaryText: '#ffffff',
  buttonSecondaryBg: '#374151',
  buttonSecondaryText: '#f9fafb',
  toggleOn: '#10b981',
  toggleOff: '#4b5563',
  link: '#34d399',
};
