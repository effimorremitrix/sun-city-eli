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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_usage_events: {
        Row: {
          cost_usd: number
          created_at: string
          error_message: string | null
          feature: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          status: string
          user_id: string | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          error_message?: string | null
          feature?: string
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          status?: string
          user_id?: string | null
        }
        Update: {
          cost_usd?: number
          created_at?: string
          error_message?: string | null
          feature?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      facebook_connections: {
        Row: {
          ad_account_id: string | null
          connected_at: string
          connected_by: string | null
          page_access_token: string
          page_id: string
          page_name: string
          site_id: string
        }
        Insert: {
          ad_account_id?: string | null
          connected_at?: string
          connected_by?: string | null
          page_access_token: string
          page_id: string
          page_name: string
          site_id: string
        }
        Update: {
          ad_account_id?: string | null
          connected_at?: string
          connected_by?: string | null
          page_access_token?: string
          page_id?: string
          page_name?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_connections_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          site_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          site_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          site_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_groups_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          created_at: string
          external_url: string | null
          id: string
          listing_id: string
          sort_order: number
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          id?: string
          listing_id: string
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_url?: string | null
          id?: string
          listing_id?: string
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_notifications: {
        Row: {
          created_at: string
          email_sent_at: string | null
          id: string
          listing_id: string
          read_at: string | null
          reason: string | null
          search_profile_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_sent_at?: string | null
          id?: string
          listing_id: string
          read_at?: string | null
          reason?: string | null
          search_profile_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_sent_at?: string | null
          id?: string
          listing_id?: string
          read_at?: string | null
          reason?: string | null
          search_profile_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_notifications_search_profile_id_fkey"
            columns: ["search_profile_id"]
            isOneToOne: false
            referencedRelation: "search_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_posts: {
        Row: {
          created_at: string
          created_by: string | null
          error: string | null
          fb_campaign_id: string | null
          fb_post_id: string | null
          id: string
          listing_id: string
          status: string
          target: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          fb_campaign_id?: string | null
          fb_post_id?: string | null
          id?: string
          listing_id: string
          status?: string
          target: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          fb_campaign_id?: string | null
          fb_post_id?: string | null
          id?: string
          listing_id?: string
          status?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_posts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_translations: {
        Row: {
          description: string | null
          lang: string
          listing_id: string
          source_hash: string
          title: string
          translated_at: string
        }
        Insert: {
          description?: string | null
          lang: string
          listing_id: string
          source_hash: string
          title: string
          translated_at?: string
        }
        Update: {
          description?: string | null
          lang?: string
          listing_id?: string
          source_hash?: string
          title?: string
          translated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_translations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string | null
          city: string
          created_at: string
          deal_type: string
          description: string | null
          floor: string | null
          has_balcony: boolean
          has_elevator: boolean
          has_mamad: boolean
          has_parking: boolean
          id: string
          image_key: string | null
          image_url: string | null
          is_published: boolean
          neighborhood: string | null
          post_copy: Json | null
          price: number | null
          published_at: string
          rooms: number | null
          site_id: string | null
          size_sqm: number | null
          sort_order: number
          tag: string | null
          title: string
          translations: Json
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string
          created_at?: string
          deal_type?: string
          description?: string | null
          floor?: string | null
          has_balcony?: boolean
          has_elevator?: boolean
          has_mamad?: boolean
          has_parking?: boolean
          id?: string
          image_key?: string | null
          image_url?: string | null
          is_published?: boolean
          neighborhood?: string | null
          post_copy?: Json | null
          price?: number | null
          published_at?: string
          rooms?: number | null
          site_id?: string | null
          size_sqm?: number | null
          sort_order?: number
          tag?: string | null
          title: string
          translations?: Json
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          deal_type?: string
          description?: string | null
          floor?: string | null
          has_balcony?: boolean
          has_elevator?: boolean
          has_mamad?: boolean
          has_parking?: boolean
          id?: string
          image_key?: string | null
          image_url?: string | null
          is_published?: boolean
          neighborhood?: string | null
          post_copy?: Json | null
          price?: number | null
          published_at?: string
          rooms?: number | null
          site_id?: string | null
          size_sqm?: number | null
          sort_order?: number
          tag?: string | null
          title?: string
          translations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      scout_candidates: {
        Row: {
          address: string | null
          created_at: string
          created_listing_id: string | null
          deal_type: string | null
          id: string
          match_reason: string | null
          match_score: number
          neighborhood: string | null
          price: number | null
          raw_summary: string | null
          rooms: number | null
          scout_profile_id: string | null
          seen_at: string | null
          size_sqm: number | null
          source_site: string
          source_url: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_listing_id?: string | null
          deal_type?: string | null
          id?: string
          match_reason?: string | null
          match_score?: number
          neighborhood?: string | null
          price?: number | null
          raw_summary?: string | null
          rooms?: number | null
          scout_profile_id?: string | null
          seen_at?: string | null
          size_sqm?: number | null
          source_site: string
          source_url: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_listing_id?: string | null
          deal_type?: string | null
          id?: string
          match_reason?: string | null
          match_score?: number
          neighborhood?: string | null
          price?: number | null
          raw_summary?: string | null
          rooms?: number | null
          scout_profile_id?: string | null
          seen_at?: string | null
          size_sqm?: number | null
          source_site?: string
          source_url?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_candidates_created_listing_id_fkey"
            columns: ["created_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_candidates_scout_profile_id_fkey"
            columns: ["scout_profile_id"]
            isOneToOne: false
            referencedRelation: "scout_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_profiles: {
        Row: {
          city: string
          created_at: string
          deal_type: string
          id: string
          is_active: boolean
          label: string
          last_run_at: string | null
          max_price: number | null
          min_price: number | null
          min_rooms: number | null
          min_size: number | null
          needs_balcony: boolean
          needs_elevator: boolean
          needs_mamad: boolean
          needs_parking: boolean
          neighborhoods: string[]
          notes: string | null
          sources: string[]
          updated_at: string
        }
        Insert: {
          city?: string
          created_at?: string
          deal_type?: string
          id?: string
          is_active?: boolean
          label?: string
          last_run_at?: string | null
          max_price?: number | null
          min_price?: number | null
          min_rooms?: number | null
          min_size?: number | null
          needs_balcony?: boolean
          needs_elevator?: boolean
          needs_mamad?: boolean
          needs_parking?: boolean
          neighborhoods?: string[]
          notes?: string | null
          sources?: string[]
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          deal_type?: string
          id?: string
          is_active?: boolean
          label?: string
          last_run_at?: string | null
          max_price?: number | null
          min_price?: number | null
          min_rooms?: number | null
          min_size?: number | null
          needs_balcony?: boolean
          needs_elevator?: boolean
          needs_mamad?: boolean
          needs_parking?: boolean
          neighborhoods?: string[]
          notes?: string | null
          sources?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      search_profiles: {
        Row: {
          city: string
          created_at: string
          deal_type: string
          id: string
          is_active: boolean
          label: string
          max_price: number | null
          min_price: number | null
          min_rooms: number | null
          min_size: number | null
          needs_balcony: boolean
          needs_elevator: boolean
          needs_mamad: boolean
          needs_parking: boolean
          neighborhoods: string[]
          notes: string | null
          notify_email: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string
          created_at?: string
          deal_type?: string
          id?: string
          is_active?: boolean
          label?: string
          max_price?: number | null
          min_price?: number | null
          min_rooms?: number | null
          min_size?: number | null
          needs_balcony?: boolean
          needs_elevator?: boolean
          needs_mamad?: boolean
          needs_parking?: boolean
          neighborhoods?: string[]
          notes?: string | null
          notify_email?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          deal_type?: string
          id?: string
          is_active?: boolean
          label?: string
          max_price?: number | null
          min_price?: number | null
          min_rooms?: number | null
          min_size?: number | null
          needs_balcony?: boolean
          needs_elevator?: boolean
          needs_mamad?: boolean
          needs_parking?: boolean
          neighborhoods?: string[]
          notes?: string | null
          notify_email?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          business: Json
          hours: Json
          images: Json
          settings: Json
          site_id: string
          texts: Json
          translations: Json
          updated_at: string
        }
        Insert: {
          business?: Json
          hours?: Json
          images?: Json
          settings?: Json
          site_id: string
          texts?: Json
          translations?: Json
          updated_at?: string
        }
        Update: {
          business?: Json
          hours?: Json
          images?: Json
          settings?: Json
          site_id?: string
          texts?: Json
          translations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_content_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          kind: string
          price: number | null
          price_note: string | null
          site_id: string
          sort_order: number
          title: string
          translations: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          price?: number | null
          price_note?: string | null
          site_id: string
          sort_order?: number
          title: string
          translations?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          price?: number | null
          price_note?: string | null
          site_id?: string
          sort_order?: number
          title?: string
          translations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_items_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_id: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      sold_properties: {
        Row: {
          address: string
          created_at: string
          id: string
          image_url: string | null
          is_published: boolean
          neighborhood: string | null
          note: string | null
          site_id: string
          sold_at: string | null
          sort_order: number
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          neighborhood?: string | null
          note?: string | null
          site_id: string
          sold_at?: string | null
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          neighborhood?: string | null
          note?: string | null
          site_id?: string
          sold_at?: string | null
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sold_properties_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      get_public_agents: { Args: never; Returns: Json }
      get_public_site: { Args: { p_slug: string }; Returns: Json }
      get_site_id: { Args: { p_slug: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_site_manager: { Args: never; Returns: boolean }
      match_listing_to_profiles: {
        Args: { p_listing_id: string }
        Returns: number
      }
      owns_listing: { Args: { _listing_id: string }; Returns: boolean }
      owns_site: { Args: { _site_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "client" | "agent" | "super_admin"
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
      app_role: ["admin", "client", "agent", "super_admin"],
    },
  },
} as const
