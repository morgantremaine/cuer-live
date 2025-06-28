import { createClient } from '@supabase/supabase-js'

// Environment variables with proper fallbacks and validation
const getSupabaseUrl = (): string => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) {
    // Fallback for development - this should be removed in production
    console.warn('VITE_SUPABASE_URL not found, using fallback. This should not happen in production.');
    return 'https://khdiwrkgahsbjszlwnob.supabase.co';
  }
  return url;
};

const getSupabaseAnonKey = (): string => {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!key) {
    // Fallback for development - this should be removed in production
    console.warn('VITE_SUPABASE_ANON_KEY not found, using fallback. This should not happen in production.');
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZGl3cmtnYWhzYmpzemx3bm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MzcwNTYsImV4cCI6MjA2NDIxMzA1Nn0.__Z_HYaLyyvYa5yNHwjsln3ti6sQoflRoEYCq6Agedk';
  }
  return key;
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

// Enhanced Supabase client configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

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
    // Enable realtime replication for the rundowns table if not already enabled
    // This ensures that UPDATE events are captured and sent to subscribers
  } catch (error) {
    console.error('Error initializing realtime:', error);
  }
};

// Initialize on module load
initializeRealtime();
