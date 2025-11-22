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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      app_notification_dismissals: {
        Row: {
          dismissed_at: string
          id: string
          notification_id: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          id?: string
          notification_id: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          id?: string
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_app_notification_dismissals_notification_id"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "app_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      app_notifications: {
        Row: {
          active: boolean
          created_at: string
          id: string
          message: string | null
          title: string
          type: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          message?: string | null
          title: string
          type?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          message?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      blog_post_views: {
        Row: {
          created_at: string
          id: string
          last_viewed_at: string
          post_id: string
          updated_at: string
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_viewed_at?: string
          post_id: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_viewed_at?: string
          post_id?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_blog_post_views_post_id"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string
          category: string | null
          content: string
          created_at: string
          created_by: string
          excerpt: string
          featured: boolean
          hero_image: string | null
          id: string
          publish_date: string
          read_time: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          category?: string | null
          content: string
          created_at?: string
          created_by: string
          excerpt: string
          featured?: boolean
          hero_image?: string | null
          id?: string
          publish_date?: string
          read_time?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string
          excerpt?: string
          featured?: boolean
          hero_image?: string | null
          id?: string
          publish_date?: string
          read_time?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blueprints: {
        Row: {
          ai_summaries: Json | null
          camera_plots: Json | null
          component_order: Json | null
          created_at: string
          crew_data: Json | null
          id: string
          lists: Json
          notes: string | null
          rundown_id: string
          rundown_title: string
          show_date: string | null
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summaries?: Json | null
          camera_plots?: Json | null
          component_order?: Json | null
          created_at?: string
          crew_data?: Json | null
          id?: string
          lists?: Json
          notes?: string | null
          rundown_id: string
          rundown_title: string
          show_date?: string | null
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summaries?: Json | null
          camera_plots?: Json | null
          component_order?: Json | null
          created_at?: string
          crew_data?: Json | null
          id?: string
          lists?: Json
          notes?: string | null
          rundown_id?: string
          rundown_title?: string
          show_date?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprints_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      column_layouts: {
        Row: {
          columns: Json
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          columns: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          columns?: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "column_layouts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      cue_logs: {
        Row: {
          endpoint_url: string | null
          error_message: string | null
          event_type: string
          id: string
          integration_id: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          response_time_ms: number | null
          rundown_id: string
          segment_id: string
          sent_at: string
          team_id: string
        }
        Insert: {
          endpoint_url?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          integration_id?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          rundown_id: string
          segment_id: string
          sent_at?: string
          team_id: string
        }
        Update: {
          endpoint_url?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          integration_id?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          rundown_id?: string
          segment_id?: string
          sent_at?: string
          team_id?: string
        }
        Relationships: []
      }
      mos_connection_status: {
        Row: {
          connected: boolean
          error_message: string | null
          last_heartbeat: string | null
          rundown_id: string
          team_id: string
          updated_at: string
          xpression_host: string | null
        }
        Insert: {
          connected?: boolean
          error_message?: string | null
          last_heartbeat?: string | null
          rundown_id: string
          team_id: string
          updated_at?: string
          xpression_host?: string | null
        }
        Update: {
          connected?: boolean
          error_message?: string | null
          last_heartbeat?: string | null
          rundown_id?: string
          team_id?: string
          updated_at?: string
          xpression_host?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mos_connection_status_rundown_id_fkey"
            columns: ["rundown_id"]
            isOneToOne: false
            referencedRelation: "rundowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mos_connection_status_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      mos_message_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_payload: Json
          message_type: string
          rundown_id: string | null
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_payload: Json
          message_type: string
          rundown_id?: string | null
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_payload?: Json
          message_type?: string
          rundown_id?: string | null
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mos_message_log_rundown_id_fkey"
            columns: ["rundown_id"]
            isOneToOne: false
            referencedRelation: "rundowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mos_message_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          profile_picture_url: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          profile_picture_url?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          profile_picture_url?: string | null
        }
        Relationships: []
      }
      rundown_folders: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          position: number
          team_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          position?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          position?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rundown_mos_field_mappings: {
        Row: {
          created_at: string | null
          cuer_column_key: string
          field_order: number | null
          id: string
          is_template_column: boolean | null
          rundown_id: string
          xpression_field_name: string
        }
        Insert: {
          created_at?: string | null
          cuer_column_key: string
          field_order?: number | null
          id?: string
          is_template_column?: boolean | null
          rundown_id: string
          xpression_field_name: string
        }
        Update: {
          created_at?: string | null
          cuer_column_key?: string
          field_order?: number | null
          id?: string
          is_template_column?: boolean | null
          rundown_id?: string
          xpression_field_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rundown_mos_field_mappings_rundown_id_fkey"
            columns: ["rundown_id"]
            isOneToOne: false
            referencedRelation: "rundowns"
            referencedColumns: ["id"]
          },
        ]
      }
      rundown_operations: {
        Row: {
          applied_at: string | null
          client_id: string | null
          created_at: string
          id: string
          operation_data: Json
          operation_type: string
          rundown_id: string
          sequence_number: number
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          operation_data: Json
          operation_type: string
          rundown_id: string
          sequence_number?: number
          user_id: string
        }
        Update: {
          applied_at?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          operation_data?: Json
          operation_type?: string
          rundown_id?: string
          sequence_number?: number
          user_id?: string
        }
        Relationships: []
      }
      rundown_presence: {
        Row: {
          active_cell: string | null
          client_id: string | null
          created_at: string
          id: string
          last_seen: string
          rundown_id: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          active_cell?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          last_seen?: string
          rundown_id: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          active_cell?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          last_seen?: string
          rundown_id?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      rundown_recovery_backup: {
        Row: {
          archived: boolean | null
          columns: Json | null
          created_at: string | null
          external_notes: Json | null
          folder_id: string | null
          icon: string | null
          id: string | null
          items: Json | null
          last_updated_by: string | null
          logo_url: string | null
          showcaller_state: Json | null
          start_time: string | null
          team_id: string | null
          timezone: string | null
          title: string | null
          undo_history: Json | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          archived?: boolean | null
          columns?: Json | null
          created_at?: string | null
          external_notes?: Json | null
          folder_id?: string | null
          icon?: string | null
          id?: string | null
          items?: Json | null
          last_updated_by?: string | null
          logo_url?: string | null
          showcaller_state?: Json | null
          start_time?: string | null
          team_id?: string | null
          timezone?: string | null
          title?: string | null
          undo_history?: Json | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          archived?: boolean | null
          columns?: Json | null
          created_at?: string | null
          external_notes?: Json | null
          folder_id?: string | null
          icon?: string | null
          id?: string | null
          items?: Json | null
          last_updated_by?: string | null
          logo_url?: string | null
          showcaller_state?: Json | null
          start_time?: string | null
          team_id?: string | null
          timezone?: string | null
          title?: string | null
          undo_history?: Json | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      rundown_revisions: {
        Row: {
          action_description: string | null
          created_at: string
          created_by: string | null
          id: string
          items: Json
          items_count: number | null
          revision_number: number
          revision_type: string
          rundown_id: string
          start_time: string | null
          timezone: string | null
          title: string
        }
        Insert: {
          action_description?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items: Json
          items_count?: number | null
          revision_number?: number
          revision_type?: string
          rundown_id: string
          start_time?: string | null
          timezone?: string | null
          title: string
        }
        Update: {
          action_description?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          items_count?: number | null
          revision_number?: number
          revision_type?: string
          rundown_id?: string
          start_time?: string | null
          timezone?: string | null
          title?: string
        }
        Relationships: []
      }
      rundowns: {
        Row: {
          archived: boolean
          columns: Json | null
          created_at: string | null
          doc_version: number
          end_time: string | null
          external_notes: Json | null
          folder_id: string | null
          icon: string | null
          id: string
          item_field_updates: Json | null
          items: Json
          last_updated_by: string | null
          locked_row_numbers: Json | null
          logo_url: string | null
          mos_auto_take_enabled: boolean | null
          mos_debounce_ms: number | null
          mos_enabled: boolean | null
          mos_id: string | null
          mos_trigger_on_editorial: boolean | null
          mos_trigger_on_showcaller: boolean | null
          mos_xpression_host: string | null
          mos_xpression_port: number | null
          numbering_locked: boolean | null
          operation_mode_enabled: boolean | null
          per_cell_save_enabled: boolean | null
          show_date: string | null
          showcaller_state: Json | null
          start_time: string | null
          tab_id: string | null
          team_id: string
          timezone: string | null
          title: string
          undo_history: Json | null
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          archived?: boolean
          columns?: Json | null
          created_at?: string | null
          doc_version?: number
          end_time?: string | null
          external_notes?: Json | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          item_field_updates?: Json | null
          items: Json
          last_updated_by?: string | null
          locked_row_numbers?: Json | null
          logo_url?: string | null
          mos_auto_take_enabled?: boolean | null
          mos_debounce_ms?: number | null
          mos_enabled?: boolean | null
          mos_id?: string | null
          mos_trigger_on_editorial?: boolean | null
          mos_trigger_on_showcaller?: boolean | null
          mos_xpression_host?: string | null
          mos_xpression_port?: number | null
          numbering_locked?: boolean | null
          operation_mode_enabled?: boolean | null
          per_cell_save_enabled?: boolean | null
          show_date?: string | null
          showcaller_state?: Json | null
          start_time?: string | null
          tab_id?: string | null
          team_id: string
          timezone?: string | null
          title: string
          undo_history?: Json | null
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          archived?: boolean
          columns?: Json | null
          created_at?: string | null
          doc_version?: number
          end_time?: string | null
          external_notes?: Json | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          item_field_updates?: Json | null
          items?: Json
          last_updated_by?: string | null
          locked_row_numbers?: Json | null
          logo_url?: string | null
          mos_auto_take_enabled?: boolean | null
          mos_debounce_ms?: number | null
          mos_enabled?: boolean | null
          mos_id?: string | null
          mos_trigger_on_editorial?: boolean | null
          mos_trigger_on_showcaller?: boolean | null
          mos_xpression_host?: string | null
          mos_xpression_port?: number | null
          numbering_locked?: boolean | null
          operation_mode_enabled?: boolean | null
          per_cell_save_enabled?: boolean | null
          show_date?: string | null
          showcaller_state?: Json | null
          start_time?: string | null
          tab_id?: string | null
          team_id?: string
          timezone?: string | null
          title?: string
          undo_history?: Json | null
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rundowns_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "rundown_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rundowns_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_rundown_layouts: {
        Row: {
          created_at: string
          id: string
          layout_id: string | null
          rundown_id: string
          shared_by: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout_id?: string | null
          rundown_id: string
          shared_by: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          layout_id?: string | null
          rundown_id?: string
          shared_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_rundown_layouts_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "column_layouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_rundown_layouts_rundown_id_fkey"
            columns: ["rundown_id"]
            isOneToOne: true
            referencedRelation: "rundowns"
            referencedColumns: ["id"]
          },
        ]
      }
      showcaller_sessions: {
        Row: {
          controller_user_id: string
          created_at: string
          current_segment_id: string | null
          id: string
          is_active: boolean
          last_activity: string
          rundown_id: string
          session_end: string | null
          session_start: string
          team_id: string
          updated_at: string
          visual_state: Json | null
        }
        Insert: {
          controller_user_id: string
          created_at?: string
          current_segment_id?: string | null
          id?: string
          is_active?: boolean
          last_activity?: string
          rundown_id: string
          session_end?: string | null
          session_start?: string
          team_id: string
          updated_at?: string
          visual_state?: Json | null
        }
        Update: {
          controller_user_id?: string
          created_at?: string
          current_segment_id?: string | null
          id?: string
          is_active?: boolean
          last_activity?: string
          rundown_id?: string
          session_end?: string | null
          session_start?: string
          team_id?: string
          updated_at?: string
          visual_state?: Json | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          grandfathered: boolean | null
          id: string
          max_team_members: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          grandfathered?: boolean | null
          id?: string
          max_team_members?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          grandfathered?: boolean | null
          id?: string
          max_team_members?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      team_api_keys: {
        Row: {
          api_key: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          permissions: Json | null
          team_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          permissions?: Json | null
          team_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          permissions?: Json | null
          team_id?: string
        }
        Relationships: []
      }
      team_conversations: {
        Row: {
          assistant_response: string
          created_at: string
          id: string
          rundown_context: Json | null
          team_id: string
          user_id: string
          user_message: string
        }
        Insert: {
          assistant_response: string
          created_at?: string
          id?: string
          rundown_context?: Json | null
          team_id: string
          user_id: string
          user_message: string
        }
        Update: {
          assistant_response?: string
          created_at?: string
          id?: string
          rundown_context?: Json | null
          team_id?: string
          user_id?: string
          user_message?: string
        }
        Relationships: []
      }
      team_custom_columns: {
        Row: {
          column_key: string
          column_name: string
          created_at: string
          created_by: string
          id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          column_key: string
          column_name: string
          created_at?: string
          created_by: string
          id?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          column_key?: string
          column_name?: string
          created_at?: string
          created_by?: string
          id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_integrations: {
        Row: {
          auth_headers: Json | null
          created_at: string
          created_by: string
          custom_headers: Json | null
          endpoint_url: string | null
          http_method: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          name: string
          osc_host: string | null
          osc_path: string | null
          osc_port: number | null
          rate_limit_per_minute: number | null
          retry_attempts: number | null
          team_id: string
          updated_at: string
        }
        Insert: {
          auth_headers?: Json | null
          created_at?: string
          created_by: string
          custom_headers?: Json | null
          endpoint_url?: string | null
          http_method?: string | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          name: string
          osc_host?: string | null
          osc_path?: string | null
          osc_port?: number | null
          rate_limit_per_minute?: number | null
          retry_attempts?: number | null
          team_id: string
          updated_at?: string
        }
        Update: {
          auth_headers?: Json | null
          created_at?: string
          created_by?: string
          custom_headers?: Json | null
          endpoint_url?: string | null
          http_method?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          name?: string
          osc_host?: string | null
          osc_path?: string | null
          osc_port?: number | null
          rate_limit_per_minute?: number | null
          retry_attempts?: number | null
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted: boolean | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          team_id: string | null
          token: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          team_id?: string | null
          token: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          team_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_mos_field_mappings: {
        Row: {
          created_at: string
          cuer_column_key: string
          field_order: number | null
          id: string
          is_template_column: boolean | null
          mos_integration_id: string
          team_id: string
          xpression_field_name: string
        }
        Insert: {
          created_at?: string
          cuer_column_key: string
          field_order?: number | null
          id?: string
          is_template_column?: boolean | null
          mos_integration_id: string
          team_id: string
          xpression_field_name: string
        }
        Update: {
          created_at?: string
          cuer_column_key?: string
          field_order?: number | null
          id?: string
          is_template_column?: boolean | null
          mos_integration_id?: string
          team_id?: string
          xpression_field_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_mos_field_mappings_mos_integration_id_fkey"
            columns: ["mos_integration_id"]
            isOneToOne: false
            referencedRelation: "team_mos_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_mos_field_mappings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_mos_integrations: {
        Row: {
          auto_take_enabled: boolean | null
          created_at: string
          created_by: string
          debounce_ms: number | null
          enabled: boolean
          id: string
          mos_id: string
          team_id: string
          updated_at: string
          xpression_host: string | null
          xpression_port: number | null
        }
        Insert: {
          auto_take_enabled?: boolean | null
          created_at?: string
          created_by: string
          debounce_ms?: number | null
          enabled?: boolean
          id?: string
          mos_id: string
          team_id: string
          updated_at?: string
          xpression_host?: string | null
          xpression_port?: number | null
        }
        Update: {
          auto_take_enabled?: boolean | null
          created_at?: string
          created_by?: string
          debounce_ms?: number | null
          enabled?: boolean
          id?: string
          mos_id?: string
          team_id?: string
          updated_at?: string
          xpression_host?: string | null
          xpression_port?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_mos_integrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_column_preferences: {
        Row: {
          column_layout: Json
          created_at: string
          id: string
          rundown_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          column_layout?: Json
          created_at?: string
          id?: string
          rundown_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          column_layout?: Json
          created_at?: string
          id?: string
          rundown_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_column_preferences_rundown_id_fkey"
            columns: ["rundown_id"]
            isOneToOne: false
            referencedRelation: "rundowns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_rundown_zoom_preferences: {
        Row: {
          created_at: string
          id: string
          rundown_id: string
          updated_at: string
          user_id: string
          zoom_level: number
        }
        Insert: {
          created_at?: string
          id?: string
          rundown_id: string
          updated_at?: string
          user_id: string
          zoom_level?: number
        }
        Update: {
          created_at?: string
          id?: string
          rundown_id?: string
          updated_at?: string
          user_id?: string
          zoom_level?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation_secure: {
        Args: { invitation_token: string }
        Returns: Json
      }
      accept_team_invitation: {
        Args: { accepting_user_id: string; invitation_token: string }
        Returns: Json
      }
      accept_team_invitation_legacy: {
        Args: { invitation_token: string }
        Returns: Json
      }
      accept_team_invitation_safe: {
        Args: { invitation_token: string }
        Returns: Json
      }
      add_org_member_to_team: {
        Args: {
          adding_user_id: string
          target_team_id: string
          target_user_id: string
        }
        Returns: Json
      }
      can_read_inviter_profile: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      cleanup_accepted_invitations: { Args: never; Returns: undefined }
      cleanup_deleted_team_column: {
        Args: { column_key: string; team_uuid: string }
        Returns: undefined
      }
      cleanup_expired_invitations: { Args: never; Returns: undefined }
      cleanup_expired_invitations_auto: { Args: never; Returns: undefined }
      cleanup_inactive_showcaller_sessions: { Args: never; Returns: undefined }
      cleanup_old_backups: { Args: never; Returns: undefined }
      cleanup_old_operations: { Args: never; Returns: undefined }
      cleanup_old_presence: { Args: never; Returns: undefined }
      cleanup_old_revisions: { Args: never; Returns: undefined }
      cleanup_old_rundown_operations: { Args: never; Returns: undefined }
      cleanup_orphaned_custom_columns: {
        Args: { new_owner_id: string; target_team_id: string }
        Returns: Json
      }
      cleanup_orphaned_layouts: {
        Args: { new_owner_id: string; target_team_id: string }
        Returns: Json
      }
      cleanup_orphaned_memberships: { Args: never; Returns: undefined }
      create_demo_content_for_user: {
        Args: { target_team_id: string; target_user_id: string }
        Returns: undefined
      }
      create_new_team: {
        Args: { team_name: string; user_uuid: string }
        Returns: string
      }
      delete_user_completely: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      get_batched_rundown_history: {
        Args: {
          batch_window_seconds?: number
          limit_batches?: number
          offset_batches?: number
          target_rundown_id: string
        }
        Returns: {
          batch_id: string
          details: Json
          first_operation: string
          last_operation: string
          operation_count: number
          operation_types: string[]
          profile_picture_url: string
          summary: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_invitation_details_safe: {
        Args: { invitation_token: string }
        Returns: Json
      }
      get_inviter_profile_for_invitation: {
        Args: { invitation_token: string }
        Returns: Json
      }
      get_member_transfer_preview: {
        Args: { member_id: string; team_id_param: string }
        Returns: Json
      }
      get_next_sequence_number: { Args: never; Returns: number }
      get_or_create_user_team: { Args: { user_uuid: string }; Returns: string }
      get_organization_members: {
        Args: { org_owner_uuid: string }
        Returns: {
          email: string
          full_name: string
          profile_picture_url: string
          team_count: number
          teams_list: string[]
          user_id: string
        }[]
      }
      get_public_layout_for_rundown: {
        Args: { layout_uuid: string; rundown_uuid: string }
        Returns: Json
      }
      get_public_rundown_data: { Args: { rundown_uuid: string }; Returns: Json }
      get_rundown_with_field_updates: {
        Args: { rundown_uuid: string }
        Returns: Json
      }
      get_shared_layout_for_public_rundown: {
        Args: { rundown_uuid: string }
        Returns: Json
      }
      get_team_custom_columns: {
        Args: { team_uuid: string }
        Returns: {
          column_key: string
          column_name: string
          created_at: string
          created_by: string
          id: string
        }[]
      }
      get_team_default_layout: {
        Args: { team_uuid: string }
        Returns: {
          columns: Json
          created_at: string
          id: string
          name: string
          team_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_email_safe: { Args: { user_uuid: string }; Returns: string }
      get_user_role_in_team: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: string
      }
      get_user_subscription_access: {
        Args: { team_uuid?: string; user_uuid: string }
        Returns: Json
      }
      get_user_team_ids: { Args: { user_uuid: string }; Returns: string[] }
      get_user_team_ids_for_layouts: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      get_user_team_ids_safe: { Args: { user_uuid: string }; Returns: string[] }
      get_user_team_memberships: {
        Args: { user_uuid: string }
        Returns: {
          joined_at: string
          role: string
          team_id: string
        }[]
      }
      get_user_teams: { Args: { user_uuid: string }; Returns: string[] }
      grandfather_existing_admins: { Args: never; Returns: undefined }
      increment_blog_post_view: {
        Args: { post_uuid: string }
        Returns: undefined
      }
      is_layout_shared_for_public_rundown: {
        Args: { layout_uuid: string }
        Returns: boolean
      }
      is_team_admin: {
        Args: { team_id: string; user_id: string }
        Returns: boolean
      }
      is_team_admin_check: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_team_admin_for_layout: {
        Args: { layout_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_team_admin_for_member_view: {
        Args: { target_team_id: string }
        Returns: boolean
      }
      is_team_admin_or_manager: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_team_admin_safe: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_team_admin_simple: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_team_member_for_member_view: {
        Args: { target_team_id: string }
        Returns: boolean
      }
      is_team_member_simple: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_user_team_admin: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_user_team_member: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      leave_team_as_member: {
        Args: { team_id_to_leave: string; user_id_leaving: string }
        Returns: Json
      }
      migrate_existing_custom_columns: { Args: never; Returns: undefined }
      pg_advisory_unlock: { Args: { key: number }; Returns: undefined }
      pg_try_advisory_lock: { Args: { key: number }; Returns: boolean }
      remove_team_member_with_transfer: {
        Args: { admin_id: string; member_id: string; team_id_param: string }
        Returns: Json
      }
      restore_rundown_from_revision: {
        Args: { revision_id: string; target_rundown_id: string }
        Returns: boolean
      }
      should_use_per_cell_save: {
        Args: { user_email: string }
        Returns: boolean
      }
      update_column_layouts_on_team_column_rename: {
        Args: {
          new_column_name: string
          old_column_key: string
          team_uuid: string
        }
        Returns: undefined
      }
      update_rundown_field_atomic: {
        Args: {
          field_name: string
          field_value: Json
          item_id: string
          rundown_uuid: string
          user_uuid: string
        }
        Returns: Json
      }
      update_rundown_presence: {
        Args: { rundown_uuid: string }
        Returns: undefined
      }
      update_showcaller_state_silent: {
        Args: { new_showcaller_state: Json; rundown_uuid: string }
        Returns: undefined
      }
      validate_invitation_token: {
        Args: { token_param: string }
        Returns: Json
      }
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
