
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';

export interface TeamCustomColumn {
  id: string;
  column_key: string;
  column_name: string;
  created_by: string;
  created_at: string;
}

export const useTeamCustomColumns = () => {
  const { user } = useAuth();
  const { team } = useTeam();
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

  // Delete a team custom column (admin only)
  const deleteTeamColumn = useCallback(async (columnId: string) => {
    if (!team?.id || !user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('team_custom_columns')
        .delete()
        .eq('id', columnId);

      if (error) {
        console.error('Error deleting team custom column:', error);
        return { success: false, error: error.message };
      }

      // Remove from local state if successful
      setTeamColumns(prev => prev.filter(col => col.id !== columnId));
      return { success: true, message: 'Column deleted successfully' };
    } catch (error) {
      console.error('Failed to delete team custom column:', error);
      return { success: false, error: 'Failed to delete column' };
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
