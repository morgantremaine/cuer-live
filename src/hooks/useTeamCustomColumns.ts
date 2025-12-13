
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';

export interface TeamCustomColumn {
  id: string;
  column_key: string;
  column_name: string;
  created_by: string;
  created_at: string;
}

// Helper to retry RPC calls with exponential backoff
const retryRpc = async <T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> => {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
};

export const useTeamCustomColumns = () => {
  const { user } = useAuth();
  const { team, isLoading: teamLoading } = useTeam();
  const [teamColumns, setTeamColumns] = useState<TeamCustomColumn[]>([]);
  // Start as NOT loading - don't block UI while waiting for team data
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const lastLoadedTeamRef = useRef<string | null>(null);
  
  // Strategic timing log
  useEffect(() => {
    console.log('⏱️ [TEAM_COLS] state changed - loading:', loading, 'teamLoading:', teamLoading, 'team:', team?.id?.slice(0,8));
  }, [loading, teamLoading, team?.id]);

  // Load team custom columns
  const loadTeamColumns = useCallback(async () => {
    if (!team?.id || !user) {
      setTeamColumns([]);
      return;
    }
    
    // Skip if already loaded for this team
    if (lastLoadedTeamRef.current === team.id) {
      return;
    }
    
    setLoading(true);
    loadingRef.current = true;

    try {
      // Ensure we have a valid session before making the call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No valid session, skipping team custom columns load');
        setTeamColumns([]);
        setLoading(false);
        return;
      }

      const { data, error } = await retryRpc(async () => 
        await supabase.rpc('get_team_custom_columns', {
          team_uuid: team.id
        })
      );

      if (error) {
        console.error('Error loading team custom columns:', error);
        setTeamColumns([]);
      } else {
        setTeamColumns(data || []);
        lastLoadedTeamRef.current = team.id;
      }
    } catch (error) {
      console.error('Failed to load team custom columns:', error);
      setTeamColumns([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [team?.id, user]);

  // Add a new team custom column
  const addTeamColumn = useCallback(async (columnKey: string, columnName: string) => {
    if (!team?.id || !user) return false;

    try {
      const { data, error } = await supabase
        .from('team_custom_columns')
        .insert({
          team_id: team.id,
          column_key: columnKey,
          column_name: columnName,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding team custom column:', error);
        return false;
      }

      // Update local state
      setTeamColumns(prev => [...prev, data]);
      return true;
    } catch (error) {
      console.error('Failed to add team custom column:', error);
      return false;
    }
  }, [team?.id, user]);

  // Rename a team custom column (team-wide)
  const renameTeamColumn = useCallback(async (columnKey: string, newName: string) => {
    if (!team?.id || !user) return false;

    try {
      const { error } = await supabase
        .from('team_custom_columns')
        .update({ column_name: newName, updated_at: new Date().toISOString() })
        .eq('team_id', team.id)
        .eq('column_key', columnKey);

      if (error) {
        console.error('Error renaming team custom column:', error);
        return false;
      }

      // Also update all saved column layouts to use the new name
      const { error: layoutError } = await supabase
        .rpc('update_column_layouts_on_team_column_rename', {
          team_uuid: team.id,
          old_column_key: columnKey,
          new_column_name: newName
        });

      if (layoutError) {
        console.warn('Could not update saved layouts with new column name:', layoutError);
        // Don't fail the rename if layout update fails
      }

      // Update local state immediately (realtime will also handle this)
      setTeamColumns(prev => prev.map(col => 
        col.column_key === columnKey ? { ...col, column_name: newName } : col
      ));
      
      console.log('📊 Team column renamed:', columnKey, '->', newName);
      return true;
    } catch (error) {
      console.error('Failed to rename team custom column:', error);
      return false;
    }
  }, [team?.id, user]);

  // Delete a team custom column
  const deleteTeamColumn = useCallback(async (columnKey: string) => {
    if (!team?.id || !user) return false;

    try {
      const { error } = await supabase
        .from('team_custom_columns')
        .delete()
        .eq('team_id', team.id)
        .eq('column_key', columnKey);

      if (error) {
        console.error('Error deleting team custom column:', error);
        return false;
      }

      // Clean up this column from all user column preferences for this team
      // This prevents the column from reappearing after deletion
      const { error: cleanupError } = await supabase
        .rpc('cleanup_deleted_team_column', {
          team_uuid: team.id,
          column_key: columnKey
        });

      if (cleanupError) {
        console.warn('Could not clean up user preferences for deleted column:', cleanupError);
        // Don't fail the deletion if cleanup fails
      }

      // Update local state immediately (realtime will also handle this)
      setTeamColumns(prev => prev.filter(col => col.column_key !== columnKey));
      return true;
    } catch (error) {
      console.error('Failed to delete team custom column:', error);
      return false;
    }
  }, [team?.id, user]);

  // Set up realtime subscription for team custom columns
  useEffect(() => {
    if (!team?.id) return;

    const channel = supabase
      .channel('team-custom-columns')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_custom_columns',
          filter: `team_id=eq.${team.id}`
        },
        (payload) => {
          console.log('New team custom column added:', payload);
          setTeamColumns(prev => [...prev, payload.new as TeamCustomColumn]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'team_custom_columns',
          filter: `team_id=eq.${team.id}`
        },
        (payload) => {
          console.log('Team custom column updated (renamed):', payload);
          setTeamColumns(prev => prev.map(col => 
            col.id === (payload.new as TeamCustomColumn).id 
              ? payload.new as TeamCustomColumn 
              : col
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'team_custom_columns',
          filter: `team_id=eq.${team.id}`
        },
        (payload) => {
          console.log('Team custom column deleted:', payload);
          setTeamColumns(prev => prev.filter(col => col.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [team?.id]);

  // Load team columns when team changes
  useEffect(() => {
    loadTeamColumns();
  }, [loadTeamColumns]);

  return {
    teamColumns,
    loading,
    addTeamColumn,
    renameTeamColumn,
    deleteTeamColumn,
    reloadTeamColumns: loadTeamColumns
  };
};
