
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
      const { data: rundownsData, error: rundownsError } = await supabase
        .from('rundowns')
        .select(`
          *,
          teams:team_id (
            id,
            name
          )
        `)
        .in('team_id', teamIds)
        .order('updated_at', { ascending: false });

      if (rundownsError) {
        console.error('Database error loading rundowns:', rundownsError);
        throw rundownsError;
      }

      // Get all unique user IDs from rundowns to fetch their profiles
      const userIds = [...new Set(rundownsData?.map(r => r.user_id) || [])];
      
      let profilesData = [];
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error loading profiles:', profilesError);
          // Continue without profile data instead of failing
        } else {
          profilesData = profiles || [];
        }
      }

      // Map rundowns and attach creator profile data
      const rundowns = (rundownsData || []).map(rundown => {
        const creatorProfile = profilesData.find(p => p.id === rundown.user_id);
        return {
          id: rundown.id,
          user_id: rundown.user_id,
          title: rundown.title,
          items: rundown.items || [],
          columns: rundown.columns,
          timezone: rundown.timezone,
          start_time: rundown.start_time,
          icon: rundown.icon,
          archived: rundown.archived || false,
          created_at: rundown.created_at,
          updated_at: rundown.updated_at,
          undo_history: rundown.undo_history || [],
          team_id: rundown.team_id,
          visibility: rundown.visibility,
          teams: rundown.teams ? {
            id: rundown.teams.id,
            name: rundown.teams.name
          } : null,
          creator_profile: creatorProfile ? {
            full_name: creatorProfile.full_name,
            email: creatorProfile.email
          } : null
        };
      });

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
