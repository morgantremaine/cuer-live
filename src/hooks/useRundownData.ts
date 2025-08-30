
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { RundownItem } from '@/types/rundown';
import { logger } from '@/utils/logger';

interface RundownData {
  id: string;
  title: string;
  items: RundownItem[];
  columns: any[];
  startTime: string;
  timezone?: string;
  visibility?: string;
}

export const useRundownData = () => {
  const params = useParams<{ id: string }>();
  const rundownId = params.id;
  
  const [data, setData] = useState<RundownData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedRundownRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!rundownId) {
      setError('No rundown ID provided');
      setIsLoading(false);
      return;
    }

    // Prevent duplicate loading for the same rundown
    if (loadedRundownRef.current === rundownId || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    loadedRundownRef.current = rundownId;

    try {
      const { data: rundownData, error: queryError } = await supabase
        .from('rundowns')
        .select('id, title, items, columns, start_time, timezone, visibility')
        .eq('id', rundownId)
        .maybeSingle();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          setError('Rundown not found');
        } else {
          setError(`Database error: ${queryError.message}`);
        }
        setData(null);
      } else if (rundownData) {
        setData({
          id: rundownData.id,
          title: rundownData.title || 'Untitled Rundown',
          items: rundownData.items || [],
          columns: rundownData.columns || [],
          startTime: rundownData.start_time || '09:00:00',
          timezone: rundownData.timezone || 'UTC',
          visibility: rundownData.visibility || 'private'
        });
        setError(null);
      } else {
        setError('Rundown not found');
        setData(null);
      }
    } catch (error) {
      logger.error(`Failed to load rundown data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setError('Failed to load rundown data');
      setData(null);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [rundownId]);

  // Load data when rundown ID changes
  useEffect(() => {
    if (rundownId !== loadedRundownRef.current) {
      loadedRundownRef.current = null; // Reset to allow new load
      loadData();
    }
  }, [rundownId, loadData]);

  return {
    data,
    isLoading,
    error,
    reload: loadData,
    rundownId
  };
};
