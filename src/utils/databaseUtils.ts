
import { supabase } from '@/integrations/supabase/client';
import { DatabaseResponse, DatabaseTable, QueryOptions } from '@/types/database';
import { logger } from '@/utils/logger';

// Type-safe database query wrapper
export const executeQuery = async <T = any>(
  table: DatabaseTable,
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert',
  options: QueryOptions = {},
  data?: any
): Promise<DatabaseResponse<T>> => {
  try {
    let query: any;
    
    // Build query based on operation
    switch (operation) {
      case 'select':
        query = supabase.from(table).select(options.select || '*');
        break;
      case 'insert':
        query = supabase.from(table).insert(data);
        break;
      case 'update':
        query = supabase.from(table).update(data);
        break;
      case 'delete':
        query = supabase.from(table).delete();
        break;
      case 'upsert':
        query = supabase.from(table).upsert(data);
        break;
    }
    
    // Apply filters
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    // Apply ordering
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const result = await query;
    
    if (result.error) {
      logger.error(`Database ${operation} operation failed on ${table}: ${result.error.message}`);
      return {
        data: null,
        error: {
          message: result.error.message,
          code: result.error.code,
          details: result.error.details,
          hint: result.error.hint
        }
      };
    }
    
    return {
      data: result.data as T,
      error: null,
      count: result.count || undefined
    };
    
  } catch (error) {
    logger.error(`Database ${operation} operation threw exception on ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown database error'
      }
    };
  }
};

// Specific typed query helpers
export const getRundown = async (id: string) => {
  return executeQuery('rundowns', 'select', {
    filter: { id },
    select: 'id, title, items, columns, start_time, timezone, created_at, updated_at, showcaller_state, visibility'
  });
};

export const updateRundown = async (id: string, updates: any) => {
  return executeQuery('rundowns', 'update', {
    filter: { id }
  }, updates);
};

export const getUserTeams = async (userId: string) => {
  return executeQuery('team_members', 'select', {
    filter: { user_id: userId },
    select: 'team_id, role, teams(id, name)'
  });
};
