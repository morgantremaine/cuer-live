
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { mapDatabaseToRundown, mapRundownToDatabase, mapRundownsFromDatabase } from './useRundownStorage/dataMapper';
import { SavedRundown } from './useRundownStorage/types';
import { RundownOperations } from './useRundownStorage/operations';

export const useRundownStorage = () => {
  const { user } = useAuth();
  const [savedRundowns, setSavedRundowns] = useState<SavedRundown[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load rundowns from Supabase (team rundowns only, including archived ones)
  const loadRundowns = useCallback(async () => {
    if (!user) {
      setSavedRundowns([]);
      setLoading(false);
      return;
    }

    try {
      console.log('Loading rundowns from database for user:', user.id);
      
      // Get user's team memberships to know which teams they belong to
      const { data: teamMemberships, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);

      if (teamError) {
        console.error('Error loading team memberships:', teamError);
        setSavedRundowns([]);
        setLoading(false);
        return;
      }

      const teamIds = teamMemberships?.map(membership => membership.team_id) || [];
      
      if (teamIds.length === 0) {
        console.log('User is not a member of any teams');
        setSavedRundowns([]);
        setLoading(false);
        return;
      }
      
      // Query rundowns from user's teams - include both archived and active
      // Join with profiles to get creator information
      const { data, error } = await supabase
        .from('rundowns')
        .select(`
          *,
          teams:team_id (
            id,
            name
          ),
          creator_profile:profiles!rundowns_user_id_fkey (
            full_name,
            email
          )
        `)
        .in('team_id', teamIds)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Database error loading rundowns:', error);
        throw error;
      }

      const rundowns = mapRundownsFromDatabase(data || []);
      setSavedRundowns(rundowns);
      console.log('Loaded rundowns from database:', rundowns.length);
    } catch (error) {
      console.error('Error loading rundowns:', error);
      setSavedRundowns([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Save rundown to Supabase
  const saveRundown = useCallback(async (rundown: SavedRundown): Promise<string> => {
    if (!user || !rundown) {
      throw new Error('User not authenticated or rundown is invalid');
    }

    // Ensure rundown has a team_id - get user's first team if not provided
    if (!rundown.team_id) {
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!teamMemberships || teamMemberships.length === 0) {
        throw new Error('User is not a member of any team. Cannot create rundown.');
      }

      rundown.team_id = teamMemberships[0].team_id;
    }

    setIsSaving(true);
    
    try {
      // Prepare rundown data - don't include id for new rundowns
      const rundownData = mapRundownToDatabase(rundown, user.id);
      
      // For new rundowns, remove the id field to let database generate it
      if (!rundown.id || rundown.id === '') {
        delete rundownData.id;
      }
      
      const { data, error } = await supabase
        .from('rundowns')
        .upsert(rundownData)
        .select()
        .single();

      if (error) {
        console.error('Database error saving rundown:', error);
        throw error;
      }

      const savedRundown = mapDatabaseToRundown(data);
      
      // Update local state
      setSavedRundowns(prevRundowns => {
        const existingIndex = prevRundowns.findIndex(r => r.id === savedRundown.id);
        if (existingIndex >= 0) {
          const newRundowns = [...prevRundowns];
          newRundowns[existingIndex] = savedRundown;
          return newRundowns;
        } else {
          return [savedRundown, ...prevRundowns];
        }
      });

      return savedRundown.id;
    } catch (error) {
      console.error('Error saving rundown:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  const operations = new RundownOperations(user, saveRundown, setSavedRundowns);

  useEffect(() => {
    loadRundowns();
  }, [loadRundowns]);

  return {
    savedRundowns,
    loading,
    isSaving,
    saveRundown,
    updateRundown: operations.updateRundown.bind(operations),
    deleteRundown: operations.deleteRundown.bind(operations),
    archiveRundown: operations.archiveRundown.bind(operations),
    duplicateRundown: operations.duplicateRundown.bind(operations),
    loadRundowns
  };
};
