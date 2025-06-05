
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
    if (loading || isLoadingRef.current) return;
    
    const currentRundownId = rundownId || paramId;
    
    // If no rundown ID, this is a new rundown - don't load anything
    if (!currentRundownId) {
      // Reset state for new rundown only if we previously had a loaded rundown
      if (loadedRundownIdRef.current) {
        console.log('Switching to new rundown, resetting loader state');
        loadedRundownIdRef.current = null;
      }
      return;
    }

    // Don't reload if we've already loaded this exact rundown
    if (loadedRundownIdRef.current === currentRundownId) {
      return;
    }

    // Find the rundown in saved rundowns
    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    if (!rundown) {
      console.log('Rundown not found:', currentRundownId);
      return;
    }

    console.log('Loading rundown data:', rundown.title, 'with items:', rundown.items?.length || 0);
    
    // Mark as loading to prevent concurrent loads
    isLoadingRef.current = true;
    
    // Load the rundown data immediately
    try {
      // Set the rundown data
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

      // Load the items - ENSURE they have customFields
      if (rundown.items && Array.isArray(rundown.items)) {
        console.log('Setting rundown items:', rundown.items.length);
        const itemsWithCustomFields = rundown.items.map(item => ({
          ...item,
          customFields: item.customFields || {}
        }));
        setItems(itemsWithCustomFields);
      }

      // Mark as successfully loaded
      loadedRundownIdRef.current = currentRundownId;

      // Call the callback with the loaded rundown
      if (onRundownLoaded) {
        onRundownLoaded(rundown);
      }
    } finally {
      // Reset loading flag after a short delay to ensure all updates are processed
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 100);
    }
  }, [
    rundownId, 
    paramId, 
    savedRundowns,
    loading
  ]);

  // Reset when rundown ID changes
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    if (loadedRundownIdRef.current && loadedRundownIdRef.current !== currentRundownId) {
      console.log('Rundown ID changed, resetting loader state');
      loadedRundownIdRef.current = null;
      isLoadingRef.current = false;
    }
  }, [rundownId, paramId]);
};
