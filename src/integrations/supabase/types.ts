export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      blueprints: {
        Row: {
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
      rundown_presence: {
        Row: {
          created_at: string
          id: string
          last_seen: string
          rundown_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen?: string
          rundown_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen?: string
          rundown_id?: string
          user_id?: string
        }
        Relationships: []
      }
      rundowns: {
        Row: {
          archived: boolean
          columns: Json | null
          created_at: string | null
          external_notes: Json | null
          folder_id: string | null
          icon: string | null
          id: string
          items: Json
          logo_url: string | null
          showcaller_state: Json | null
          start_time: string | null
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
          external_notes?: Json | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          items: Json
          logo_url?: string | null
          showcaller_state?: Json | null
          start_time?: string | null
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
          external_notes?: Json | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          items?: Json
          logo_url?: string | null
          showcaller_state?: Json | null
          start_time?: string | null
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
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_inviter_profile: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      cleanup_accepted_invitations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_invitations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_presence: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_orphaned_memberships: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_user_completely: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      get_member_transfer_preview: {
        Args: { member_id: string; team_id_param: string }
        Returns: Json
      }
      get_user_email_safe: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_role_in_team: {
        Args: { user_uuid: string; team_uuid: string }
        Returns: string
      }
      get_user_team_ids: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      get_user_team_ids_for_layouts: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      get_user_team_ids_safe: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      get_user_team_memberships: {
        Args: { user_uuid: string }
        Returns: {
          team_id: string
          role: string
          joined_at: string
        }[]
      }
      get_user_teams: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      is_team_admin: {
        Args: { user_id: string; team_id: string }
        Returns: boolean
      }
      is_team_admin_check: {
        Args: { user_uuid: string; team_uuid: string }
        Returns: boolean
      }
      is_team_admin_safe: {
        Args: { user_uuid: string; team_uuid: string }
        Returns: boolean
      }
      is_team_admin_simple: {
        Args: { user_uuid: string; team_uuid: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { user_uuid: string; team_uuid: string }
        Returns: boolean
      }
      is_team_member_simple: {
        Args: { user_uuid: string; team_uuid: string }
        Returns: boolean
      }
      is_user_team_admin: {
        Args: { user_uuid: string; team_uuid: string }
        Returns: boolean
      }
      is_user_team_member: {
        Args: { user_uuid: string; team_uuid: string }
        Returns: boolean
      }
      remove_team_member_with_transfer: {
        Args: { member_id: string; admin_id: string; team_id_param: string }
        Returns: Json
      }
      update_rundown_presence: {
        Args: { rundown_uuid: string }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
