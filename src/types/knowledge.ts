export type ResourceType = 'pdf' | 'doc' | 'zip' | 'form' | 'link' | 'page' | 'image';
export type ResourceStatus = 'active' | 'draft' | 'archived';

export interface KnowledgeResource {
  id: string;
  title: string;
  description: string | null;
  context_of_use: string | null;
  resource_type: ResourceType;
  source_type: 'file' | 'link';
  source_url: string | null;
  file_name: string | null;
  file_size: number | null;
  category: string | null;
  tags: string[];
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  visible_to_everyone: boolean;
  status: ResourceStatus;
  version: string | null;
  is_featured: boolean;
  is_new: boolean;
  is_updated: boolean;
  download_count: number;
  work_stage: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  // Action controls
  allow_copy_link: boolean;
  allow_download: boolean;
  allow_share: boolean;
  allow_click_redirect: boolean;
  click_redirect_url: string | null;
  // Language support
  language_code: string | null; // 'pl', 'en', 'de', 'it', 'es', 'fr', 'pt' or null (all languages)
  // Team/leader ownership
  created_by: string | null;
}

// Language configuration for documents
export const LANGUAGE_OPTIONS = [
  { code: 'all', label: '🌐 Wszystkie języki', flag: '🌐' },
  { code: 'pl', label: '🇵🇱 Polski', flag: '🇵🇱' },
  { code: 'en', label: '🇬🇧 English', flag: '🇬🇧' },
  { code: 'de', label: '🇩🇪 Deutsch', flag: '🇩🇪' },
  { code: 'it', label: '🇮🇹 Italiano', flag: '🇮🇹' },
  { code: 'es', label: '🇪🇸 Español', flag: '🇪🇸' },
  { code: 'fr', label: '🇫🇷 Français', flag: '🇫🇷' },
  { code: 'pt', label: '🇵🇹 Português', flag: '🇵🇹' }
] as const;

export const getLanguageLabel = (code: string | null): string => {
  if (!code) return '🌐 Wszystkie';
  const lang = LANGUAGE_OPTIONS.find(l => l.code === code);
  return lang ? `${lang.flag} ${code.toUpperCase()}` : code;
};

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  pdf: 'PDF',
  doc: 'Dokument',
  zip: 'Archiwum (ZIP/RAR)',
  form: 'Formularz',
  link: 'Link zewnętrzny',
  page: 'Strona',
  image: 'Grafika'
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  active: 'Aktywny',
  draft: 'Roboczy',
  archived: 'Archiwalny'
};

// Kategorie dla dokumentów edukacyjnych
export const DOCUMENT_CATEGORIES = [
  'Dokumenty firmowe',
  'Materiały szkoleniowe',
  'Formularze',
  'Instrukcje',
  'Prezentacje',
  'Katalogi produktów',
  'Cenniki',
  'Materiały marketingowe',
  'Inne'
];

// Kategorie dla grafik do udostępniania
export const GRAPHICS_CATEGORIES = [
  'Social media',
  'Tło Zoom',
  'Grafiki produktów EQ',
  'Stories Instagram',
  'Posty Facebook',
  'Banery',
  'Inne grafiki'
];

// Wszystkie kategorie (do zachowania kompatybilności wstecznej)
export const RESOURCE_CATEGORIES = [...DOCUMENT_CATEGORIES, ...GRAPHICS_CATEGORIES];
