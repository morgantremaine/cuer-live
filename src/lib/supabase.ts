import { createClient } from '@supabase/supabase-js'

// Temporarily hardcoded values - these should come from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://khdiwrkgahsbjszlwnob.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZGl3cmtnYWhzYmpzemx3bm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MzcwNTYsImV4cCI6MjA2NDIxMzA1Nn0.__Z_HYaLyyvYa5yNHwjsln3ti6sQoflRoEYCq6Agedk'

// Create a single Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
})

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
        }
      }
      rundowns: {
        Row: {
          id: string
          user_id: string
          title: string
          items: any
          columns?: any
          timezone?: string
          created_at: string
          updated_at: string
          archived: boolean
          team_id?: string | null
          visibility: 'private' | 'team'
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          items: any
          columns?: any
          timezone?: string
          created_at?: string
          updated_at?: string
          archived?: boolean
          team_id?: string | null
          visibility?: 'private' | 'team'
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          items?: any
          columns?: any
          timezone?: string
          created_at?: string
          updated_at?: string
          archived?: boolean
          team_id?: string | null
          visibility?: 'private' | 'team'
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
      }
      team_invitations: {
        Row: {
          id: string
          team_id: string
          email: string
          invited_by: string
          token: string
          accepted: boolean
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          team_id: string
          email: string
          invited_by: string
          token: string
          accepted?: boolean
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          email?: string
          invited_by?: string
          token?: string
          accepted?: boolean
          created_at?: string
          expires_at?: string
        }
      }
      column_layouts: {
        Row: {
          id: string
          user_id: string
          name: string
          columns: any
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          columns: any
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          columns?: any
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
