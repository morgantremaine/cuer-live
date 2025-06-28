
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create enhanced supabase client with proper error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
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
