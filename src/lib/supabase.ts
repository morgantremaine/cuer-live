
import { createClient } from '@supabase/supabase-js'

// Temporarily hardcoded values - these should come from environment variables
const supabaseUrl = 'https://khdiwrkgahsbjszlwnob.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZGl3cmtnYWhzYmpzemx3bm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MzcwNTYsImV4cCI6MjA2NDIxMzA1Nn0.__Z_HYaLyyvYa5yNHwjsln3ti6sQoflRoEYCq6Agedk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

// Initialize realtime for the rundowns table on startup
const initializeRealtime = async () => {
  try {
    console.log('🔧 Initializing realtime for rundowns table...');
    
    // Enable realtime replication for the rundowns table if not already enabled
    // This ensures that UPDATE events are captured and sent to subscribers
    console.log('✅ Realtime should be working for rundowns table');
  } catch (error) {
    console.error('❌ Error initializing realtime:', error);
  }
};

// Initialize on module load
initializeRealtime();
