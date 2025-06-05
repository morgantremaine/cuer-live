
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
  const loadedRundownIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // Skip if storage is still loading or we're already loading
    if (loading || isLoadingRef.current) {
      return;
    }
    
    const currentRundownId = rundownId || paramId;
    
    // If no rundown ID, this is a new rundown
    if (!currentRundownId) {
      if (loadedRundownIdRef.current) {
        console.log('Data loader: Switching to new rundown');
        loadedRundownIdRef.current = null;
      }
      return;
    }

    // Don't reload if we've already loaded this exact rundown
    if (loadedRundownIdRef.current === currentRundownId) {
      return;
    }

    // Find the rundown
    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    
    if (!rundown) {
      console.log('Data loader: Rundown not found:', currentRundownId);
      return;
    }

    // Set loading flag to prevent concurrent loads
    isLoadingRef.current = true;

    try {
      console.log('Data loader: Loading rundown:', rundown.title);
      
      setRundownTitle(rundown.title);
      
      if (rundown.timezone) {
        setTimezone(rundown.timezone);
      }
      
      if (rundown.startTime || rundown.start_time) {
        setRundownStartTime(rundown.startTime || rundown.start_time || '09:00:00');
      }
      
      if (rundown.columns) {
        handleLoadLayout(rundown.columns);
      }

      if (rundown.items && Array.isArray(rundown.items)) {
        console.log('Data loader: Loading items:', rundown.items.length);
        const itemsWithCustomFields = rundown.items.map(item => ({
          ...item,
          customFields: item.customFields || {}
        }));
        setItems(itemsWithCustomFields);
      }

      // Mark as loaded
      loadedRundownIdRef.current = currentRundownId;

      if (onRundownLoaded) {
        onRundownLoaded(rundown);
      }

      console.log('Data loader: Rundown loaded successfully');
    } finally {
      isLoadingRef.current = false;
    }
  }, [rundownId, paramId, savedRundowns, loading]);

  // Reset when rundown ID changes
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    if (loadedRundownIdRef.current && loadedRundownIdRef.current !== currentRundownId) {
      console.log('Data loader: Rundown ID changed, resetting');
      loadedRundownIdRef.current = null;
      isLoadingRef.current = false;
    }
  }, [rundownId, paramId]);
};
