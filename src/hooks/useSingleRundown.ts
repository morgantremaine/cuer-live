import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RundownItem } from '@/types/rundown';

interface SingleRundownData {
  id: string;
  title: string;
  items: RundownItem[];
  start_time: string | null;
  timezone: string | null;
  numbering_locked: boolean | null;
  locked_row_numbers: { [itemId: string]: string } | null;
  columns: any;
  show_date: string | null;
  team_id: string;
  user_id: string;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Hook to fetch a single rundown by ID.
 * Unlike useRundownStorage which loads ALL rundowns, this hook only fetches
 * the specific rundown needed, reducing memory usage from 700MB+ to ~400MB
 * for users with many rundowns.
 */
export const useSingleRundown = (rundownId: string | undefined) => {
  const { user } = useAuth();
  const [rundown, setRundown] = useState<SingleRundownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedIdRef = useRef<string | null>(null);

  const loadRundown = useCallback(async () => {
    if (!rundownId || !user) {
      setLoading(false);
      return;
    }

    // Prevent duplicate loads for the same ID
    if (loadedIdRef.current === rundownId && rundown) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('rundowns')
        .select('id, title, items, start_time, timezone, numbering_locked, locked_row_numbers, columns, show_date, team_id, user_id, created_at, updated_at')
        .eq('id', rundownId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // Not found
          setRundown(null);
          setError('Rundown not found');
        } else {
          throw fetchError;
        }
      } else {
        loadedIdRef.current = rundownId;
        setRundown({
          ...data,
          items: (data.items as RundownItem[]) || [],
          locked_row_numbers: data.locked_row_numbers as { [itemId: string]: string } | null
        });
      }
    } catch (err) {
      console.error('Error loading rundown:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rundown');
      setRundown(null);
    } finally {
      setLoading(false);
    }
  }, [rundownId, user, rundown]);

  useEffect(() => {
    loadRundown();
  }, [rundownId, user?.id]);

  const reload = useCallback(() => {
    loadedIdRef.current = null; // Force reload
    loadRundown();
  }, [loadRundown]);

  return {
    rundown,
    loading,
    error,
    reload
  };
};
