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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          actor_user_id: string | null
          channel: string | null
          contact_id: string | null
          created_at: string
          error: string | null
          event: string
          id: number
          kind: string
          lead_id: string | null
          listing_id: string | null
          market_listing_id: string | null
          message: string | null
          metadata: Json
          recipient: string | null
          site_id: string | null
          status: string
        }
        Insert: {
          actor_user_id?: string | null
          channel?: string | null
          contact_id?: string | null
          created_at?: string
          error?: string | null
          event: string
          id?: number
          kind: string
          lead_id?: string | null
          listing_id?: string | null
          market_listing_id?: string | null
          message?: string | null
          metadata?: Json
          recipient?: string | null
          site_id?: string | null
          status?: string
        }
        Update: {
          actor_user_id?: string | null
          channel?: string | null
          contact_id?: string | null
          created_at?: string
          error?: string | null
          event?: string
          id?: number
          kind?: string
          lead_id?: string | null
          listing_id?: string | null
          market_listing_id?: string | null
          message?: string | null
          metadata?: Json
          recipient?: string | null
          site_id?: string | null
          status?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          data: Json
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          data?: Json
          id: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          data?: Json
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      blocked_keys: {
        Row: {
          created_at: string
          hits: number
          key: string
          reason: string | null
          until: string
        }
        Insert: {
          created_at?: string
          hits?: number
          key: string
          reason?: string | null
          until: string
        }
        Update: {
          created_at?: string
          hits?: number
          key?: string
          reason?: string | null
          until?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_site_id: string | null
          consent_at: string | null
          created_at: string
          email: string | null
          first_landing_path: string | null
          first_referrer: string | null
          first_site_id: string | null
          first_source: string | null
          first_utm_campaign: string | null
          first_utm_content: string | null
          first_utm_source: string | null
          full_name: string | null
          id: string
          marketing_consent: boolean
          notes: string | null
          phone_normalized: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_site_id?: string | null
          consent_at?: string | null
          created_at?: string
          email?: string | null
          first_landing_path?: string | null
          first_referrer?: string | null
          first_site_id?: string | null
          first_source?: string | null
          first_utm_campaign?: string | null
          first_utm_content?: string | null
          first_utm_source?: string | null
          full_name?: string | null
          id?: string
          marketing_consent?: boolean
          notes?: string | null
          phone_normalized?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_site_id?: string | null
          consent_at?: string | null
          created_at?: string
          email?: string | null
          first_landing_path?: string | null
          first_referrer?: string | null
          first_site_id?: string | null
          first_source?: string | null
          first_utm_campaign?: string | null
          first_utm_content?: string | null
          first_utm_source?: string | null
          full_name?: string | null
          id?: string
          marketing_consent?: boolean
          notes?: string | null
          phone_normalized?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      job_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: number
          job: string
          started_at: string
          status: string
          summary: Json
          trigger: string | null
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: number
          job: string
          started_at?: string
          status?: string
          summary?: Json
          trigger?: string | null
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: number
          job?: string
          started_at?: string
          status?: string
          summary?: Json
          trigger?: string | null
        }
        Relationships: []
      }
      market_listings: {
        Row: {
          address: string | null
          city: string
          created_at: string
          created_listing_id: string | null
          deal_type: string
          description: string | null
          external_id: string | null
          first_seen_at: string
          floor: string | null
          has_balcony: boolean | null
          has_elevator: boolean | null
          has_mamad: boolean | null
          has_parking: boolean | null
          hidden_by_admin: boolean
          id: string
          image_url: string | null
          is_active: boolean
          last_seen_at: string
          match_score: number | null
          neighborhood: string | null
          price: number | null
          raw: Json
          rooms: number | null
          size_sqm: number | null
          source: string
          source_site: string | null
          source_url: string
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string
          created_at?: string
          created_listing_id?: string | null
          deal_type?: string
          description?: string | null
          external_id?: string | null
          first_seen_at?: string
          floor?: string | null
          has_balcony?: boolean | null
          has_elevator?: boolean | null
          has_mamad?: boolean | null
          has_parking?: boolean | null
          hidden_by_admin?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          last_seen_at?: string
          match_score?: number | null
          neighborhood?: string | null
          price?: number | null
          raw?: Json
          rooms?: number | null
          size_sqm?: number | null
          source: string
          source_site?: string | null
          source_url: string
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          created_listing_id?: string | null
          deal_type?: string
          description?: string | null
          external_id?: string | null
          first_seen_at?: string
          floor?: string | null
          has_balcony?: boolean | null
          has_elevator?: boolean | null
          has_mamad?: boolean | null
          has_parking?: boolean | null
          hidden_by_admin?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          last_seen_at?: string
          match_score?: number | null
          neighborhood?: string | null
          price?: number | null
          raw?: Json
          rooms?: number | null
          size_sqm?: number | null
          source?: string
          source_site?: string | null
          source_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_scan_tasks: {
        Row: {
          deal_type: string
          demand: number
          key: string
          last_error: string | null
          last_found: number | null
          last_scanned_at: string | null
          neighborhood: string
          updated_at: string
        }
        Insert: {
          deal_type: string
          demand?: number
          key: string
          last_error?: string | null
          last_found?: number | null
          last_scanned_at?: string | null
          neighborhood: string
          updated_at?: string
        }
        Update: {
          deal_type?: string
          demand?: number
          key?: string
          last_error?: string | null
          last_found?: number | null
          last_scanned_at?: string | null
          neighborhood?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
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
          ig_user_id: string | null
          page_access_token: string
          page_id: string
          page_name: string
          site_id: string
        }
        Insert: {
          ad_account_id?: string | null
          connected_at?: string
          connected_by?: string | null
          ig_user_id?: string | null
          page_access_token: string
          page_id: string
          page_name: string
          site_id: string
        }
        Update: {
          ad_account_id?: string | null
          connected_at?: string
          connected_by?: string | null
          ig_user_id?: string | null
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
      lead_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          lead_id: string
          listing_id: string | null
          metadata: Json
          note: string | null
          site_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          lead_id: string
          listing_id?: string | null
          metadata?: Json
          note?: string | null
          site_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string
          listing_id?: string | null
          metadata?: Json
          note?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          contact_id: string | null
          utm_source: string | null
          utm_campaign: string | null
          utm_content: string | null
          referrer: string | null
          landing_path: string | null
          session_hash: string | null
          reassigned_from_site_id: string | null
          buy_categories: string[]
          city: string | null
          consent_at: string | null
          created_at: string
          created_by: string | null
          criteria_extra: Json | null
          deal_type: string | null
          email: string | null
          full_name: string
          id: string
          listing_id: string | null
          marketing_consent: boolean
          max_floor: number | null
          max_price: number | null
          max_rooms: number | null
          min_floor: number | null
          min_price: number | null
          min_rooms: number | null
          min_size: number | null
          needs_balcony: boolean
          needs_elevator: boolean
          needs_mamad: boolean
          needs_parking: boolean
          neighborhoods: string[]
          next_action: string | null
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          phone_normalized: string | null
          property_type: string | null
          reminder_email_sent_at: string | null
          reminder_whatsapp_sent_at: string | null
          score: number | null
          search_profile_id: string | null
          sell_categories: string[]
          site_id: string
          source: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          utm_source?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          referrer?: string | null
          landing_path?: string | null
          session_hash?: string | null
          reassigned_from_site_id?: string | null
          buy_categories?: string[]
          city?: string | null
          consent_at?: string | null
          created_at?: string
          created_by?: string | null
          criteria_extra?: Json | null
          deal_type?: string | null
          email?: string | null
          full_name: string
          id?: string
          listing_id?: string | null
          marketing_consent?: boolean
          max_floor?: number | null
          max_price?: number | null
          max_rooms?: number | null
          min_floor?: number | null
          min_price?: number | null
          min_rooms?: number | null
          min_size?: number | null
          needs_balcony?: boolean
          needs_elevator?: boolean
          needs_mamad?: boolean
          needs_parking?: boolean
          neighborhoods?: string[]
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          phone_normalized?: string | null
          property_type?: string | null
          reminder_email_sent_at?: string | null
          reminder_whatsapp_sent_at?: string | null
          score?: number | null
          search_profile_id?: string | null
          sell_categories?: string[]
          site_id: string
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          utm_source?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          referrer?: string | null
          landing_path?: string | null
          session_hash?: string | null
          reassigned_from_site_id?: string | null
          buy_categories?: string[]
          city?: string | null
          consent_at?: string | null
          created_at?: string
          created_by?: string | null
          criteria_extra?: Json | null
          deal_type?: string | null
          email?: string | null
          full_name?: string
          id?: string
          listing_id?: string | null
          marketing_consent?: boolean
          max_floor?: number | null
          max_price?: number | null
          max_rooms?: number | null
          min_floor?: number | null
          min_price?: number | null
          min_rooms?: number | null
          min_size?: number | null
          needs_balcony?: boolean
          needs_elevator?: boolean
          needs_mamad?: boolean
          needs_parking?: boolean
          neighborhoods?: string[]
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          phone_normalized?: string | null
          property_type?: string | null
          reminder_email_sent_at?: string | null
          reminder_whatsapp_sent_at?: string | null
          score?: number | null
          search_profile_id?: string | null
          sell_categories?: string[]
          site_id?: string
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_search_profile_id_fkey"
            columns: ["search_profile_id"]
            isOneToOne: false
            referencedRelation: "search_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_feedback: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          listing_id: string
          reaction: string
          site_id: string | null
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          listing_id: string
          reaction: string
          site_id?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          listing_id?: string
          reaction?: string
          site_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_feedback_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_feedback_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_feedback_site_id_fkey"
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
          kind: string
          listing_id: string
          sort_order: number
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          id?: string
          kind?: string
          listing_id: string
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_url?: string | null
          id?: string
          kind?: string
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
          contact_id: string | null
          market_listing_id: string | null
          created_at: string
          email_sent_at: string | null
          error: string | null
          id: string
          lead_id: string | null
          listing_id: string | null
          read_at: string | null
          reason: string | null
          response: string | null
          response_at: string | null
          search_profile_id: string | null
          updated_at: string
          user_id: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          contact_id?: string | null
          market_listing_id?: string | null
          created_at?: string
          email_sent_at?: string | null
          error?: string | null
          id?: string
          lead_id?: string | null
          listing_id: string | null
          read_at?: string | null
          reason?: string | null
          response?: string | null
          response_at?: string | null
          search_profile_id?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          contact_id?: string | null
          market_listing_id?: string | null
          created_at?: string
          email_sent_at?: string | null
          error?: string | null
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          read_at?: string | null
          reason?: string | null
          response?: string | null
          response_at?: string | null
          search_profile_id?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
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
          has_storage: boolean
          id: string
          image_key: string | null
          image_url: string | null
          is_published: boolean
          lat: number | null
          lng: number | null
          neighborhood: string | null
          parking_count: number | null
          post_copy: Json | null
          price: number | null
          published_at: string
          rooms: number | null
          site_id: string | null
          size_sqm: number | null
          sort_order: number
          storage_count: number | null
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
          has_storage?: boolean
          id?: string
          image_key?: string | null
          image_url?: string | null
          is_published?: boolean
          lat?: number | null
          lng?: number | null
          neighborhood?: string | null
          parking_count?: number | null
          post_copy?: Json | null
          price?: number | null
          published_at?: string
          rooms?: number | null
          site_id?: string | null
          size_sqm?: number | null
          sort_order?: number
          storage_count?: number | null
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
          has_storage?: boolean
          id?: string
          image_key?: string | null
          image_url?: string | null
          is_published?: boolean
          lat?: number | null
          lng?: number | null
          neighborhood?: string | null
          parking_count?: number | null
          post_copy?: Json | null
          price?: number | null
          published_at?: string
          rooms?: number | null
          site_id?: string | null
          size_sqm?: number | null
          sort_order?: number
          storage_count?: number | null
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
      page_views: {
        Row: {
          created_at: string
          device: string | null
          id: number
          is_new_session: boolean
          lang: string | null
          path: string
          referrer: string | null
          session_hash: string
          site_id: string | null
          utm_campaign: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: never
          is_new_session?: boolean
          lang?: string | null
          path: string
          referrer?: string | null
          session_hash: string
          site_id?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: never
          is_new_session?: boolean
          lang?: string | null
          path?: string
          referrer?: string | null
          session_hash?: string
          site_id?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          consent_at: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          marketing_consent: boolean
        }
        Insert: {
          consent_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          marketing_consent?: boolean
        }
        Update: {
          consent_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          marketing_consent?: boolean
        }
        Relationships: []
      }
      scout_candidates: {
        Row: {
          address: string | null
          created_at: string
          created_listing_id: string | null
          deal_type: string | null
          has_balcony: boolean | null
          has_elevator: boolean | null
          has_mamad: boolean | null
          has_parking: boolean | null
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
          has_balcony?: boolean | null
          has_elevator?: boolean | null
          has_mamad?: boolean | null
          has_parking?: boolean | null
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
          has_balcony?: boolean | null
          has_elevator?: boolean | null
          has_mamad?: boolean | null
          has_parking?: boolean | null
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
          last_run_found: number | null
          last_run_inserted: number | null
          last_run_note: string | null
          last_run_skipped: number | null
          max_price: number | null
          max_rooms: number | null
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
          last_run_found?: number | null
          last_run_inserted?: number | null
          last_run_note?: string | null
          last_run_skipped?: number | null
          max_price?: number | null
          max_rooms?: number | null
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
          last_run_found?: number | null
          last_run_inserted?: number | null
          last_run_note?: string | null
          last_run_skipped?: number | null
          max_price?: number | null
          max_rooms?: number | null
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
          contact_id: string | null
          city: string
          created_at: string
          deal_type: string
          id: string
          is_active: boolean
          label: string
          max_price: number | null
          max_rooms: number | null
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
          notify_whatsapp: boolean
          rooms: number | null
          street: string | null
          updated_at: string
          user_id: string
          whatsapp_phone: string | null
        }
        Insert: {
          contact_id?: string | null
          city?: string
          created_at?: string
          deal_type?: string
          id?: string
          is_active?: boolean
          label?: string
          max_price?: number | null
          max_rooms?: number | null
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
          notify_whatsapp?: boolean
          rooms?: number | null
          street?: string | null
          updated_at?: string
          user_id: string
          whatsapp_phone?: string | null
        }
        Update: {
          contact_id?: string | null
          city?: string
          created_at?: string
          deal_type?: string
          id?: string
          is_active?: boolean
          label?: string
          max_price?: number | null
          max_rooms?: number | null
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
          notify_whatsapp?: boolean
          rooms?: number | null
          street?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      site_content: {
        Row: {
          business: Json
          faq: Json | null
          hours: Json
          images: Json
          settings: Json
          site_id: string
          testimonials: Json | null
          texts: Json
          translations: Json
          updated_at: string
        }
        Insert: {
          business?: Json
          faq?: Json | null
          hours?: Json
          images?: Json
          settings?: Json
          site_id: string
          testimonials?: Json | null
          texts?: Json
          translations?: Json
          updated_at?: string
        }
        Update: {
          business?: Json
          faq?: Json | null
          hours?: Json
          images?: Json
          settings?: Json
          site_id?: string
          testimonials?: Json | null
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
          notify_email: string | null
          notify_whatsapp: string | null
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
          notify_email?: string | null
          notify_whatsapp?: string | null
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
          notify_email?: string | null
          notify_whatsapp?: string | null
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
          translations: Json
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
          translations?: Json
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
          translations?: Json
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
      track_events: {
        Row: {
          created_at: string
          id: number
          listing_id: string | null
          path: string | null
          session_hash: string
          site_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: never
          listing_id?: string | null
          path?: string | null
          session_hash: string
          site_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: never
          listing_id?: string | null
          path?: string | null
          session_hash?: string
          site_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_events_site_id_fkey"
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
      can_view_contact: { Args: { _contact_id: string }; Returns: boolean }
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number; p_cost?: number }
        Returns: { allowed: boolean; remaining: number; current_count: number }[]
      }
      match_market_listings: {
        Args: { p_since: string; p_profile_id?: string | null }
        Returns: number
      }
      match_profile_to_listings: { Args: { p_profile_id: string }; Returns: number }
      prune_activity_log: { Args: never; Returns: undefined }
      run_scheduled_job: { Args: { p_job: string }; Returns: number }
      scheduler_status: { Args: never; Returns: Json }
      analytics_overview: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
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
      match_listing_to_leads: {
        Args: { p_listing_id: string }
        Returns: number
      }
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
