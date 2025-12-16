export type ResourceType = 'pdf' | 'doc' | 'zip' | 'form' | 'link' | 'page';
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
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  pdf: 'PDF',
  doc: 'Dokument',
  zip: 'Archiwum (ZIP/RAR)',
  form: 'Formularz',
  link: 'Link zewnętrzny',
  page: 'Strona'
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  active: 'Aktywny',
  draft: 'Roboczy',
  archived: 'Archiwalny'
};

export const RESOURCE_CATEGORIES = [
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
