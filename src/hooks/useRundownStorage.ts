
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUniversalTimer } from './useUniversalTimer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeamId } from './useTeamId';
import { useSubscription } from './useSubscription';
import { RundownItem, isHeaderItem } from '@/types/rundown';

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
  last_updated_by?: string | null;
}

export const useRundownStorage = () => {
  const { user } = useAuth();
  const { teamId } = useTeamId();
  const { subscription_tier, access_type } = useSubscription();
  const [savedRundowns, setSavedRundowns] = useState<SavedRundown[]>([]);
  const [loading, setLoading] = useState(false);
  const { setTimeout: setManagedTimeout, clearTimer } = useUniversalTimer('RundownStorage');
  
  // Use refs to prevent multiple simultaneous loads
  const isLoadingRef = useRef(false);
  const loadTimeoutRef = useRef<string>();
  const lastLoadedUserRef = useRef<string | null>(null);
  const lastLoadedTeamRef = useRef<string | null>(null);

  // Debounced load function - with better stability checks
  const debouncedLoadRundowns = useCallback(async () => {
    if (!user || isLoadingRef.current) {
      return;
    }

    // For new users without a team, don't try to load rundowns yet
    if (!teamId) {
      console.log('No teamId yet, waiting for team to be created...');
      setLoading(false);
      isLoadingRef.current = false;
      return;
    }

    // Check if we already loaded for this user/team combination
    const currentKey = `${user.id}-${teamId}`;
    const lastKey = `${lastLoadedUserRef.current}-${lastLoadedTeamRef.current}`;
    if (currentKey === lastKey && savedRundowns.length > 0) {
      // Already loaded and we have data - no need to reload
      return;
    }

    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimer(loadTimeoutRef.current);
    }

    // Set a debounce timeout - but if we have no data, load faster
    const debounceDelay = savedRundowns.length === 0 ? 100 : 300;
    loadTimeoutRef.current = setManagedTimeout(async () => {
      if (isLoadingRef.current) return;
      
      isLoadingRef.current = true;
      lastLoadedUserRef.current = user.id;
      lastLoadedTeamRef.current = teamId;
      
      console.log('Loading rundowns from database for user:', user.id);
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('team_id', teamId)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        const rundowns = (data || []).map(rundown => ({
          ...rundown,
          items: Array.isArray(rundown.items) ? rundown.items : []
        }));

        setSavedRundowns(rundowns);
        console.log('Loaded rundowns from database:', rundowns.length);
      } catch (error) {
        console.error('Error loading rundowns:', error);
        setSavedRundowns([]);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    }, debounceDelay);
  }, [user, teamId, savedRundowns.length, setManagedTimeout, clearTimer]);

  // Load rundowns when user or team changes
  useEffect(() => {
    if (user && teamId) {
      const currentKey = `${user.id}-${teamId}`;
      const lastKey = `${lastLoadedUserRef.current}-${lastLoadedTeamRef.current}`;
      if (currentKey !== lastKey) {
        debouncedLoadRundowns();
      }
    }
  }, [user, teamId, debouncedLoadRundowns]);

  // Handle focus/visibility changes to refresh rundown data silently
  useEffect(() => {
    let lastFocusCheck = 0;
    
    const handleFocusRefresh = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        const now = Date.now();
        // Throttle to max once per 10 seconds to avoid excessive API calls
        if (now - lastFocusCheck < 10000) return;
        lastFocusCheck = now;
        
        // Only refresh if we have user and team data
        if (user?.id && teamId && savedRundowns.length > 0) {
          console.log('Dashboard: Silently refreshing rundown data after focus/visibility change');
          // Silent refresh without clearing loading state or existing data
          debouncedLoadRundowns();
        }
      }
    };

    // Listen to both visibility change and focus events
    document.addEventListener('visibilitychange', handleFocusRefresh);
    window.addEventListener('focus', handleFocusRefresh);
    
    return () => {
      document.removeEventListener('visibilitychange', handleFocusRefresh);
      window.removeEventListener('focus', handleFocusRefresh);
    };
  }, [user?.id, teamId, savedRundowns.length, debouncedLoadRundowns]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimer(loadTimeoutRef.current);
      }
    };
  }, [clearTimer]);

  const loadRundowns = useCallback(() => {
    lastLoadedUserRef.current = null;
    lastLoadedTeamRef.current = null;
    debouncedLoadRundowns();
  }, [debouncedLoadRundowns]);

  const createRundown = useCallback(async (title: string, items: RundownItem[] = [], folderId?: string | null) => {
    if (!user || !teamId) throw new Error('User not authenticated or no team');

    // Check rundown limits for free tier users
    if (subscription_tier === 'Free' && access_type === 'free') {
      const activeRundowns = savedRundowns.filter(r => !r.archived);
      if (activeRundowns.length >= 3) {
        throw new Error('Free tier users are limited to 3 rundowns. Please upgrade your plan or archive existing rundowns to create new ones.');
      }
    }

    const { data, error } = await supabase
      .from('rundowns')
      .insert({
        title,
        items,
        user_id: user.id,
        team_id: teamId,
        folder_id: folderId,
        archived: false,
        last_updated_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Add to local state
    const newRundown = {
      ...data,
      items: Array.isArray(data.items) ? data.items : []
    };
    setSavedRundowns(prev => [newRundown, ...prev]);

    return data.id;
  }, [user, teamId, subscription_tier, access_type, savedRundowns]);

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
        archived: false,
        last_updated_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Add to local state
    const newRundown = {
      ...data,
      items: Array.isArray(data.items) ? data.items : []
    };
    setSavedRundowns(prev => [newRundown, ...prev]);

    return data.id;
  }, [user, teamId]);

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
      updated_at: new Date().toISOString(),
      last_updated_by: user.id
    };

    if (columns !== undefined) updateData.columns = columns;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (startTime !== undefined) updateData.start_time = startTime;

    const { error } = await supabase
      .from('rundowns')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    // Update local state
    setSavedRundowns(prev => prev.map(rundown => 
      rundown.id === id 
        ? { 
            ...rundown, 
            title, 
            items, 
            archived, 
            columns: columns !== undefined ? columns : rundown.columns,
            timezone: timezone !== undefined ? timezone : rundown.timezone,
            start_time: startTime !== undefined ? startTime : rundown.start_time,
            updated_at: new Date().toISOString(),
            last_updated_by: user.id
          }
        : rundown
    ));
  }, [user]);

  const deleteRundown = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('rundowns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Remove from local state
    setSavedRundowns(prev => prev.filter(rundown => rundown.id !== id));
  }, [user]);

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

    // Add to local state
    const newRundown = {
      ...data,
      items: Array.isArray(data.items) ? data.items : []
    };
    setSavedRundowns(prev => [newRundown, ...prev]);

    return data.id;
  }, [user, teamId]);

  return {
    savedRundowns,
    loading,
    loadRundowns,
    createRundown,
    saveRundown,
    updateRundown,
    deleteRundown,
    duplicateRundown
  };
};
