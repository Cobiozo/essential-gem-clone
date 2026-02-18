export interface LessonActionButton {
  id: string;
  label: string;
  type: 'internal' | 'external' | 'resource' | 'file';
  url?: string;
  resource_id?: string;
  file_url?: string;
  file_name?: string;
  icon?: string;
  open_in_new_tab?: boolean;
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  position: number;
  is_active: boolean;
  visible_to_everyone: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  visible_to_anonymous: boolean;
  resource_ids?: string[];
  language_code?: string | null;
  created_at: string;
}

export interface TrainingLesson {
  id: string;
  module_id: string;
  title: string;
  content: string;
  media_url: string;
  media_type: string;
  media_alt_text: string;
  position: number;
  min_time_seconds: number;
  is_required: boolean;
  is_active: boolean;
  language_code?: string | null;
  action_buttons?: LessonActionButton[];
}

export interface LinkedResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  source_url: string | null;
}
