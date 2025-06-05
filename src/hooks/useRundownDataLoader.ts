
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
  const loadAttemptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

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
        retryCountRef.current = 0;
      }
      return;
    }

    // Don't reload if we've already loaded this exact rundown
    if (loadedRundownIdRef.current === currentRundownId) {
      return;
    }

    // Clear any pending load attempts
    if (loadAttemptTimeoutRef.current) {
      clearTimeout(loadAttemptTimeoutRef.current);
      loadAttemptTimeoutRef.current = null;
    }

    // Reset retry count for new rundown
    if (loadedRundownIdRef.current !== currentRundownId) {
      retryCountRef.current = 0;
    }

    // Try to find the rundown in saved rundowns
    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    
    if (!rundown) {
      // Only retry a few times to avoid infinite loops
      if (retryCountRef.current < 3) {
        console.log(`Rundown not found, waiting for storage refresh (attempt ${retryCountRef.current + 1}):`, currentRundownId);
        retryCountRef.current++;
        
        loadAttemptTimeoutRef.current = setTimeout(() => {
          const retryRundown = savedRundowns.find(r => r.id === currentRundownId);
          if (!retryRundown) {
            console.log('Rundown still not found after retry:', currentRundownId);
            return;
          }
          
          // Load the rundown now that it's available
          loadRundownData(retryRundown, currentRundownId);
        }, 1000);
      } else {
        console.log('Max retries reached for rundown:', currentRundownId);
      }
      
      return;
    }

    loadRundownData(rundown, currentRundownId);
  }, [
    rundownId, 
    paramId, 
    savedRundowns,
    loading
  ]);

  const loadRundownData = (rundown: SavedRundown, currentRundownId: string) => {
    // Prevent loading the same rundown multiple times
    if (loadedRundownIdRef.current === currentRundownId && !isLoadingRef.current) {
      console.log('Rundown already loaded, skipping:', currentRundownId);
      return;
    }

    console.log('Loading rundown data:', rundown.title, 'with items:', rundown.items?.length || 0);
    
    // Mark as loading to prevent concurrent loads
    isLoadingRef.current = true;
    
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

      // Mark as successfully loaded BEFORE calling callback
      loadedRundownIdRef.current = currentRundownId;
      retryCountRef.current = 0;

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
  };

  // Reset when rundown ID changes
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    if (loadedRundownIdRef.current && loadedRundownIdRef.current !== currentRundownId) {
      console.log('Rundown ID changed, resetting loader state');
      loadedRundownIdRef.current = null;
      isLoadingRef.current = false;
      retryCountRef.current = 0;
      
      // Clear any pending load attempts
      if (loadAttemptTimeoutRef.current) {
        clearTimeout(loadAttemptTimeoutRef.current);
        loadAttemptTimeoutRef.current = null;
      }
    }
  }, [rundownId, paramId]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (loadAttemptTimeoutRef.current) {
        clearTimeout(loadAttemptTimeoutRef.current);
      }
    };
  }, []);
};
