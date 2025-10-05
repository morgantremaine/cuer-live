
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

// Use the actual Supabase project configuration
const supabaseUrl = 'https://khdiwrkgahsbjszlwnob.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZGl3cmtnYWhzYmpzemx3bm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MzcwNTYsImV4cCI6MjA2NDIxMzA1Nn0.__Z_HYaLyyvYa5yNHwjsln3ti6sQoflRoEYCq6Agedk';

// Create enhanced supabase client with proper error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 50
    }
  }
});

// Enhanced query helper with automatic error logging
export const createQuery = <T = any>(
  table: string,
  operation: string
) => {
  return {
    async execute(query: any): Promise<{ data: T | null; error: any | null }> {
      try {
        const result = await query;
        
        if (result.error) {
          logger.error(`${operation} operation failed on ${table}: ${result.error.message}`);
        }
        
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`${operation} operation threw exception on ${table}: ${errorMessage}`);
        return { data: null, error: { message: errorMessage } };
      }
    }
  };
};

export type Database = any; // Will be properly typed later
