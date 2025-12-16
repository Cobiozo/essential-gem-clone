export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_compass_contact_stages: {
        Row: {
          contact_type_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          position: number
        }
        Insert: {
          contact_type_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
        }
        Update: {
          contact_type_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_compass_contact_stages_contact_type_id_fkey"
            columns: ["contact_type_id"]
            isOneToOne: false
            referencedRelation: "ai_compass_contact_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_compass_contact_types: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_compass_learning_patterns: {
        Row: {
          contact_type_id: string | null
          context_keywords: string[] | null
          created_at: string
          id: string
          last_updated: string
          optimal_timing_days: number | null
          pattern_type: string
          sample_count: number
          stage_id: string | null
          success_rate: number | null
        }
        Insert: {
          contact_type_id?: string | null
          context_keywords?: string[] | null
          created_at?: string
          id?: string
          last_updated?: string
          optimal_timing_days?: number | null
          pattern_type: string
          sample_count?: number
          stage_id?: string | null
          success_rate?: number | null
        }
        Update: {
          contact_type_id?: string | null
          context_keywords?: string[] | null
          created_at?: string
          id?: string
          last_updated?: string
          optimal_timing_days?: number | null
          pattern_type?: string
          sample_count?: number
          stage_id?: string | null
          success_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_compass_learning_patterns_contact_type_id_fkey"
            columns: ["contact_type_id"]
            isOneToOne: false
            referencedRelation: "ai_compass_contact_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_compass_learning_patterns_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "ai_compass_contact_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_compass_sessions: {
        Row: {
          ai_decision: string
          ai_reasoning: string | null
          contact_type_id: string | null
          context_description: string
          created_at: string
          generated_message: string | null
          generated_reflink: string | null
          id: string
          is_archived: boolean
          last_contact_days: number | null
          notes: string | null
          recommended_resource_id: string | null
          stage_id: string | null
          tags: string[] | null
          updated_at: string
          user_feedback: string | null
          user_id: string
        }
        Insert: {
          ai_decision: string
          ai_reasoning?: string | null
          contact_type_id?: string | null
          context_description: string
          created_at?: string
          generated_message?: string | null
          generated_reflink?: string | null
          id?: string
          is_archived?: boolean
          last_contact_days?: number | null
          notes?: string | null
          recommended_resource_id?: string | null
          stage_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_feedback?: string | null
          user_id: string
        }
        Update: {
          ai_decision?: string
          ai_reasoning?: string | null
          contact_type_id?: string | null
          context_description?: string
          created_at?: string
          generated_message?: string | null
          generated_reflink?: string | null
          id?: string
          is_archived?: boolean
          last_contact_days?: number | null
          notes?: string | null
          recommended_resource_id?: string | null
          stage_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_feedback?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_compass_sessions_contact_type_id_fkey"
            columns: ["contact_type_id"]
            isOneToOne: false
            referencedRelation: "ai_compass_contact_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_compass_sessions_recommended_resource_id_fkey"
            columns: ["recommended_resource_id"]
            isOneToOne: false
            referencedRelation: "knowledge_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_compass_sessions_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "ai_compass_contact_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_compass_settings: {
        Row: {
          ai_learning_enabled: boolean
          ai_system_prompt: string | null
          allow_export: boolean
          created_at: string
          enabled_for_clients: boolean
          enabled_for_partners: boolean
          enabled_for_specjalista: boolean
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          ai_learning_enabled?: boolean
          ai_system_prompt?: string | null
          allow_export?: boolean
          created_at?: string
          enabled_for_clients?: boolean
          enabled_for_partners?: boolean
          enabled_for_specjalista?: boolean
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          ai_learning_enabled?: boolean
          ai_system_prompt?: string | null
          allow_export?: boolean
          created_at?: string
          enabled_for_clients?: boolean
          enabled_for_partners?: boolean
          enabled_for_specjalista?: boolean
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          layout: Json
          module_ids: string[] | null
          name: string
          roles: Database["public"]["Enums"]["app_role"][] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          layout?: Json
          module_ids?: string[] | null
          name: string
          roles?: Database["public"]["Enums"]["app_role"][] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          layout?: Json
          module_ids?: string[] | null
          name?: string
          roles?: Database["public"]["Enums"]["app_role"][] | null
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          created_at: string
          file_url: string
          id: string
          issued_at: string
          issued_by: string
          module_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          issued_at?: string
          issued_by: string
          module_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          issued_at?: string
          issued_by?: string
          module_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_items: {
        Row: {
          background_color: string | null
          border_color: string | null
          border_radius: number | null
          border_style: string | null
          border_width: number | null
          box_shadow: string | null
          cells: Json | null
          column_index: number
          created_at: string
          custom_number: string | null
          custom_number_image: string | null
          description: string | null
          font_size: number | null
          font_weight: number | null
          hover_opacity: number | null
          hover_scale: number | null
          icon: string | null
          icon_color: string | null
          icon_position: string | null
          icon_size: number | null
          icon_spacing: number | null
          id: string
          is_active: boolean
          lazy_loading: boolean | null
          link_target: string | null
          margin_bottom: number | null
          margin_top: number | null
          max_height: number | null
          max_width: number | null
          media_alt_text: string | null
          media_type: string | null
          media_url: string | null
          number_type: string | null
          object_fit: string | null
          opacity: number | null
          padding: number | null
          page_id: string
          position: number
          section_id: string
          show_number: boolean | null
          style_class: string | null
          text_align: string | null
          text_color: string | null
          text_formatting: Json | null
          title: string | null
          title_formatting: Json | null
          type: string
          updated_at: string
          url: string | null
          visible_to_anonymous: boolean
          visible_to_clients: boolean
          visible_to_everyone: boolean
          visible_to_partners: boolean
          visible_to_specjalista: boolean
        }
        Insert: {
          background_color?: string | null
          border_color?: string | null
          border_radius?: number | null
          border_style?: string | null
          border_width?: number | null
          box_shadow?: string | null
          cells?: Json | null
          column_index?: number
          created_at?: string
          custom_number?: string | null
          custom_number_image?: string | null
          description?: string | null
          font_size?: number | null
          font_weight?: number | null
          hover_opacity?: number | null
          hover_scale?: number | null
          icon?: string | null
          icon_color?: string | null
          icon_position?: string | null
          icon_size?: number | null
          icon_spacing?: number | null
          id?: string
          is_active?: boolean
          lazy_loading?: boolean | null
          link_target?: string | null
          margin_bottom?: number | null
          margin_top?: number | null
          max_height?: number | null
          max_width?: number | null
          media_alt_text?: string | null
          media_type?: string | null
          media_url?: string | null
          number_type?: string | null
          object_fit?: string | null
          opacity?: number | null
          padding?: number | null
          page_id: string
          position: number
          section_id: string
          show_number?: boolean | null
          style_class?: string | null
          text_align?: string | null
          text_color?: string | null
          text_formatting?: Json | null
          title?: string | null
          title_formatting?: Json | null
          type: string
          updated_at?: string
          url?: string | null
          visible_to_anonymous?: boolean
          visible_to_clients?: boolean
          visible_to_everyone?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
        }
        Update: {
          background_color?: string | null
          border_color?: string | null
          border_radius?: number | null
          border_style?: string | null
          border_width?: number | null
          box_shadow?: string | null
          cells?: Json | null
          column_index?: number
          created_at?: string
          custom_number?: string | null
          custom_number_image?: string | null
          description?: string | null
          font_size?: number | null
          font_weight?: number | null
          hover_opacity?: number | null
          hover_scale?: number | null
          icon?: string | null
          icon_color?: string | null
          icon_position?: string | null
          icon_size?: number | null
          icon_spacing?: number | null
          id?: string
          is_active?: boolean
          lazy_loading?: boolean | null
          link_target?: string | null
          margin_bottom?: number | null
          margin_top?: number | null
          max_height?: number | null
          max_width?: number | null
          media_alt_text?: string | null
          media_type?: string | null
          media_url?: string | null
          number_type?: string | null
          object_fit?: string | null
          opacity?: number | null
          padding?: number | null
          page_id?: string
          position?: number
          section_id?: string
          show_number?: boolean | null
          style_class?: string | null
          text_align?: string | null
          text_color?: string | null
          text_formatting?: Json | null
          title?: string | null
          title_formatting?: Json | null
          type?: string
          updated_at?: string
          url?: string | null
          visible_to_anonymous?: boolean
          visible_to_clients?: boolean
          visible_to_everyone?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cms_items_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "cms_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_sections: {
        Row: {
          align_items: string | null
          alignment: string | null
          background_color: string | null
          background_gradient: string | null
          background_image: string | null
          background_image_opacity: number | null
          background_image_position: string | null
          background_image_size: string | null
          border_color: string | null
          border_radius: number | null
          border_style: string | null
          border_width: number | null
          box_shadow: string | null
          collapsible_header: string | null
          content_direction: string | null
          content_wrap: string | null
          created_at: string
          custom_height: number | null
          custom_width: number | null
          default_expanded: boolean | null
          description: string | null
          display_type: string | null
          font_size: number | null
          font_weight: number | null
          gap: number | null
          height_type: string | null
          hover_background_color: string | null
          hover_background_gradient: string | null
          hover_border_color: string | null
          hover_box_shadow: string | null
          hover_opacity: number | null
          hover_scale: number | null
          hover_text_color: string | null
          hover_transition_duration: number | null
          icon_color: string | null
          icon_name: string | null
          icon_position: string | null
          icon_size: number | null
          id: string
          is_active: boolean
          justify_content: string | null
          letter_spacing: number | null
          line_height: number | null
          margin: number | null
          max_width: number | null
          min_height: number | null
          opacity: number | null
          overflow_behavior: string | null
          padding: number | null
          page_id: string
          parent_id: string | null
          position: number
          row_column_count: number | null
          row_layout_type: string | null
          section_margin_bottom: number | null
          section_margin_top: number | null
          section_type: string | null
          show_icon: boolean | null
          show_title: boolean | null
          style_class: string | null
          text_color: string | null
          text_transform: string | null
          title: string | null
          updated_at: string
          visible_to_anonymous: boolean
          visible_to_clients: boolean
          visible_to_everyone: boolean
          visible_to_partners: boolean
          visible_to_specjalista: boolean
          width_type: string | null
        }
        Insert: {
          align_items?: string | null
          alignment?: string | null
          background_color?: string | null
          background_gradient?: string | null
          background_image?: string | null
          background_image_opacity?: number | null
          background_image_position?: string | null
          background_image_size?: string | null
          border_color?: string | null
          border_radius?: number | null
          border_style?: string | null
          border_width?: number | null
          box_shadow?: string | null
          collapsible_header?: string | null
          content_direction?: string | null
          content_wrap?: string | null
          created_at?: string
          custom_height?: number | null
          custom_width?: number | null
          default_expanded?: boolean | null
          description?: string | null
          display_type?: string | null
          font_size?: number | null
          font_weight?: number | null
          gap?: number | null
          height_type?: string | null
          hover_background_color?: string | null
          hover_background_gradient?: string | null
          hover_border_color?: string | null
          hover_box_shadow?: string | null
          hover_opacity?: number | null
          hover_scale?: number | null
          hover_text_color?: string | null
          hover_transition_duration?: number | null
          icon_color?: string | null
          icon_name?: string | null
          icon_position?: string | null
          icon_size?: number | null
          id?: string
          is_active?: boolean
          justify_content?: string | null
          letter_spacing?: number | null
          line_height?: number | null
          margin?: number | null
          max_width?: number | null
          min_height?: number | null
          opacity?: number | null
          overflow_behavior?: string | null
          padding?: number | null
          page_id: string
          parent_id?: string | null
          position: number
          row_column_count?: number | null
          row_layout_type?: string | null
          section_margin_bottom?: number | null
          section_margin_top?: number | null
          section_type?: string | null
          show_icon?: boolean | null
          show_title?: boolean | null
          style_class?: string | null
          text_color?: string | null
          text_transform?: string | null
          title?: string | null
          updated_at?: string
          visible_to_anonymous?: boolean
          visible_to_clients?: boolean
          visible_to_everyone?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
          width_type?: string | null
        }
        Update: {
          align_items?: string | null
          alignment?: string | null
          background_color?: string | null
          background_gradient?: string | null
          background_image?: string | null
          background_image_opacity?: number | null
          background_image_position?: string | null
          background_image_size?: string | null
          border_color?: string | null
          border_radius?: number | null
          border_style?: string | null
          border_width?: number | null
          box_shadow?: string | null
          collapsible_header?: string | null
          content_direction?: string | null
          content_wrap?: string | null
          created_at?: string
          custom_height?: number | null
          custom_width?: number | null
          default_expanded?: boolean | null
          description?: string | null
          display_type?: string | null
          font_size?: number | null
          font_weight?: number | null
          gap?: number | null
          height_type?: string | null
          hover_background_color?: string | null
          hover_background_gradient?: string | null
          hover_border_color?: string | null
          hover_box_shadow?: string | null
          hover_opacity?: number | null
          hover_scale?: number | null
          hover_text_color?: string | null
          hover_transition_duration?: number | null
          icon_color?: string | null
          icon_name?: string | null
          icon_position?: string | null
          icon_size?: number | null
          id?: string
          is_active?: boolean
          justify_content?: string | null
          letter_spacing?: number | null
          line_height?: number | null
          margin?: number | null
          max_width?: number | null
          min_height?: number | null
          opacity?: number | null
          overflow_behavior?: string | null
          padding?: number | null
          page_id?: string
          parent_id?: string | null
          position?: number
          row_column_count?: number | null
          row_layout_type?: string | null
          section_margin_bottom?: number | null
          section_margin_top?: number | null
          section_type?: string | null
          show_icon?: boolean | null
          show_title?: boolean | null
          style_class?: string | null
          text_color?: string | null
          text_transform?: string | null
          title?: string | null
          updated_at?: string
          visible_to_anonymous?: boolean
          visible_to_clients?: boolean
          visible_to_everyone?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
          width_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_sections_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cms_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      cookie_banner_settings: {
        Row: {
          accept_all_text: string | null
          categories_on_first_layer: boolean
          colors: Json | null
          created_at: string
          custom_css: string | null
          custom_logo_url: string | null
          customize_text: string | null
          id: string
          layout_type: string
          message: string | null
          position: string
          preference_center_type: string
          privacy_policy_url: string | null
          read_more_text: string | null
          reject_all_text: string | null
          revisit_button_enabled: boolean
          revisit_button_position: string
          revisit_button_text: string | null
          save_preferences_text: string | null
          show_accept_all: boolean
          show_branding: boolean
          show_close_button: boolean
          show_customize: boolean
          show_reject_all: boolean
          theme: string
          title: string | null
          updated_at: string
        }
        Insert: {
          accept_all_text?: string | null
          categories_on_first_layer?: boolean
          colors?: Json | null
          created_at?: string
          custom_css?: string | null
          custom_logo_url?: string | null
          customize_text?: string | null
          id?: string
          layout_type?: string
          message?: string | null
          position?: string
          preference_center_type?: string
          privacy_policy_url?: string | null
          read_more_text?: string | null
          reject_all_text?: string | null
          revisit_button_enabled?: boolean
          revisit_button_position?: string
          revisit_button_text?: string | null
          save_preferences_text?: string | null
          show_accept_all?: boolean
          show_branding?: boolean
          show_close_button?: boolean
          show_customize?: boolean
          show_reject_all?: boolean
          theme?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          accept_all_text?: string | null
          categories_on_first_layer?: boolean
          colors?: Json | null
          created_at?: string
          custom_css?: string | null
          custom_logo_url?: string | null
          customize_text?: string | null
          id?: string
          layout_type?: string
          message?: string | null
          position?: string
          preference_center_type?: string
          privacy_policy_url?: string | null
          read_more_text?: string | null
          reject_all_text?: string | null
          revisit_button_enabled?: boolean
          revisit_button_position?: string
          revisit_button_text?: string | null
          save_preferences_text?: string | null
          show_accept_all?: boolean
          show_branding?: boolean
          show_close_button?: boolean
          show_customize?: boolean
          show_reject_all?: boolean
          theme?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cookie_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          is_hidden: boolean
          is_necessary: boolean
          load_before_consent: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          is_hidden?: boolean
          is_necessary?: boolean
          load_before_consent?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          is_hidden?: boolean
          is_necessary?: boolean
          load_before_consent?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      cookie_consent_settings: {
        Row: {
          consent_expiration_days: number
          consent_template: string
          created_at: string
          geo_countries: string[] | null
          geo_targeting_enabled: boolean
          id: string
          is_active: boolean
          reload_on_consent: boolean
          updated_at: string
        }
        Insert: {
          consent_expiration_days?: number
          consent_template?: string
          created_at?: string
          geo_countries?: string[] | null
          geo_targeting_enabled?: boolean
          id?: string
          is_active?: boolean
          reload_on_consent?: boolean
          updated_at?: string
        }
        Update: {
          consent_expiration_days?: number
          consent_template?: string
          created_at?: string
          geo_countries?: string[] | null
          geo_targeting_enabled?: boolean
          id?: string
          is_active?: boolean
          reload_on_consent?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_resources: {
        Row: {
          allow_click_redirect: boolean
          allow_copy_link: boolean
          allow_download: boolean
          allow_share: boolean
          category: string | null
          click_redirect_url: string | null
          context_of_use: string | null
          created_at: string
          description: string | null
          download_count: number
          file_name: string | null
          file_size: number | null
          id: string
          is_featured: boolean
          is_new: boolean
          is_updated: boolean
          position: number
          resource_type: Database["public"]["Enums"]["resource_type"]
          source_type: string
          source_url: string | null
          status: Database["public"]["Enums"]["resource_status"]
          tags: string[] | null
          title: string
          updated_at: string
          version: string | null
          visible_to_clients: boolean
          visible_to_everyone: boolean
          visible_to_partners: boolean
          visible_to_specjalista: boolean
          work_stage: string | null
        }
        Insert: {
          allow_click_redirect?: boolean
          allow_copy_link?: boolean
          allow_download?: boolean
          allow_share?: boolean
          category?: string | null
          click_redirect_url?: string | null
          context_of_use?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_featured?: boolean
          is_new?: boolean
          is_updated?: boolean
          position?: number
          resource_type?: Database["public"]["Enums"]["resource_type"]
          source_type?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["resource_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          version?: string | null
          visible_to_clients?: boolean
          visible_to_everyone?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
          work_stage?: string | null
        }
        Update: {
          allow_click_redirect?: boolean
          allow_copy_link?: boolean
          allow_download?: boolean
          allow_share?: boolean
          category?: string | null
          click_redirect_url?: string | null
          context_of_use?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_featured?: boolean
          is_new?: boolean
          is_updated?: boolean
          position?: number
          resource_type?: Database["public"]["Enums"]["resource_type"]
          source_type?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["resource_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          version?: string | null
          visible_to_clients?: boolean
          visible_to_everyone?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
          work_stage?: string | null
        }
        Relationships: []
      }
      medical_chat_history: {
        Row: {
          created_at: string
          id: string
          query: string
          response: string
          results_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          response: string
          results_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          response?: string
          results_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      page_settings: {
        Row: {
          column_count: number
          created_at: string
          favicon_url: string | null
          id: string
          layout_mode: string
          og_image_url: string | null
          page_alignment: string | null
          page_margin: number | null
          page_type: string
          updated_at: string
        }
        Insert: {
          column_count?: number
          created_at?: string
          favicon_url?: string | null
          id?: string
          layout_mode?: string
          og_image_url?: string | null
          page_alignment?: string | null
          page_margin?: number | null
          page_type?: string
          updated_at?: string
        }
        Update: {
          column_count?: number
          created_at?: string
          favicon_url?: string | null
          id?: string
          layout_mode?: string
          og_image_url?: string | null
          page_alignment?: string | null
          page_margin?: number | null
          page_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          content: string | null
          content_formatting: Json | null
          created_at: string
          id: string
          is_active: boolean
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          position: number
          slug: string
          title: string
          updated_at: string
          visible_to_anonymous: boolean
          visible_to_clients: boolean
          visible_to_everyone: boolean
          visible_to_partners: boolean
          visible_to_specjalista: boolean
        }
        Insert: {
          content?: string | null
          content_formatting?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          position?: number
          slug: string
          title: string
          updated_at?: string
          visible_to_anonymous?: boolean
          visible_to_clients?: boolean
          visible_to_everyone?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
        }
        Update: {
          content?: string | null
          content_formatting?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          position?: number
          slug?: string
          title?: string
          updated_at?: string
          visible_to_anonymous?: boolean
          visible_to_clients?: boolean
          visible_to_everyone?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          eq_id: string | null
          first_name: string | null
          id: string
          is_active: boolean
          last_name: string | null
          phone_number: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          eq_id?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          phone_number?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          eq_id?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          phone_number?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reflinks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_type: string | null
          link_url: string | null
          position: number | null
          reflink_code: string
          target_role: string
          title: string | null
          updated_at: string
          visible_to_roles: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_type?: string | null
          link_url?: string | null
          position?: number | null
          reflink_code: string
          target_role: string
          title?: string | null
          updated_at?: string
          visible_to_roles?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_type?: string | null
          link_url?: string | null
          position?: number | null
          reflink_code?: string
          target_role?: string
          title?: string | null
          updated_at?: string
          visible_to_roles?: string[] | null
        }
        Relationships: []
      }
      reflinks_visibility_settings: {
        Row: {
          button_visible: boolean
          created_at: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          button_visible?: boolean
          created_at?: string
          id?: string
          role: string
          updated_at?: string
        }
        Update: {
          button_visible?: boolean
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_texts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_active: boolean
          text_formatting: Json | null
          type: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          text_formatting?: Json | null
          type: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          text_formatting?: Json | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          is_completed: boolean
          module_id: string
          notification_sent: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          module_id: string
          notification_sent?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          module_id?: string
          notification_sent?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "training_assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      training_lessons: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_active: boolean
          is_required: boolean
          media_alt_text: string | null
          media_type: string | null
          media_url: string | null
          min_time_seconds: number | null
          module_id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          media_alt_text?: string | null
          media_type?: string | null
          media_url?: string | null
          min_time_seconds?: number | null
          module_id: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          media_alt_text?: string | null
          media_type?: string | null
          media_url?: string | null
          min_time_seconds?: number | null
          module_id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          position: number
          title: string
          updated_at: string
          visible_to_anonymous: boolean
          visible_to_clients: boolean
          visible_to_everyone: boolean
          visible_to_partners: boolean
          visible_to_specjalista: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          position?: number
          title: string
          updated_at?: string
          visible_to_anonymous?: boolean
          visible_to_clients?: boolean
          visible_to_everyone?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          position?: number
          title?: string
          updated_at?: string
          visible_to_anonymous?: boolean
          visible_to_clients?: boolean
          visible_to_everyone?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
        }
        Relationships: []
      }
      training_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          lesson_id: string
          started_at: string | null
          time_spent_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lesson_id: string
          started_at?: string | null
          time_spent_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lesson_id?: string
          started_at?: string | null
          time_spent_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cookie_consents: {
        Row: {
          consent_given_at: string
          consents: Json
          created_at: string
          expires_at: string | null
          id: string
          ip_address_hash: string | null
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          consent_given_at?: string
          consents?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address_hash?: string | null
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          consent_given_at?: string
          consents?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address_hash?: string | null
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_confirm_user_email: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      admin_remove_row: { Args: { row_id: string }; Returns: boolean }
      admin_toggle_user_status: {
        Args: { new_status: boolean; target_user_id: string }
        Returns: boolean
      }
      admin_update_user_role: {
        Args: { target_role: string; target_user_id: string }
        Returns: boolean
      }
      debug_user_access: {
        Args: never
        Returns: {
          current_user_id: string
          has_profile: boolean
          user_role: string
        }[]
      }
      email_exists: { Args: { email_param: string }; Returns: boolean }
      get_current_user_role: { Args: never; Returns: string }
      get_user_profiles_with_confirmation: {
        Args: never
        Returns: {
          confirmation_sent_at: string
          created_at: string
          email: string
          email_confirmed_at: string
          eq_id: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          role: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_role_update: {
        Args: { new_role: string; user_id_param: string }
        Returns: boolean
      }
      set_default_certificate_template: {
        Args: { template_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "partner" | "client" | "specjalista" | "user"
      resource_status: "active" | "draft" | "archived"
      resource_type: "pdf" | "doc" | "zip" | "form" | "link" | "page"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "partner", "client", "specjalista", "user"],
      resource_status: ["active", "draft", "archived"],
      resource_type: ["pdf", "doc", "zip", "form", "link", "page"],
    },
  },
} as const
