
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SharedRundownLayout {
  id: string;
  rundown_id: string;
  layout_id: string | null;
  shared_by: string;
  created_at: string;
  updated_at: string;
}

interface ColumnLayout {
  id: string;
  name: string;
  columns: any[];
  is_default: boolean;
  user_id: string;
  team_id?: string;
  created_at: string;
  updated_at: string;
  creator_profile?: {
    full_name: string | null;
    email: string;
  };
}

export const useSharedRundownLayout = (rundownId: string | null) => {
  const { user } = useAuth();
  const [sharedLayout, setSharedLayout] = useState<SharedRundownLayout | null>(null);
  const [availableLayouts, setAvailableLayouts] = useState<ColumnLayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rundownTeamId, setRundownTeamId] = useState<string | null>(null);

  // Load current shared layout for rundown
  const loadSharedLayout = useCallback(async () => {
    if (!rundownId) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch rundown to get its team_id
      const { data: rundownData, error: rundownError } = await supabase
        .from('rundowns')
        .select('team_id')
        .eq('id', rundownId)
        .single();

      if (rundownError) {
        console.error('Error loading rundown:', rundownError);
      } else {
        setRundownTeamId(rundownData?.team_id || null);
      }

      // Fetch shared layout
      const { data, error } = await supabase
        .from('shared_rundown_layouts')
        .select('*')
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading shared layout:', error);
      } else {
        setSharedLayout(data);
      }
    } catch (error) {
      console.error('Failed to load shared layout:', error);
    } finally {
      setIsLoading(false);
    }
  }, [rundownId]);

  // Load user's available layouts (both own and team layouts) - debounced to prevent excessive calls
  const loadAvailableLayouts = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Build query to only fetch layouts relevant to this rundown
      let query = supabase
        .from('column_layouts')
        .select('*');

      // Filter by user's personal layouts OR the rundown's team layouts
      if (rundownTeamId) {
        // For team rundowns: show user's personal layouts + that team's layouts
        query = query.or(`user_id.eq.${user.id},team_id.eq.${rundownTeamId}`);
      } else {
        // For personal rundowns: only show user's personal layouts
        query = query.eq('user_id', user.id).is('team_id', null);
      }

      const { data: layoutsData, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading available layouts:', error);
        return;
      }

      // Get unique user IDs from the layouts to fetch their profiles
      const userIds = [...new Set((layoutsData || []).map(layout => layout.user_id))];
      
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

      // Map the data to include creator profile information
      const mappedLayouts = (layoutsData || []).map(layout => {
        const creatorProfile = profilesData.find(p => p.id === layout.user_id);
        return {
          ...layout,
          creator_profile: creatorProfile ? {
            full_name: creatorProfile.full_name,
            email: creatorProfile.email
          } : null
        };
      });

      // Only update if the data actually changed - OPTIMIZED: avoid expensive JSON.stringify
      setAvailableLayouts(prev => {
        const prevLength = prev.length;
        const newLength = mappedLayouts.length;
        
        // Fast length check first
        if (prevLength !== newLength) {
          return mappedLayouts;
        }
        
        // Shallow comparison of id and updated_at instead of deep JSON.stringify
        const hasChanges = mappedLayouts.some((newLayout, idx) => {
          const oldLayout = prev[idx];
          return !oldLayout || 
                 oldLayout.id !== newLayout.id || 
                 oldLayout.updated_at !== newLayout.updated_at;
        });
        
        if (hasChanges) {
          return mappedLayouts;
        }
        
        return prev; // No change, avoid re-render
      });
    } catch (error) {
      console.error('Failed to load available layouts:', error);
    }
  }, [user?.id, rundownTeamId]);

  // Update shared layout
  const updateSharedLayout = useCallback(async (layoutId: string | null) => {
    if (!rundownId || !user?.id) return;

    try {
      const { error } = await supabase
        .from('shared_rundown_layouts')
        .upsert({
          rundown_id: rundownId,
          layout_id: layoutId,
          shared_by: user.id
        }, {
          onConflict: 'rundown_id'
        });

      if (error) {
        console.error('Error updating shared layout:', error);
      } else {
        await loadSharedLayout();
      }
    } catch (error) {
      console.error('Failed to update shared layout:', error);
    }
  }, [rundownId, user?.id, loadSharedLayout]);

  // Load data when dependencies change
  useEffect(() => {
    loadSharedLayout();
  }, [loadSharedLayout]);

  useEffect(() => {
    loadAvailableLayouts();
  }, [loadAvailableLayouts]);

  return {
    sharedLayout,
    availableLayouts,
    isLoading,
    updateSharedLayout,
    reloadLayouts: loadAvailableLayouts
  };
};
