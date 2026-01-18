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
      ai_compass_contact_history: {
        Row: {
          ai_session_id: string | null
          change_type: string
          contact_id: string
          created_at: string | null
          created_by: string
          id: string
          new_values: Json | null
          previous_values: Json | null
        }
        Insert: {
          ai_session_id?: string | null
          change_type: string
          contact_id: string
          created_at?: string | null
          created_by: string
          id?: string
          new_values?: Json | null
          previous_values?: Json | null
        }
        Update: {
          ai_session_id?: string | null
          change_type?: string
          contact_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          new_values?: Json | null
          previous_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_compass_contact_history_ai_session_id_fkey"
            columns: ["ai_session_id"]
            isOneToOne: false
            referencedRelation: "ai_compass_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_compass_contact_history_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ai_compass_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ai_compass_contacts: {
        Row: {
          contact_type_id: string | null
          created_at: string | null
          current_context: string | null
          final_status: string | null
          final_status_set_at: string | null
          id: string
          is_active: boolean | null
          last_contact_days: number | null
          name: string
          notes: string | null
          stage_id: string | null
          suggested_next_contact: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_type_id?: string | null
          created_at?: string | null
          current_context?: string | null
          final_status?: string | null
          final_status_set_at?: string | null
          id?: string
          is_active?: boolean | null
          last_contact_days?: number | null
          name: string
          notes?: string | null
          stage_id?: string | null
          suggested_next_contact?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_type_id?: string | null
          created_at?: string | null
          current_context?: string | null
          final_status?: string | null
          final_status_set_at?: string | null
          id?: string
          is_active?: boolean | null
          last_contact_days?: number | null
          name?: string
          notes?: string | null
          stage_id?: string | null
          suggested_next_contact?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_compass_contacts_contact_type_id_fkey"
            columns: ["contact_type_id"]
            isOneToOne: false
            referencedRelation: "ai_compass_contact_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_compass_contacts_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "ai_compass_contact_stages"
            referencedColumns: ["id"]
          },
        ]
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
          contact_id: string | null
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
          contact_id?: string | null
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
          contact_id?: string | null
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
            foreignKeyName: "ai_compass_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ai_compass_contacts"
            referencedColumns: ["id"]
          },
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
          allow_delete_contacts: boolean | null
          allow_delete_history: boolean | null
          allow_edit_contacts: boolean | null
          allow_export: boolean
          allow_multiple_decisions: boolean | null
          allow_team_contacts_export: boolean | null
          created_at: string
          data_retention_days: number | null
          enabled_for_clients: boolean
          enabled_for_partners: boolean
          enabled_for_specjalista: boolean
          id: string
          is_enabled: boolean
          show_contact_timeline: boolean | null
          show_today_dashboard: boolean | null
          updated_at: string
        }
        Insert: {
          ai_learning_enabled?: boolean
          ai_system_prompt?: string | null
          allow_delete_contacts?: boolean | null
          allow_delete_history?: boolean | null
          allow_edit_contacts?: boolean | null
          allow_export?: boolean
          allow_multiple_decisions?: boolean | null
          allow_team_contacts_export?: boolean | null
          created_at?: string
          data_retention_days?: number | null
          enabled_for_clients?: boolean
          enabled_for_partners?: boolean
          enabled_for_specjalista?: boolean
          id?: string
          is_enabled?: boolean
          show_contact_timeline?: boolean | null
          show_today_dashboard?: boolean | null
          updated_at?: string
        }
        Update: {
          ai_learning_enabled?: boolean
          ai_system_prompt?: string | null
          allow_delete_contacts?: boolean | null
          allow_delete_history?: boolean | null
          allow_edit_contacts?: boolean | null
          allow_export?: boolean
          allow_multiple_decisions?: boolean | null
          allow_team_contacts_export?: boolean | null
          created_at?: string
          data_retention_days?: number | null
          enabled_for_clients?: boolean
          enabled_for_partners?: boolean
          enabled_for_specjalista?: boolean
          id?: string
          is_enabled?: boolean
          show_contact_timeline?: boolean | null
          show_today_dashboard?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      banner_interactions: {
        Row: {
          action_after_banner: string | null
          animation_level: string | null
          banner_id: string
          banner_tone: string | null
          banner_type: string
          compass_stage: string | null
          content_length: number | null
          created_at: string | null
          day_of_week: number | null
          has_animation: boolean | null
          id: string
          interaction_type: string
          reaction_time_ms: number | null
          time_of_day: string | null
          time_to_first_action_ms: number | null
          user_id: string
          user_role: string | null
        }
        Insert: {
          action_after_banner?: string | null
          animation_level?: string | null
          banner_id: string
          banner_tone?: string | null
          banner_type: string
          compass_stage?: string | null
          content_length?: number | null
          created_at?: string | null
          day_of_week?: number | null
          has_animation?: boolean | null
          id?: string
          interaction_type: string
          reaction_time_ms?: number | null
          time_of_day?: string | null
          time_to_first_action_ms?: number | null
          user_id: string
          user_role?: string | null
        }
        Update: {
          action_after_banner?: string | null
          animation_level?: string | null
          banner_id?: string
          banner_tone?: string | null
          banner_type?: string
          compass_stage?: string | null
          content_length?: number | null
          created_at?: string | null
          day_of_week?: number | null
          has_animation?: boolean | null
          id?: string
          interaction_type?: string
          reaction_time_ms?: number | null
          time_of_day?: string | null
          time_to_first_action_ms?: number | null
          user_id?: string
          user_role?: string | null
        }
        Relationships: []
      }
      calculator_settings: {
        Row: {
          base_commission_per_client: number | null
          created_at: string | null
          default_conversion: number | null
          default_followers: number | null
          enabled_for_admins: boolean | null
          enabled_for_clients: boolean | null
          enabled_for_partners: boolean | null
          enabled_for_specjalista: boolean | null
          eur_to_pln_rate: number | null
          extension_bonus_per_client: number | null
          extension_months_count: number | null
          id: string
          is_enabled: boolean | null
          max_conversion: number | null
          max_followers: number | null
          min_conversion: number | null
          min_followers: number | null
          passive_months: number | null
          passive_rate_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          base_commission_per_client?: number | null
          created_at?: string | null
          default_conversion?: number | null
          default_followers?: number | null
          enabled_for_admins?: boolean | null
          enabled_for_clients?: boolean | null
          enabled_for_partners?: boolean | null
          enabled_for_specjalista?: boolean | null
          eur_to_pln_rate?: number | null
          extension_bonus_per_client?: number | null
          extension_months_count?: number | null
          id?: string
          is_enabled?: boolean | null
          max_conversion?: number | null
          max_followers?: number | null
          min_conversion?: number | null
          min_followers?: number | null
          passive_months?: number | null
          passive_rate_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          base_commission_per_client?: number | null
          created_at?: string | null
          default_conversion?: number | null
          default_followers?: number | null
          enabled_for_admins?: boolean | null
          enabled_for_clients?: boolean | null
          enabled_for_partners?: boolean | null
          enabled_for_specjalista?: boolean | null
          eur_to_pln_rate?: number | null
          extension_bonus_per_client?: number | null
          extension_months_count?: number | null
          id?: string
          is_enabled?: boolean | null
          max_conversion?: number | null
          max_followers?: number | null
          min_conversion?: number | null
          min_followers?: number | null
          passive_months?: number | null
          passive_rate_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      calculator_user_access: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          has_access: boolean | null
          id: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          has_access?: boolean | null
          id?: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          has_access?: boolean | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      calculator_volume_thresholds: {
        Row: {
          bonus_amount: number
          created_at: string | null
          id: string
          is_active: boolean | null
          position: number | null
          threshold_clients: number
        }
        Insert: {
          bonus_amount: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          position?: number | null
          threshold_clients: number
        }
        Update: {
          bonus_amount?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          position?: number | null
          threshold_clients?: number
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
      cms_item_translations: {
        Row: {
          cells: Json | null
          created_at: string | null
          description: string | null
          id: string
          item_id: string
          language_code: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          cells?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          item_id: string
          language_code: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          cells?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          item_id?: string
          language_code?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_item_translations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cms_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_item_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "i18n_languages"
            referencedColumns: ["code"]
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
      cms_section_translations: {
        Row: {
          collapsible_header: string | null
          created_at: string | null
          description: string | null
          id: string
          language_code: string
          section_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          collapsible_header?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          language_code: string
          section_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          collapsible_header?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          language_code?: string
          section_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_section_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "i18n_languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cms_section_translations_section_id_fkey"
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
      cron_job_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          job_name: string
          processed_count: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          job_name: string
          processed_count?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          job_name?: string
          processed_count?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      cron_settings: {
        Row: {
          created_at: string | null
          id: string
          interval_minutes: number
          is_enabled: boolean | null
          job_name: string
          last_run_at: string | null
          next_run_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          interval_minutes?: number
          is_enabled?: boolean | null
          job_name: string
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          interval_minutes?: number
          is_enabled?: boolean | null
          job_name?: string
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_signal_settings: {
        Row: {
          ai_tone: string | null
          animation_intensity: string | null
          animation_type: string | null
          created_at: string | null
          display_frequency: string
          generation_mode: string
          id: string
          is_enabled: boolean
          updated_at: string | null
          visible_to_clients: boolean
          visible_to_partners: boolean
          visible_to_specjalista: boolean
        }
        Insert: {
          ai_tone?: string | null
          animation_intensity?: string | null
          animation_type?: string | null
          created_at?: string | null
          display_frequency?: string
          generation_mode?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string | null
          visible_to_clients?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
        }
        Update: {
          ai_tone?: string | null
          animation_intensity?: string | null
          animation_type?: string | null
          created_at?: string | null
          display_frequency?: string
          generation_mode?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string | null
          visible_to_clients?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
        }
        Relationships: []
      }
      daily_signals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          explanation: string
          generated_by_ai: boolean
          id: string
          is_approved: boolean
          is_used: boolean
          main_message: string
          scheduled_date: string | null
          signal_type: string | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          explanation: string
          generated_by_ai?: boolean
          id?: string
          is_approved?: boolean
          is_used?: boolean
          main_message: string
          scheduled_date?: string | null
          signal_type?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          explanation?: string
          generated_by_ai?: boolean
          id?: string
          is_approved?: boolean
          is_used?: boolean
          main_message?: string
          scheduled_date?: string | null
          signal_type?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dashboard_footer_settings: {
        Row: {
          contact_description: string | null
          contact_email_address: string | null
          contact_email_label: string | null
          contact_icon: string | null
          contact_reminder: string | null
          contact_title: string | null
          created_at: string | null
          feature_1_description: string | null
          feature_1_icon: string | null
          feature_1_title: string | null
          feature_2_description: string | null
          feature_2_icon: string | null
          feature_2_title: string | null
          feature_3_description: string | null
          feature_3_icon: string | null
          feature_3_title: string | null
          id: string
          is_active: boolean | null
          mission_statement: string | null
          quote_text: string | null
          team_description: string | null
          team_title: string | null
          updated_at: string | null
        }
        Insert: {
          contact_description?: string | null
          contact_email_address?: string | null
          contact_email_label?: string | null
          contact_icon?: string | null
          contact_reminder?: string | null
          contact_title?: string | null
          created_at?: string | null
          feature_1_description?: string | null
          feature_1_icon?: string | null
          feature_1_title?: string | null
          feature_2_description?: string | null
          feature_2_icon?: string | null
          feature_2_title?: string | null
          feature_3_description?: string | null
          feature_3_icon?: string | null
          feature_3_title?: string | null
          id?: string
          is_active?: boolean | null
          mission_statement?: string | null
          quote_text?: string | null
          team_description?: string | null
          team_title?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_description?: string | null
          contact_email_address?: string | null
          contact_email_label?: string | null
          contact_icon?: string | null
          contact_reminder?: string | null
          contact_title?: string | null
          created_at?: string | null
          feature_1_description?: string | null
          feature_1_icon?: string | null
          feature_1_title?: string | null
          feature_2_description?: string | null
          feature_2_icon?: string | null
          feature_2_title?: string | null
          feature_3_description?: string | null
          feature_3_icon?: string | null
          feature_3_title?: string | null
          id?: string
          is_active?: boolean | null
          mission_statement?: string | null
          quote_text?: string | null
          team_description?: string | null
          team_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_event_types: {
        Row: {
          created_at: string
          description: string | null
          event_key: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_key: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_key?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type_id: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type_id?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type_id?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "email_event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_events: {
        Row: {
          created_at: string
          event_type_id: string
          id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          event_type_id: string
          id?: string
          template_id: string
        }
        Update: {
          created_at?: string
          event_type_id?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_template_events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "email_event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          blocks_json: Json | null
          body_html: string
          body_text: string | null
          created_at: string
          editor_mode: string | null
          footer_html: string | null
          id: string
          internal_name: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          blocks_json?: Json | null
          body_html: string
          body_text?: string | null
          created_at?: string
          editor_mode?: string | null
          footer_html?: string | null
          id?: string
          internal_name: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          blocks_json?: Json | null
          body_html?: string
          body_text?: string | null
          created_at?: string
          editor_mode?: string | null
          footer_html?: string | null
          id?: string
          internal_name?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      event_google_sync: {
        Row: {
          event_id: string
          google_event_id: string
          id: string
          synced_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          google_event_id: string
          id?: string
          synced_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          google_event_id?: string
          id?: string
          synced_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_google_sync_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          cancelled_at: string | null
          event_id: string
          id: string
          occurrence_index: number | null
          registered_at: string | null
          reminder_sent: boolean | null
          status: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          event_id: string
          id?: string
          occurrence_index?: number | null
          registered_at?: string | null
          reminder_sent?: boolean | null
          status?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          event_id?: string
          id?: string
          occurrence_index?: number | null
          registered_at?: string | null
          reminder_sent?: boolean | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders_log: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          id: string
          reminder_type: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          id?: string
          reminder_type: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          id?: string
          reminder_type?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          buttons: Json | null
          created_at: string | null
          created_by: string
          description: string | null
          duration_minutes: number | null
          email_reminder_enabled: boolean | null
          end_time: string
          event_type: string
          guest_link: string | null
          host_name: string | null
          host_user_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_published: boolean | null
          location: string | null
          max_participants: number | null
          meeting_topic_id: string | null
          occurrences: Json | null
          registration_form_config: Json | null
          requires_registration: boolean | null
          sms_reminder_enabled: boolean | null
          start_time: string
          timezone: string | null
          title: string
          updated_at: string | null
          visible_to_clients: boolean | null
          visible_to_everyone: boolean | null
          visible_to_partners: boolean | null
          visible_to_specjalista: boolean | null
          webinar_type: string | null
          zoom_auto_generated: boolean | null
          zoom_generated_at: string | null
          zoom_link: string | null
          zoom_meeting_id: string | null
          zoom_password: string | null
          zoom_start_url: string | null
        }
        Insert: {
          buttons?: Json | null
          created_at?: string | null
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          email_reminder_enabled?: boolean | null
          end_time: string
          event_type?: string
          guest_link?: string | null
          host_name?: string | null
          host_user_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_published?: boolean | null
          location?: string | null
          max_participants?: number | null
          meeting_topic_id?: string | null
          occurrences?: Json | null
          registration_form_config?: Json | null
          requires_registration?: boolean | null
          sms_reminder_enabled?: boolean | null
          start_time: string
          timezone?: string | null
          title: string
          updated_at?: string | null
          visible_to_clients?: boolean | null
          visible_to_everyone?: boolean | null
          visible_to_partners?: boolean | null
          visible_to_specjalista?: boolean | null
          webinar_type?: string | null
          zoom_auto_generated?: boolean | null
          zoom_generated_at?: string | null
          zoom_link?: string | null
          zoom_meeting_id?: string | null
          zoom_password?: string | null
          zoom_start_url?: string | null
        }
        Update: {
          buttons?: Json | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          email_reminder_enabled?: boolean | null
          end_time?: string
          event_type?: string
          guest_link?: string | null
          host_name?: string | null
          host_user_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_published?: boolean | null
          location?: string | null
          max_participants?: number | null
          meeting_topic_id?: string | null
          occurrences?: Json | null
          registration_form_config?: Json | null
          requires_registration?: boolean | null
          sms_reminder_enabled?: boolean | null
          start_time?: string
          timezone?: string | null
          title?: string
          updated_at?: string | null
          visible_to_clients?: boolean | null
          visible_to_everyone?: boolean | null
          visible_to_partners?: boolean | null
          visible_to_specjalista?: boolean | null
          webinar_type?: string | null
          zoom_auto_generated?: boolean | null
          zoom_generated_at?: string | null
          zoom_link?: string | null
          zoom_meeting_id?: string | null
          zoom_password?: string | null
          zoom_start_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_meeting_topic_id_fkey"
            columns: ["meeting_topic_id"]
            isOneToOne: false
            referencedRelation: "leader_meeting_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      events_settings: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          reminder_hours_before: number | null
          send_email_reminders: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          reminder_hours_before?: number | null
          send_email_reminders?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          reminder_hours_before?: number | null
          send_email_reminders?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_visibility: {
        Row: {
          created_at: string
          description: string | null
          feature_category: string
          feature_key: string
          feature_name: string
          id: string
          is_system: boolean
          position: number
          updated_at: string
          visible_to_admin: boolean
          visible_to_client: boolean
          visible_to_partner: boolean
          visible_to_specjalista: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_category?: string
          feature_key: string
          feature_name: string
          id?: string
          is_system?: boolean
          position?: number
          updated_at?: string
          visible_to_admin?: boolean
          visible_to_client?: boolean
          visible_to_partner?: boolean
          visible_to_specjalista?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_category?: string
          feature_key?: string
          feature_name?: string
          id?: string
          is_system?: boolean
          position?: number
          updated_at?: string
          visible_to_admin?: boolean
          visible_to_client?: boolean
          visible_to_partner?: boolean
          visible_to_specjalista?: boolean
        }
        Relationships: []
      }
      google_calendar_sync_logs: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          event_id: string | null
          id: string
          metadata: Json | null
          response_time_ms: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          status: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_sync_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_event_registrations: {
        Row: {
          cancelled_at: string | null
          confirmation_sent: boolean | null
          confirmation_sent_at: string | null
          created_at: string | null
          email: string
          event_id: string
          first_name: string
          id: string
          invited_by_user_id: string | null
          last_name: string | null
          notes: string | null
          phone: string | null
          registered_at: string | null
          reminder_1h_sent: boolean | null
          reminder_1h_sent_at: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          source: string | null
          status: string | null
          team_contact_id: string | null
          updated_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          confirmation_sent?: boolean | null
          confirmation_sent_at?: string | null
          created_at?: string | null
          email: string
          event_id: string
          first_name: string
          id?: string
          invited_by_user_id?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          registered_at?: string | null
          reminder_1h_sent?: boolean | null
          reminder_1h_sent_at?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          source?: string | null
          status?: string | null
          team_contact_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          confirmation_sent?: boolean | null
          confirmation_sent_at?: string | null
          created_at?: string | null
          email?: string
          event_id?: string
          first_name?: string
          id?: string
          invited_by_user_id?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          registered_at?: string | null
          reminder_1h_sent?: boolean | null
          reminder_1h_sent_at?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          source?: string | null
          status?: string | null
          team_contact_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_event_registrations_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guest_event_registrations_team_contact_id_fkey"
            columns: ["team_contact_id"]
            isOneToOne: false
            referencedRelation: "team_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      i18n_languages: {
        Row: {
          code: string
          created_at: string
          flag_emoji: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          native_name: string | null
          position: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          native_name?: string | null
          position?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          native_name?: string | null
          position?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      i18n_translations: {
        Row: {
          created_at: string
          id: string
          key: string
          language_code: string
          namespace: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          language_code: string
          namespace?: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          language_code?: string
          namespace?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "i18n_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "i18n_languages"
            referencedColumns: ["code"]
          },
        ]
      }
      important_info_banners: {
        Row: {
          animation_intensity: string | null
          animation_type: string | null
          button_color: string | null
          button_enabled: boolean | null
          button_icon: string | null
          button_text: string | null
          button_url: string | null
          content: string
          created_at: string | null
          display_frequency: string
          expiration_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          priority: number
          scheduled_date: string | null
          title: string
          title_accent_color: boolean | null
          title_bold: boolean | null
          title_custom_color: string | null
          title_large: boolean | null
          title_shadow: boolean | null
          title_underline: boolean | null
          updated_at: string | null
          visible_to_clients: boolean
          visible_to_partners: boolean
          visible_to_specjalista: boolean
        }
        Insert: {
          animation_intensity?: string | null
          animation_type?: string | null
          button_color?: string | null
          button_enabled?: boolean | null
          button_icon?: string | null
          button_text?: string | null
          button_url?: string | null
          content: string
          created_at?: string | null
          display_frequency?: string
          expiration_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          priority?: number
          scheduled_date?: string | null
          title?: string
          title_accent_color?: boolean | null
          title_bold?: boolean | null
          title_custom_color?: string | null
          title_large?: boolean | null
          title_shadow?: boolean | null
          title_underline?: boolean | null
          updated_at?: string | null
          visible_to_clients?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
        }
        Update: {
          animation_intensity?: string | null
          animation_type?: string | null
          button_color?: string | null
          button_enabled?: boolean | null
          button_icon?: string | null
          button_text?: string | null
          button_url?: string | null
          content?: string
          created_at?: string | null
          display_frequency?: string
          expiration_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          priority?: number
          scheduled_date?: string | null
          title?: string
          title_accent_color?: boolean | null
          title_bold?: boolean | null
          title_custom_color?: string | null
          title_large?: boolean | null
          title_shadow?: boolean | null
          title_underline?: boolean | null
          updated_at?: string | null
          visible_to_clients?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
        }
        Relationships: []
      }
      infolink_otp_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          is_invalidated: boolean | null
          partner_id: string
          reflink_id: string
          used_sessions: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          is_invalidated?: boolean | null
          partner_id: string
          reflink_id: string
          used_sessions?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          is_invalidated?: boolean | null
          partner_id?: string
          reflink_id?: string
          used_sessions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "infolink_otp_codes_reflink_id_fkey"
            columns: ["reflink_id"]
            isOneToOne: false
            referencedRelation: "reflinks"
            referencedColumns: ["id"]
          },
        ]
      }
      infolink_sessions: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          expires_at: string
          id: string
          last_activity_at: string | null
          otp_code_id: string
          session_token: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at: string
          id?: string
          last_activity_at?: string | null
          otp_code_id: string
          session_token: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          last_activity_at?: string | null
          otp_code_id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "infolink_sessions_otp_code_id_fkey"
            columns: ["otp_code_id"]
            isOneToOne: false
            referencedRelation: "infolink_otp_codes"
            referencedColumns: ["id"]
          },
        ]
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
      leader_availability: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          end_time: string
          id: string
          is_active: boolean | null
          leader_user_id: string
          max_bookings_per_slot: number | null
          slot_duration_minutes: number | null
          specific_date: string | null
          start_time: string
          timezone: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          end_time: string
          id?: string
          is_active?: boolean | null
          leader_user_id: string
          max_bookings_per_slot?: number | null
          slot_duration_minutes?: number | null
          specific_date?: string | null
          start_time: string
          timezone?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          leader_user_id?: string
          max_bookings_per_slot?: number | null
          slot_duration_minutes?: number | null
          specific_date?: string | null
          start_time?: string
          timezone?: string | null
        }
        Relationships: []
      }
      leader_availability_exceptions: {
        Row: {
          created_at: string | null
          exception_date: string
          id: string
          leader_user_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          exception_date: string
          id?: string
          leader_user_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          exception_date?: string
          id?: string
          leader_user_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      leader_meeting_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          leader_user_id: string
          meeting_type: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          leader_user_id: string
          meeting_type: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          leader_user_id?: string
          meeting_type?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leader_meeting_topics: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          leader_user_id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          leader_user_id: string
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          leader_user_id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      leader_permissions: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          can_host_private_meetings: boolean | null
          created_at: string | null
          external_calendly_url: string | null
          id: string
          individual_meetings_enabled: boolean | null
          partner_consultation_enabled: boolean | null
          tripartite_meeting_enabled: boolean | null
          updated_at: string | null
          use_external_booking: boolean | null
          user_id: string
          zoom_link: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          can_host_private_meetings?: boolean | null
          created_at?: string | null
          external_calendly_url?: string | null
          id?: string
          individual_meetings_enabled?: boolean | null
          partner_consultation_enabled?: boolean | null
          tripartite_meeting_enabled?: boolean | null
          updated_at?: string | null
          use_external_booking?: boolean | null
          user_id: string
          zoom_link?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          can_host_private_meetings?: boolean | null
          created_at?: string | null
          external_calendly_url?: string | null
          id?: string
          individual_meetings_enabled?: boolean | null
          partner_consultation_enabled?: boolean | null
          tripartite_meeting_enabled?: boolean | null
          updated_at?: string | null
          use_external_booking?: boolean | null
          user_id?: string
          zoom_link?: string | null
        }
        Relationships: []
      }
      maintenance_mode: {
        Row: {
          bypass_key: string | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          message: string | null
          planned_end_time: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          bypass_key?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          message?: string | null
          planned_end_time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          bypass_key?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          message?: string | null
          planned_end_time?: string | null
          title?: string | null
          updated_at?: string | null
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
      meeting_reminders_sent: {
        Row: {
          event_id: string
          id: string
          reminder_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          reminder_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          reminder_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_reminders_sent_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_log: {
        Row: {
          delivered_at: string | null
          event_id: string | null
          event_type_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          delivered_at?: string | null
          event_id?: string | null
          event_type_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          delivered_at?: string | null
          event_id?: string | null
          event_type_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_log_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "notification_event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_event_types: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          email_template_id: string | null
          event_key: string
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          position: number | null
          send_email: boolean | null
          source_module: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          email_template_id?: string | null
          event_key: string
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          position?: number | null
          send_email?: boolean | null
          source_module: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          email_template_id?: string | null
          event_key?: string
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          position?: number | null
          send_email?: boolean | null
          source_module?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_event_types_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          created_at: string | null
          event_key: string
          event_type_id: string | null
          id: string
          payload: Json | null
          processed: boolean | null
          processed_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          sender_id: string
          sender_role: string | null
        }
        Insert: {
          created_at?: string | null
          event_key: string
          event_type_id?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sender_id: string
          sender_role?: string | null
        }
        Update: {
          created_at?: string | null
          event_key?: string
          event_type_id?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sender_id?: string
          sender_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "notification_event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_limits: {
        Row: {
          cooldown_minutes: number | null
          created_at: string | null
          event_type_id: string | null
          id: string
          is_active: boolean | null
          max_per_day: number | null
          max_per_hour: number | null
          updated_at: string | null
        }
        Insert: {
          cooldown_minutes?: number | null
          created_at?: string | null
          event_type_id?: string | null
          id?: string
          is_active?: boolean | null
          max_per_day?: number | null
          max_per_hour?: number | null
          updated_at?: string | null
        }
        Update: {
          cooldown_minutes?: number | null
          created_at?: string | null
          event_type_id?: string | null
          id?: string
          is_active?: boolean | null
          max_per_day?: number | null
          max_per_hour?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_limits_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: true
            referencedRelation: "notification_event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_role_routes: {
        Row: {
          created_at: string | null
          event_type_id: string | null
          id: string
          is_enabled: boolean | null
          source_role: string
          target_role: string
        }
        Insert: {
          created_at?: string | null
          event_type_id?: string | null
          id?: string
          is_enabled?: boolean | null
          source_role: string
          target_role: string
        }
        Update: {
          created_at?: string | null
          event_type_id?: string | null
          id?: string
          is_enabled?: boolean | null
          source_role?: string
          target_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_role_routes_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "notification_event_types"
            referencedColumns: ["id"]
          },
        ]
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
      private_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "private_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      private_chat_participants: {
        Row: {
          id: string
          is_active: boolean | null
          joined_at: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_chat_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "private_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      private_chat_threads: {
        Row: {
          closed_at: string | null
          created_at: string | null
          id: string
          initiator_id: string
          is_group: boolean | null
          last_message_at: string | null
          participant_id: string | null
          status: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
          initiator_id: string
          is_group?: boolean | null
          last_message_at?: string | null
          participant_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
          initiator_id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          participant_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_approved: boolean | null
          admin_approved_at: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          email_activated: boolean | null
          email_activated_at: string | null
          eq_id: string | null
          first_name: string | null
          guardian_approved: boolean | null
          guardian_approved_at: string | null
          guardian_name: string | null
          id: string
          is_active: boolean
          is_searchable: boolean | null
          last_name: string | null
          phone_number: string | null
          postal_code: string | null
          profile_completed: boolean | null
          profile_description: string | null
          rank: string | null
          reflink_code_used: string | null
          registered_via_reflink: string | null
          role: string
          search_keywords: string[] | null
          specialization: string | null
          street_address: string | null
          updated_at: string
          upline_eq_id: string | null
          upline_first_name: string | null
          upline_last_name: string | null
          user_id: string
        }
        Insert: {
          admin_approved?: boolean | null
          admin_approved_at?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          email_activated?: boolean | null
          email_activated_at?: string | null
          eq_id?: string | null
          first_name?: string | null
          guardian_approved?: boolean | null
          guardian_approved_at?: string | null
          guardian_name?: string | null
          id?: string
          is_active?: boolean
          is_searchable?: boolean | null
          last_name?: string | null
          phone_number?: string | null
          postal_code?: string | null
          profile_completed?: boolean | null
          profile_description?: string | null
          rank?: string | null
          reflink_code_used?: string | null
          registered_via_reflink?: string | null
          role?: string
          search_keywords?: string[] | null
          specialization?: string | null
          street_address?: string | null
          updated_at?: string
          upline_eq_id?: string | null
          upline_first_name?: string | null
          upline_last_name?: string | null
          user_id: string
        }
        Update: {
          admin_approved?: boolean | null
          admin_approved_at?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          email_activated?: boolean | null
          email_activated_at?: string | null
          eq_id?: string | null
          first_name?: string | null
          guardian_approved?: boolean | null
          guardian_approved_at?: string | null
          guardian_name?: string | null
          id?: string
          is_active?: boolean
          is_searchable?: boolean | null
          last_name?: string | null
          phone_number?: string | null
          postal_code?: string | null
          profile_completed?: boolean | null
          profile_description?: string | null
          rank?: string | null
          reflink_code_used?: string | null
          registered_via_reflink?: string | null
          role?: string
          search_keywords?: string[] | null
          specialization?: string | null
          street_address?: string | null
          updated_at?: string
          upline_eq_id?: string | null
          upline_first_name?: string | null
          upline_last_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_registered_via_reflink_fkey"
            columns: ["registered_via_reflink"]
            isOneToOne: false
            referencedRelation: "user_reflinks"
            referencedColumns: ["id"]
          },
        ]
      }
      reflink_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          reflink_id: string
          target_role: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          reflink_id: string
          target_role?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          reflink_id?: string
          target_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reflink_events_reflink_id_fkey"
            columns: ["reflink_id"]
            isOneToOne: false
            referencedRelation: "user_reflinks"
            referencedColumns: ["id"]
          },
        ]
      }
      reflink_generation_settings: {
        Row: {
          allowed_target_roles: Database["public"]["Enums"]["app_role"][]
          can_generate: boolean
          created_at: string
          id: string
          max_links_per_user: number
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          allowed_target_roles?: Database["public"]["Enums"]["app_role"][]
          can_generate?: boolean
          created_at?: string
          id?: string
          max_links_per_user?: number
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          allowed_target_roles?: Database["public"]["Enums"]["app_role"][]
          can_generate?: boolean
          created_at?: string
          id?: string
          max_links_per_user?: number
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reflink_global_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      reflinks: {
        Row: {
          clipboard_content: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          infolink_url: string | null
          infolink_url_type: string | null
          is_active: boolean
          link_type: string | null
          link_url: string | null
          otp_max_sessions: number | null
          otp_validity_hours: number | null
          position: number | null
          pre_otp_message: string | null
          protected_content: string | null
          reflink_code: string
          requires_otp: boolean | null
          slug: string | null
          target_role: string
          title: string | null
          updated_at: string
          visible_to_roles: string[] | null
          welcome_message: string | null
        }
        Insert: {
          clipboard_content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          infolink_url?: string | null
          infolink_url_type?: string | null
          is_active?: boolean
          link_type?: string | null
          link_url?: string | null
          otp_max_sessions?: number | null
          otp_validity_hours?: number | null
          position?: number | null
          pre_otp_message?: string | null
          protected_content?: string | null
          reflink_code: string
          requires_otp?: boolean | null
          slug?: string | null
          target_role: string
          title?: string | null
          updated_at?: string
          visible_to_roles?: string[] | null
          welcome_message?: string | null
        }
        Update: {
          clipboard_content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          infolink_url?: string | null
          infolink_url_type?: string | null
          is_active?: boolean
          link_type?: string | null
          link_url?: string | null
          otp_max_sessions?: number | null
          otp_validity_hours?: number | null
          position?: number | null
          pre_otp_message?: string | null
          protected_content?: string | null
          reflink_code?: string
          requires_otp?: boolean | null
          slug?: string | null
          target_role?: string
          title?: string | null
          updated_at?: string
          visible_to_roles?: string[] | null
          welcome_message?: string | null
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
      role_chat_channels: {
        Row: {
          channel_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sender_role: string
          target_role: string
          updated_at: string | null
        }
        Insert: {
          channel_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sender_role: string
          target_role: string
          updated_at?: string | null
        }
        Update: {
          channel_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sender_role?: string
          target_role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      role_chat_messages: {
        Row: {
          channel_id: string | null
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          recipient_id: string | null
          recipient_role: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          channel_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_role: string
          sender_id: string
          sender_role: string
        }
        Update: {
          channel_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_role?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "role_chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_test_at: string | null
          last_test_message: string | null
          last_test_result: boolean | null
          sender_email: string
          sender_name: string
          smtp_encryption: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_username: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_result?: boolean | null
          sender_email?: string
          sender_name?: string
          smtp_encryption?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_username?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_result?: boolean | null
          sender_email?: string
          sender_name?: string
          smtp_encryption?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_username?: string
          updated_at?: string
        }
        Relationships: []
      }
      specialist_message_limits: {
        Row: {
          created_at: string | null
          id: string
          message_count: number | null
          specialist_id: string
          user_id: string
          window_date: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_count?: number | null
          specialist_id: string
          user_id: string
          window_date?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_count?: number | null
          specialist_id?: string
          user_id?: string
          window_date?: string | null
        }
        Relationships: []
      }
      specialist_messaging_blocks: {
        Row: {
          blocked_by: string
          created_at: string | null
          id: string
          reason: string | null
          specialist_id: string
        }
        Insert: {
          blocked_by: string
          created_at?: string | null
          id?: string
          reason?: string | null
          specialist_id: string
        }
        Update: {
          blocked_by?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          specialist_id?: string
        }
        Relationships: []
      }
      specialist_search_settings: {
        Row: {
          allow_messaging: boolean
          created_at: string
          id: string
          integrate_with_team_contacts: boolean
          is_enabled: boolean
          max_messages_per_day: number | null
          max_messages_per_specialist_per_day: number | null
          max_results: number
          messaging_enabled_for_clients: boolean
          messaging_enabled_for_partners: boolean
          messaging_enabled_for_specjalista: boolean
          show_address_to_clients: boolean
          show_address_to_partners: boolean
          show_address_to_specjalista: boolean
          show_email_to_clients: boolean
          show_email_to_partners: boolean
          show_email_to_specjalista: boolean
          show_phone_to_clients: boolean
          show_phone_to_partners: boolean
          show_phone_to_specjalista: boolean
          updated_at: string
          visible_to_anonymous: boolean
          visible_to_clients: boolean
          visible_to_partners: boolean
          visible_to_specjalista: boolean
        }
        Insert: {
          allow_messaging?: boolean
          created_at?: string
          id?: string
          integrate_with_team_contacts?: boolean
          is_enabled?: boolean
          max_messages_per_day?: number | null
          max_messages_per_specialist_per_day?: number | null
          max_results?: number
          messaging_enabled_for_clients?: boolean
          messaging_enabled_for_partners?: boolean
          messaging_enabled_for_specjalista?: boolean
          show_address_to_clients?: boolean
          show_address_to_partners?: boolean
          show_address_to_specjalista?: boolean
          show_email_to_clients?: boolean
          show_email_to_partners?: boolean
          show_email_to_specjalista?: boolean
          show_phone_to_clients?: boolean
          show_phone_to_partners?: boolean
          show_phone_to_specjalista?: boolean
          updated_at?: string
          visible_to_anonymous?: boolean
          visible_to_clients?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
        }
        Update: {
          allow_messaging?: boolean
          created_at?: string
          id?: string
          integrate_with_team_contacts?: boolean
          is_enabled?: boolean
          max_messages_per_day?: number | null
          max_messages_per_specialist_per_day?: number | null
          max_results?: number
          messaging_enabled_for_clients?: boolean
          messaging_enabled_for_partners?: boolean
          messaging_enabled_for_specjalista?: boolean
          show_address_to_clients?: boolean
          show_address_to_partners?: boolean
          show_address_to_specjalista?: boolean
          show_email_to_clients?: boolean
          show_email_to_partners?: boolean
          show_email_to_specjalista?: boolean
          show_phone_to_clients?: boolean
          show_phone_to_partners?: boolean
          show_phone_to_specjalista?: boolean
          updated_at?: string
          visible_to_anonymous?: boolean
          visible_to_clients?: boolean
          visible_to_partners?: boolean
          visible_to_specjalista?: boolean
        }
        Relationships: []
      }
      support_settings: {
        Row: {
          cards_order: Json | null
          created_at: string | null
          email_address: string | null
          email_field_label: string | null
          email_icon: string | null
          email_label: string | null
          email_label_visible: boolean | null
          email_placeholder: string | null
          error_message: string | null
          form_title: string | null
          header_description: string | null
          header_title: string | null
          id: string
          info_box_content: string | null
          info_box_icon: string | null
          info_box_title: string | null
          is_active: boolean | null
          message_label: string | null
          message_placeholder: string | null
          name_label: string | null
          name_placeholder: string | null
          phone_icon: string | null
          phone_label: string | null
          phone_label_visible: boolean | null
          phone_number: string | null
          subject_label: string | null
          subject_placeholder: string | null
          submit_button_text: string | null
          success_message: string | null
          updated_at: string | null
          working_hours: string | null
          working_hours_icon: string | null
          working_hours_label: string | null
          working_hours_label_visible: boolean | null
        }
        Insert: {
          cards_order?: Json | null
          created_at?: string | null
          email_address?: string | null
          email_field_label?: string | null
          email_icon?: string | null
          email_label?: string | null
          email_label_visible?: boolean | null
          email_placeholder?: string | null
          error_message?: string | null
          form_title?: string | null
          header_description?: string | null
          header_title?: string | null
          id?: string
          info_box_content?: string | null
          info_box_icon?: string | null
          info_box_title?: string | null
          is_active?: boolean | null
          message_label?: string | null
          message_placeholder?: string | null
          name_label?: string | null
          name_placeholder?: string | null
          phone_icon?: string | null
          phone_label?: string | null
          phone_label_visible?: boolean | null
          phone_number?: string | null
          subject_label?: string | null
          subject_placeholder?: string | null
          submit_button_text?: string | null
          success_message?: string | null
          updated_at?: string | null
          working_hours?: string | null
          working_hours_icon?: string | null
          working_hours_label?: string | null
          working_hours_label_visible?: boolean | null
        }
        Update: {
          cards_order?: Json | null
          created_at?: string | null
          email_address?: string | null
          email_field_label?: string | null
          email_icon?: string | null
          email_label?: string | null
          email_label_visible?: boolean | null
          email_placeholder?: string | null
          error_message?: string | null
          form_title?: string | null
          header_description?: string | null
          header_title?: string | null
          id?: string
          info_box_content?: string | null
          info_box_icon?: string | null
          info_box_title?: string | null
          is_active?: boolean | null
          message_label?: string | null
          message_placeholder?: string | null
          name_label?: string | null
          name_placeholder?: string | null
          phone_icon?: string | null
          phone_label?: string | null
          phone_label_visible?: boolean | null
          phone_number?: string | null
          subject_label?: string | null
          subject_placeholder?: string | null
          submit_button_text?: string | null
          success_message?: string | null
          updated_at?: string | null
          working_hours?: string | null
          working_hours_icon?: string | null
          working_hours_label?: string | null
          working_hours_label_visible?: boolean | null
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
      team_contacts: {
        Row: {
          added_at: string | null
          address: string | null
          client_status: string | null
          collaboration_level: string | null
          contact_type: string
          contact_upline_eq_id: string | null
          contact_upline_first_name: string | null
          contact_upline_last_name: string | null
          created_at: string | null
          email: string | null
          eq_id: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          linked_user_deleted_at: string | null
          linked_user_id: string | null
          next_contact_date: string | null
          notes: string | null
          partner_status: string | null
          phone_number: string | null
          products: string | null
          profession: string | null
          purchase_date: string | null
          purchased_product: string | null
          relationship_status: string | null
          reminder_date: string | null
          reminder_note: string | null
          reminder_sent: boolean | null
          role: string
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          address?: string | null
          client_status?: string | null
          collaboration_level?: string | null
          contact_type?: string
          contact_upline_eq_id?: string | null
          contact_upline_first_name?: string | null
          contact_upline_last_name?: string | null
          created_at?: string | null
          email?: string | null
          eq_id?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          linked_user_deleted_at?: string | null
          linked_user_id?: string | null
          next_contact_date?: string | null
          notes?: string | null
          partner_status?: string | null
          phone_number?: string | null
          products?: string | null
          profession?: string | null
          purchase_date?: string | null
          purchased_product?: string | null
          relationship_status?: string | null
          reminder_date?: string | null
          reminder_note?: string | null
          reminder_sent?: boolean | null
          role: string
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          address?: string | null
          client_status?: string | null
          collaboration_level?: string | null
          contact_type?: string
          contact_upline_eq_id?: string | null
          contact_upline_first_name?: string | null
          contact_upline_last_name?: string | null
          created_at?: string | null
          email?: string | null
          eq_id?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          linked_user_deleted_at?: string | null
          linked_user_id?: string | null
          next_contact_date?: string | null
          notes?: string | null
          partner_status?: string | null
          phone_number?: string | null
          products?: string | null
          profession?: string | null
          purchase_date?: string | null
          purchased_product?: string | null
          relationship_status?: string | null
          reminder_date?: string | null
          reminder_note?: string | null
          reminder_sent?: boolean | null
          role?: string
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_contacts_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      team_contacts_history: {
        Row: {
          change_type: string
          changed_by: string
          contact_id: string
          created_at: string | null
          id: string
          new_values: Json | null
          previous_values: Json | null
        }
        Insert: {
          change_type: string
          changed_by: string
          contact_id: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          previous_values?: Json | null
        }
        Update: {
          change_type?: string
          changed_by?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          previous_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "team_contacts_history_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "team_contacts"
            referencedColumns: ["id"]
          },
        ]
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
          action_buttons: Json | null
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
          video_duration_seconds: number | null
        }
        Insert: {
          action_buttons?: Json | null
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
          video_duration_seconds?: number | null
        }
        Update: {
          action_buttons?: Json | null
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
          video_duration_seconds?: number | null
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
          resource_ids: string[] | null
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
          resource_ids?: string[] | null
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
          resource_ids?: string[] | null
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
          video_position_seconds: number | null
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
          video_position_seconds?: number | null
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
          video_position_seconds?: number | null
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
      translation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          errors: number | null
          id: string
          job_type: string | null
          mode: string
          page_id: string | null
          processed_keys: number | null
          source_language: string
          status: string
          target_language: string
          total_keys: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          errors?: number | null
          id?: string
          job_type?: string | null
          mode?: string
          page_id?: string | null
          processed_keys?: number | null
          source_language: string
          status?: string
          target_language: string
          total_keys?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          errors?: number | null
          id?: string
          job_type?: string | null
          mode?: string
          page_id?: string | null
          processed_keys?: number | null
          source_language?: string
          status?: string
          target_language?: string
          total_keys?: number | null
          updated_at?: string
        }
        Relationships: []
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
      user_dismissed_banners: {
        Row: {
          banner_id: string
          dismissed_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          banner_id: string
          dismissed_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          banner_id?: string
          dismissed_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dismissed_banners_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "important_info_banners"
            referencedColumns: ["id"]
          },
        ]
      }
      user_google_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string | null
          event_type_id: string | null
          id: string
          is_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type_id?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type_id?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "notification_event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          related_contact_id: string | null
          sender_id: string | null
          source_module: string
          target_role: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          metadata?: Json | null
          notification_type: string
          read_at?: string | null
          related_contact_id?: string | null
          sender_id?: string | null
          source_module: string
          target_role?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          related_contact_id?: string | null
          sender_id?: string | null
          source_module?: string
          target_role?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_related_contact_id_fkey"
            columns: ["related_contact_id"]
            isOneToOne: false
            referencedRelation: "team_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reflinks: {
        Row: {
          click_count: number
          created_at: string
          creator_user_id: string
          expires_at: string
          id: string
          is_active: boolean
          reflink_code: string
          registration_count: number
          target_role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          creator_user_id: string
          expires_at?: string
          id?: string
          is_active?: boolean
          reflink_code: string
          registration_count?: number
          target_role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          click_count?: number
          created_at?: string
          creator_user_id?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          reflink_code?: string
          registration_count?: number
          target_role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reflinks_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
      user_signal_preferences: {
        Row: {
          created_at: string | null
          id: string
          last_signal_id: string | null
          last_signal_shown_at: string | null
          show_daily_signal: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_signal_id?: string | null
          last_signal_shown_at?: string | null
          show_daily_signal?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_signal_id?: string | null
          last_signal_shown_at?: string | null
          show_daily_signal?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_signal_preferences_last_signal_id_fkey"
            columns: ["last_signal_id"]
            isOneToOne: false
            referencedRelation: "daily_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_integration_settings: {
        Row: {
          api_status: string | null
          created_at: string | null
          default_auto_recording: string | null
          default_host_email: string | null
          default_mute_on_entry: boolean | null
          default_waiting_room: boolean | null
          id: string
          is_configured: boolean | null
          last_api_check_at: string | null
          updated_at: string | null
        }
        Insert: {
          api_status?: string | null
          created_at?: string | null
          default_auto_recording?: string | null
          default_host_email?: string | null
          default_mute_on_entry?: boolean | null
          default_waiting_room?: boolean | null
          id?: string
          is_configured?: boolean | null
          last_api_check_at?: string | null
          updated_at?: string | null
        }
        Update: {
          api_status?: string | null
          created_at?: string | null
          default_auto_recording?: string | null
          default_host_email?: string | null
          default_mute_on_entry?: boolean | null
          default_waiting_room?: boolean | null
          id?: string
          is_configured?: boolean | null
          last_api_check_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_approve_user:
        | { Args: { target_user_id: string }; Returns: boolean }
        | {
            Args: { bypass_guardian?: boolean; target_user_id: string }
            Returns: boolean
          }
      admin_change_user_guardian: {
        Args: {
          p_new_guardian_eq_id: string
          p_new_guardian_first_name: string
          p_new_guardian_last_name: string
          p_new_guardian_user_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      admin_confirm_user_email: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      admin_remove_row: { Args: { row_id: string }; Returns: boolean }
      admin_toggle_user_status: {
        Args: { new_status: boolean; target_user_id: string }
        Returns: boolean
      }
      admin_update_user_data: {
        Args: {
          p_eq_id: string
          p_first_name: string
          p_last_name: string
          p_user_id: string
        }
        Returns: boolean
      }
      admin_update_user_role: {
        Args: { target_role: string; target_user_id: string }
        Returns: boolean
      }
      can_send_to_role: {
        Args: { sender_role: string; target_role: string }
        Returns: boolean
      }
      check_is_admin_for_events: { Args: never; Returns: boolean }
      debug_user_access: {
        Args: never
        Returns: {
          current_user_id: string
          has_profile: boolean
          user_role: string
        }[]
      }
      email_exists: { Args: { email_param: string }; Returns: boolean }
      eq_id_exists: { Args: { eq_id_param: string }; Returns: boolean }
      generate_user_reflink_code: { Args: { p_eq_id: string }; Returns: string }
      get_current_user_eq_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_event_host_user_id: { Args: { p_event_id: string }; Returns: string }
      get_reflink_validity_days: { Args: never; Returns: number }
      get_retryable_failed_emails: {
        Args: never
        Returns: {
          email_type: string
          id: string
          metadata: Json
          recipient_email: string
          recipient_user_id: string
          retry_count: number
          subject: string
          template_id: string
        }[]
      }
      get_role_level: { Args: { role_name: string }; Returns: number }
      get_training_assignments_without_notification: {
        Args: never
        Returns: {
          assigned_at: string
          assignment_id: string
          module_id: string
          module_title: string
          user_email: string
          user_first_name: string
          user_id: string
        }[]
      }
      get_user_profiles_with_confirmation: {
        Args: never
        Returns: {
          admin_approved_at: string
          city: string
          country: string
          created_at: string
          email: string
          email_activated: boolean
          email_activated_at: string
          email_confirmed_at: string
          eq_id: string
          first_name: string
          guardian_approved: boolean
          guardian_approved_at: string
          id: string
          is_active: boolean
          is_approved: boolean
          last_name: string
          last_sign_in_at: string
          phone_number: string
          postal_code: string
          profile_description: string
          role: string
          specialization: string
          street_address: string
          upline_eq_id: string
          upline_first_name: string
          upline_last_name: string
        }[]
      }
      get_user_role_name: { Args: { user_uuid: string }; Returns: string }
      get_users_without_welcome_email: {
        Args: never
        Returns: {
          email: string
          first_name: string
          last_name: string
          role: string
          user_id: string
        }[]
      }
      guardian_approve_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      guardian_reject_user: {
        Args: { rejection_reason?: string; target_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_leader: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_current_user_leader: { Args: never; Returns: boolean }
      is_role_update: {
        Args: { new_role: string; user_id_param: string }
        Returns: boolean
      }
      is_thread_participant: { Args: { thread_uuid: string }; Returns: boolean }
      search_guardians: {
        Args: { search_query: string }
        Returns: {
          email: string
          eq_id: string
          first_name: string
          last_name: string
          role: string
          user_id: string
        }[]
      }
      set_default_certificate_template: {
        Args: { template_id: string }
        Returns: undefined
      }
      user_registered_event_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "partner" | "client" | "specjalista" | "user"
      resource_status: "active" | "draft" | "archived"
      resource_type: "pdf" | "doc" | "zip" | "form" | "link" | "page" | "image"
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
      resource_type: ["pdf", "doc", "zip", "form", "link", "page", "image"],
    },
  },
} as const
