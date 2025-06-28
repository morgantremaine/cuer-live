
// Enhanced database response types
export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface DatabaseResponse<T = any> {
  data: T | null;
  error: DatabaseError | null;
  count?: number;
}

// Supabase specific response types
export interface RundownDatabaseRow {
  id: string;
  user_id: string;
  team_id: string;
  title: string;
  items: any[];
  columns?: any[];
  start_time?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  showcaller_state?: any;
  visibility?: string;
}

export interface BlueprintDatabaseRow {
  id: string;
  user_id: string;
  team_id?: string;
  rundown_id: string;
  rundown_title: string;
  lists: any[];
  notes?: string;
  crew_data?: any;
  camera_plots?: any;
  component_order?: string[];
  show_date?: string;
  created_at: string;
  updated_at: string;
}

// Type-safe database query helpers
export type DatabaseTable = 'rundowns' | 'blueprints' | 'profiles' | 'team_members' | 'teams';

export interface QueryOptions {
  select?: string;
  filter?: Record<string, any>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}
