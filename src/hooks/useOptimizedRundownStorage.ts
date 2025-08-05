import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeamId } from './useTeamId';
import { RundownItem } from '@/types/rundown';

interface SavedRundown {
  id: string;
  title: string;
  items: RundownItem[];
  created_at: string;
  updated_at: string;
  archived: boolean;
  folder_id?: string;
  user_id: string;
  team_id: string;
  columns?: any;
  timezone?: string;
  start_time?: string;
  icon?: string | null;
  visibility?: string;
  undo_history?: any[];
  teams?: any;
  creator_profile?: any;
}

const RUNDOWNS_QUERY_KEY = 'rundowns';

export const useOptimizedRundownStorage = () => {
  const { user } = useAuth();
  const { teamId } = useTeamId();
  const queryClient = useQueryClient();

  // Optimized query with React Query caching
  const {
    data: savedRundowns = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: [RUNDOWNS_QUERY_KEY, teamId],
    queryFn: async () => {
      if (!teamId) {
        return [];
      }

      console.log('Loading rundowns from database for team:', teamId);
      
      const { data, error } = await supabase
        .from('rundowns')
        .select('*')
        .eq('team_id', teamId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(rundown => ({
        ...rundown,
        items: Array.isArray(rundown.items) ? rundown.items : []
      }));
    },
    enabled: !!teamId && !!user,
    staleTime: 30000, // Data is fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  const loadRundowns = useCallback(() => {
    refetch();
  }, [refetch]);

  const createRundown = useCallback(async (title: string, items: RundownItem[] = [], folderId?: string | null) => {
    if (!user || !teamId) throw new Error('User not authenticated or no team');

    const { data, error } = await supabase
      .from('rundowns')
      .insert({
        title,
        items,
        user_id: user.id,
        team_id: teamId,
        folder_id: folderId,
        archived: false
      })
      .select()
      .single();

    if (error) throw error;

    // Optimistically update cache
    const newRundown = {
      ...data,
      items: Array.isArray(data.items) ? data.items : []
    };

    queryClient.setQueryData([RUNDOWNS_QUERY_KEY, teamId], (old: SavedRundown[] = []) => 
      [newRundown, ...old]
    );

    return data.id;
  }, [user, teamId, queryClient]);

  const updateRundown = useCallback(async (
    id: string, 
    title: string, 
    items: RundownItem[], 
    skipReload = false, 
    archived = false,
    columns?: any,
    timezone?: string,
    startTime?: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    const updateData: any = {
      title,
      items,
      archived,
      updated_at: new Date().toISOString()
    };

    if (columns !== undefined) updateData.columns = columns;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (startTime !== undefined) updateData.start_time = startTime;

    const { error } = await supabase
      .from('rundowns')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    // Optimistically update cache
    queryClient.setQueryData([RUNDOWNS_QUERY_KEY, teamId], (old: SavedRundown[] = []) =>
      old.map(rundown => 
        rundown.id === id 
          ? { 
              ...rundown, 
              title, 
              items, 
              archived, 
              columns: columns !== undefined ? columns : rundown.columns,
              timezone: timezone !== undefined ? timezone : rundown.timezone,
              start_time: startTime !== undefined ? startTime : rundown.start_time,
              updated_at: new Date().toISOString()
            }
          : rundown
      )
    );
  }, [user, teamId, queryClient]);

  const deleteRundown = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('rundowns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Optimistically update cache
    queryClient.setQueryData([RUNDOWNS_QUERY_KEY, teamId], (old: SavedRundown[] = []) =>
      old.filter(rundown => rundown.id !== id)
    );
  }, [user, teamId, queryClient]);

  const duplicateRundown = useCallback(async (originalRundown: SavedRundown) => {
    if (!user || !teamId) throw new Error('User not authenticated or no team');

    const duplicatedTitle = `${originalRundown.title} (Copy)`;
    const duplicatedItems = originalRundown.items.map(item => ({
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));

    const { data, error } = await supabase
      .from('rundowns')
      .insert({
        title: duplicatedTitle,
        items: duplicatedItems,
        user_id: user.id,
        team_id: teamId,
        folder_id: originalRundown.folder_id,
        archived: false
      })
      .select()
      .single();

    if (error) throw error;

    // Optimistically update cache
    const newRundown = {
      ...data,
      items: Array.isArray(data.items) ? data.items : []
    };

    queryClient.setQueryData([RUNDOWNS_QUERY_KEY, teamId], (old: SavedRundown[] = []) =>
      [newRundown, ...old]
    );

    return data.id;
  }, [user, teamId, queryClient]);

  const saveRundown = useCallback(async (rundown: SavedRundown) => {
    if (!user || !teamId) throw new Error('User not authenticated or no team');

    const { data, error } = await supabase
      .from('rundowns')
      .insert({
        title: rundown.title,
        items: rundown.items,
        user_id: user.id,
        team_id: teamId,
        columns: rundown.columns,
        timezone: rundown.timezone,
        start_time: rundown.start_time,
        archived: false
      })
      .select()
      .single();

    if (error) throw error;

    // Optimistically update cache
    const newRundown = {
      ...data,
      items: Array.isArray(data.items) ? data.items : []
    };

    queryClient.setQueryData([RUNDOWNS_QUERY_KEY, teamId], (old: SavedRundown[] = []) =>
      [newRundown, ...old]
    );

    return data.id;
  }, [user, teamId, queryClient]);

  return {
    savedRundowns,
    loading,
    error,
    loadRundowns,
    createRundown,
    saveRundown,
    updateRundown,
    deleteRundown,
    duplicateRundown
  };
};