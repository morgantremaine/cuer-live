
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
}

export const useSharedRundownLayout = (rundownId: string | null) => {
  const { user } = useAuth();
  const [sharedLayout, setSharedLayout] = useState<SharedRundownLayout | null>(null);
  const [availableLayouts, setAvailableLayouts] = useState<ColumnLayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load current shared layout for rundown
  const loadSharedLayout = useCallback(async () => {
    if (!rundownId) {
      setIsLoading(false);
      return;
    }

    try {
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

  // Load user's available layouts
  const loadAvailableLayouts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('column_layouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading available layouts:', error);
      } else {
        setAvailableLayouts(data || []);
      }
    } catch (error) {
      console.error('Failed to load available layouts:', error);
    }
  }, [user?.id]);

  // Update shared layout
  const updateSharedLayout = useCallback(async (layoutId: string | null) => {
    if (!rundownId || !user?.id) return;

    try {
      const { error } = await supabase
        .from('shared_rundown_layouts')
        .upsert({
          rundown_id: rundownId,
          layout_id: layoutId,
          shared_by: user.id,
          updated_at: new Date().toISOString()
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
