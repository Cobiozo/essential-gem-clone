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
      cms_items: {
        Row: {
          column_index: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          media_alt_text: string | null
          media_type: string | null
          media_url: string | null
          page_id: string | null
          position: number
          section_id: string | null
          text_formatting: Json | null
          title: string | null
          title_formatting: Json | null
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          column_index?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          media_alt_text?: string | null
          media_type?: string | null
          media_url?: string | null
          page_id?: string | null
          position?: number
          section_id?: string | null
          text_formatting?: Json | null
          title?: string | null
          title_formatting?: Json | null
          type: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          column_index?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          media_alt_text?: string | null
          media_type?: string | null
          media_url?: string | null
          page_id?: string | null
          position?: number
          section_id?: string | null
          text_formatting?: Json | null
          title?: string | null
          title_formatting?: Json | null
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
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
          page_id: string | null
          parent_id: string | null
          position: number
          row_column_count: number | null
          row_layout_type: string | null
          section_margin_bottom: number | null
          section_margin_top: number | null
          section_type: string | null
          show_icon: boolean | null
          style_class: string | null
          text_color: string | null
          text_transform: string | null
          title: string
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
          page_id?: string | null
          parent_id?: string | null
          position?: number
          row_column_count?: number | null
          row_layout_type?: string | null
          section_margin_bottom?: number | null
          section_margin_top?: number | null
          section_type?: string | null
          show_icon?: boolean | null
          style_class?: string | null
          text_color?: string | null
          text_transform?: string | null
          title: string
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
          page_id?: string | null
          parent_id?: string | null
          position?: number
          row_column_count?: number | null
          row_layout_type?: string | null
          section_margin_bottom?: number | null
          section_margin_top?: number | null
          section_type?: string | null
          show_icon?: boolean | null
          style_class?: string | null
          text_color?: string | null
          text_transform?: string | null
          title?: string
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
            foreignKeyName: "cms_sections_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cms_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      page_settings: {
        Row: {
          column_count: number | null
          created_at: string
          id: string
          layout_mode: string | null
          page_type: string
          updated_at: string
        }
        Insert: {
          column_count?: number | null
          created_at?: string
          id?: string
          layout_mode?: string | null
          page_type: string
          updated_at?: string
        }
        Update: {
          column_count?: number | null
          created_at?: string
          id?: string
          layout_mode?: string | null
          page_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_active: boolean
          is_published: boolean
          meta_description: string | null
          position: number
          slug: string
          title: string
          updated_at: string
          visible_to_clients: boolean
          visible_to_everyone: boolean
          visible_to_partners: boolean
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_published?: boolean
          meta_description?: string | null
          position?: number
          slug: string
          title: string
          updated_at?: string
          visible_to_clients?: boolean
          visible_to_everyone?: boolean
          visible_to_partners?: boolean
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_published?: boolean
          meta_description?: string | null
          position?: number
          slug?: string
          title?: string
          updated_at?: string
          visible_to_clients?: boolean
          visible_to_everyone?: boolean
          visible_to_partners?: boolean
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          model_url: string | null
          price: number | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          model_url?: string | null
          price?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          model_url?: string | null
          price?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          role: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
