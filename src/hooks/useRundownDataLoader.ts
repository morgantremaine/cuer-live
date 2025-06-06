
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SavedRundown } from './useRundownStorage/types';
import { Column } from './useColumnsManager';
import { RundownItem } from '@/types/rundown';

interface UseRundownDataLoaderProps {
  rundownId?: string;
  savedRundowns: SavedRundown[];
  loading: boolean;
  setRundownTitle: (title: string) => void;
  setTimezone: (timezone: string) => void;
  setRundownStartTime: (startTime: string) => void;
  handleLoadLayout: (columns: Column[]) => void;
  setItems: (items: RundownItem[]) => void;
  onRundownLoaded?: (rundown: SavedRundown) => void;
}

export const useRundownDataLoader = ({
  rundownId,
  savedRundowns,
  loading,
  setRundownTitle,
  setTimezone,
  setRundownStartTime,
  handleLoadLayout,
  setItems,
  onRundownLoaded
}: UseRundownDataLoaderProps) => {
  const params = useParams<{ id: string }>();
  const paramId = params.id;
  const loadedRef = useRef<string | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (loading || savedRundowns.length === 0 || processingRef.current) return;
    
    const currentRundownId = rundownId || paramId;
    if (!currentRundownId) return;

    // Skip if already loaded this rundown
    if (loadedRef.current === currentRundownId) return;

    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    if (!rundown) {
      console.log('Rundown not found:', currentRundownId);
      return;
    }

    console.log('Loading rundown data:', rundown.title, 'with items:', rundown.items?.length || 0);
    
    // Mark as processing
    processingRef.current = true;
    loadedRef.current = currentRundownId;
    
    // Load all data synchronously
    setRundownTitle(rundown.title);
    
    if (rundown.timezone) {
      setTimezone(rundown.timezone);
    }
    
    if (rundown.start_time) {
      setRundownStartTime(rundown.start_time);
    }
    
    if (rundown.columns) {
      handleLoadLayout(rundown.columns);
    }

    if (rundown.items && Array.isArray(rundown.items)) {
      console.log('Setting rundown items:', rundown.items.length);
      setItems(rundown.items);
    }

    // Call the callback
    if (onRundownLoaded) {
      onRundownLoaded(rundown);
    }

    // Reset processing flag
    setTimeout(() => {
      processingRef.current = false;
    }, 100);
  }, [rundownId, paramId, savedRundowns.length, loading]);

  // Reset when rundown ID changes
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    if (loadedRef.current && loadedRef.current !== currentRundownId) {
      console.log('Rundown ID changed, resetting loader');
      loadedRef.current = null;
      processingRef.current = false;
    }
  }, [rundownId, paramId]);
};
