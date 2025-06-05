
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SavedRundown } from './useRundownStorage/types';
import { Column } from './useColumnsManager';
import { RundownItem } from '@/types/rundown';

interface UseSimpleDataLoaderProps {
  savedRundowns: SavedRundown[];
  loading: boolean;
  setRundownTitle: (title: string) => void;
  setTimezone: (timezone: string) => void;
  setRundownStartTime: (startTime: string) => void;
  handleLoadLayout: (columns: Column[]) => void;
  setItems: (items: RundownItem[]) => void;
  setIsLoading: (loading: boolean) => void;
  onRundownLoaded?: (rundown: SavedRundown) => void;
}

export const useSimpleDataLoader = ({
  savedRundowns,
  loading,
  setRundownTitle,
  setTimezone,
  setRundownStartTime,
  handleLoadLayout,
  setItems,
  setIsLoading,
  onRundownLoaded
}: UseSimpleDataLoaderProps) => {
  const params = useParams<{ id: string }>();
  const rundownId = params.id;
  const loadedRef = useRef<string | null>(null);

  console.log('Simple data loader: Current params and rundown ID:', {
    paramsId: params.id,
    rundownId,
    loadedRef: loadedRef.current
  });

  useEffect(() => {
    console.log('Simple data loader: Effect triggered with:', {
      loading,
      rundownId,
      savedRundownsLength: savedRundowns.length,
      loadedRef: loadedRef.current
    });

    if (loading || !rundownId || !savedRundowns.length) {
      console.log('Simple data loader: Early return due to:', {
        loading,
        rundownId: !!rundownId,
        hasSavedRundowns: savedRundowns.length > 0
      });
      return;
    }

    // Skip if already loaded
    if (loadedRef.current === rundownId) {
      console.log('Simple data loader: Already loaded rundown:', rundownId);
      return;
    }

    const rundown = savedRundowns.find(r => r.id === rundownId);
    if (!rundown) {
      console.log('Simple data loader: No rundown found for ID:', rundownId);
      return;
    }

    console.log('Simple data loader: Loading rundown:', rundownId);
    setIsLoading(true);

    try {
      // Set metadata
      setRundownTitle(rundown.title);
      if (rundown.timezone) setTimezone(rundown.timezone);
      if (rundown.start_time) setRundownStartTime(rundown.start_time);
      
      // Load columns
      if (rundown.columns) handleLoadLayout(rundown.columns);
      
      // Load items
      const items = rundown.items || [];
      setItems(items);
      
      // Mark as loaded
      loadedRef.current = rundownId;
      onRundownLoaded?.(rundown);
      
      console.log('Simple data loader: Successfully loaded rundown with', items.length, 'items');
    } catch (error) {
      console.error('Simple data loader: Error loading rundown:', error);
    } finally {
      setIsLoading(false);
    }
  }, [rundownId, savedRundowns, loading, setRundownTitle, setTimezone, setRundownStartTime, handleLoadLayout, setItems, setIsLoading, onRundownLoaded]);

  // Reset when rundown changes
  useEffect(() => {
    if (rundownId && loadedRef.current && rundownId !== loadedRef.current) {
      console.log('Simple data loader: Rundown ID changed from', loadedRef.current, 'to', rundownId, '- resetting loaded state');
      loadedRef.current = null;
    }
  }, [rundownId]);

  return {
    isLoading: loadedRef.current !== rundownId
  };
};
