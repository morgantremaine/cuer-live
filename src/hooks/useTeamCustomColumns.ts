
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useConsolidatedTeam } from './useConsolidatedTeam';

export interface TeamCustomColumn {
  id: string;
  column_key: string;
  column_name: string;
  created_by: string;
  created_at: string;
}

export const useTeamCustomColumns = () => {
  const { user } = useAuth();
  const { team } = useConsolidatedTeam();
  const [teamColumns, setTeamColumns] = useState<TeamCustomColumn[]>([]);
  const [loading, setLoading] = useState(true);

  // Load team custom columns
  const loadTeamColumns = useCallback(async () => {
    if (!team?.id || !user) {
      setTeamColumns([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_team_custom_columns', {
        team_uuid: team.id
      });

      if (error) {
        console.error('Error loading team custom columns:', error);
        setTeamColumns([]);
      } else {
        setTeamColumns(data || []);
      }
    } catch (error) {
      console.error('Failed to load team custom columns:', error);
      setTeamColumns([]);
    } finally {
      setLoading(false);
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
    deleteTeamColumn,
    reloadTeamColumns: loadTeamColumns
  };
};
