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
          price: number | null
          published_at: string
          rooms: number | null
          size_sqm: number | null
          sort_order: number
          tag: string | null
          title: string
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
          price?: number | null
          published_at?: string
          rooms?: number | null
          size_sqm?: number | null
          sort_order?: number
          tag?: string | null
          title: string
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
          price?: number | null
          published_at?: string
          rooms?: number | null
          size_sqm?: number | null
          sort_order?: number
          tag?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          updated_at: string
        }
        Insert: {
          business?: Json
          hours?: Json
          images?: Json
          settings?: Json
          site_id: string
          texts?: Json
          updated_at?: string
        }
        Update: {
          business?: Json
          hours?: Json
          images?: Json
          settings?: Json
          site_id?: string
          texts?: Json
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
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
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
      get_public_site: { Args: { p_slug: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_listing_to_profiles: {
        Args: { p_listing_id: string }
        Returns: number
      }
      owns_site: { Args: { _site_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "client"
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
      app_role: ["admin", "client"],
    },
  },
} as const
