export interface ContentCell {
  id?: string;
  type: 'header' | 'description' | 'list_item' | 'button_functional' | 'button_anchor' | 'button_external' | 'section' | 'text' | 'image' | 'video' | 'gallery' | 'carousel' | 'icon' | 'spacer' | 'divider';
  content: string;
  url?: string;
  position: number;
  is_active: boolean;
  formatting?: any;
  // For nested sections
  section_items?: CMSItem[];
  section_title?: string;
  section_description?: string;
  // For media cells
  media_url?: string;
  media_alt?: string;
  // For gallery/carousel
  items?: Array<{ url: string; alt?: string; caption?: string }>;
  // For spacer
  height?: number;
  // Alignment
  alignment?: 'left' | 'center' | 'right' | 'full';
  // Gallery/Carousel settings
  columns?: number;
  gap?: number;
  aspectRatio?: string;
  lightbox?: boolean;
  // Image settings
  object_fit?: string;
  max_width?: number;
  max_height?: number;
  // Styling for cells
  border_radius?: number;
  box_shadow?: string;
  border_width?: number;
  border_color?: string;
  border_style?: string;
  hover_scale?: number;
  hover_opacity?: number;
  lazy_loading?: boolean;
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
  cells?: ContentCell[];
  created_at?: string;
  updated_at?: string;
  section_id?: string;
  is_active?: boolean;
  background_color?: string;
  text_color?: string;
  font_size?: number;
  font_weight?: number;
  border_radius?: number;
  padding?: number;
  margin_top?: number;
  margin_bottom?: number;
  opacity?: number;
  style_class?: string;
  icon?: string | null;
  icon_position?: string;
  icon_size?: number;
  icon_color?: string;
  icon_spacing?: number;
  text_align?: string;
  // Manual numbering for multi_cell
  show_number?: boolean;
  number_type?: 'auto' | 'text' | 'image' | 'icon';
  custom_number?: string;
  custom_number_image?: string;
  // Image styling properties
  object_fit?: string;
  max_width?: number | null;
  max_height?: number | null;
  box_shadow?: string;
  border_width?: number;
  border_color?: string;
  border_style?: string;
  link_target?: string;
  lazy_loading?: boolean;
  hover_scale?: number;
  hover_opacity?: number;
  // Visibility fields
  visible_to_everyone?: boolean;
  visible_to_clients?: boolean;
  visible_to_partners?: boolean;
  visible_to_specjalista?: boolean;
  visible_to_anonymous?: boolean;
}

export interface CMSSection {
  id: string;
  title: string | null;
  description?: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  page_id?: string;
  parent_id?: string; // Pole dla sekcji zagnieżdżonych
  visible_to_everyone: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  visible_to_anonymous: boolean;
  // Row container fields
  section_type?: 'section' | 'row';
  row_column_count?: number;
  row_layout_type?: 'equal' | 'custom';
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
  default_expanded?: boolean;
  show_title?: boolean;
  collapsible_header?: string;
}