export interface ContentCell {
  id?: string;
  type: 'header' | 'description' | 'list_item' | 'button_functional' | 'button_anchor' | 'button_external' | 'section';
  content: string;
  url?: string;
  position: number;
  is_active: boolean;
  formatting?: any;
  // Separate formatting for different text elements
  title_formatting?: any;
  description_formatting?: any;
  // Extended typography
  font_family?: string;
  line_height?: number;
  letter_spacing?: number;
  text_transform?: string;
  text_align?: string;
  font_style?: string;
  text_decoration?: string;
  // For nested sections
  section_items?: CMSItem[];
  section_title?: string;
  section_description?: string;
}

export interface CMSItem {
  id?: string;
  type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  position: number;
  media_url?: string | null;
  media_type?: string | null;
  media_alt_text?: string | null;
  text_formatting?: any;
  title_formatting?: any;
  description_formatting?: any;
  cells?: ContentCell[];
  created_at?: string;
  updated_at?: string;
  section_id?: string;
  is_active?: boolean;
  background_color?: string;
  text_color?: string;
  font_size?: number;
  font_weight?: string;
  border_radius?: number;
  padding?: number;
  style_class?: string;
  icon?: string | null;
  // Extended typography
  font_family?: string;
  line_height?: number;
  letter_spacing?: number;
  text_transform?: string;
  text_align?: string;
  font_style?: string;
  text_decoration?: string;
}

export interface CMSSection {
  id: string;
  title: string;
  description?: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  page_id?: string;
  visible_to_everyone: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  // Styling properties
  background_color?: string;
  text_color?: string;
  font_size?: number;
  alignment?: string;
  padding?: number;
  margin?: number;
  border_radius?: number;
  style_class?: string;
  background_gradient?: string;
  border_width?: number;
  border_color?: string;
  border_style?: string;
  box_shadow?: string;
  opacity?: number;
  width_type?: string;
  custom_width?: number;
  height_type?: string;
  custom_height?: number;
  max_width?: number;
  font_weight?: number;
  line_height?: number;
  letter_spacing?: number;
  text_transform?: string;
  display_type?: string;
  justify_content?: string;
  align_items?: string;
  gap?: number;
  section_margin_top?: number;
  section_margin_bottom?: number;
  background_image?: string;
  background_image_opacity?: number;
  background_image_position?: string;
  background_image_size?: string;
  icon_name?: string;
  icon_position?: string;
  icon_size?: number;
  icon_color?: string;
  show_icon?: boolean;
  min_height?: number;
  hover_opacity?: number;
  hover_scale?: number;
  hover_transition_duration?: number;
  hover_background_color?: string;
  hover_background_gradient?: string;
  hover_text_color?: string;
  hover_border_color?: string;
  hover_box_shadow?: string;
  content_direction?: string;
  width_type_?: string;
  content_wrap?: string;
  height_type_?: string;
  overflow_behavior?: string;
  // Separate typography formatting
  title_formatting?: any;
  description_formatting?: any;
  font_family?: string;
  font_style?: string;
  text_decoration?: string;
}