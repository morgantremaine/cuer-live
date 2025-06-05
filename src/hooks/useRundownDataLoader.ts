
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
  const isLoadingRef = useRef(false);
  const lastLoadedDataRef = useRef<string | null>(null);

  useEffect(() => {
    // Only proceed if we have rundowns loaded and a specific rundown ID
    if (loading || savedRundowns.length === 0 || isLoadingRef.current) return;
    
    const currentRundownId = rundownId || paramId;
    if (!currentRundownId) return;

    // Prevent loading the same rundown multiple times
    if (loadedRef.current === currentRundownId) return;

    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    if (!rundown) return;

    // Create a signature to detect if we're trying to load the same data
    const dataSignature = `${rundown.id}-${rundown.items?.length || 0}-${rundown.title}`;
    if (lastLoadedDataRef.current === dataSignature) {
      return;
    }

    console.log('Loading rundown data:', rundown.title, 'with items:', rundown.items?.length || 0);
    
    // Mark as loading and loaded to prevent loops
    isLoadingRef.current = true;
    loadedRef.current = currentRundownId;
    lastLoadedDataRef.current = dataSignature;
    
    // Use setTimeout to break out of React's render cycle
    setTimeout(() => {
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

        // Call the callback with the loaded rundown
        if (onRundownLoaded) {
          onRundownLoaded(rundown);
        }
      } finally {
        // Reset loading flag after a delay to prevent rapid re-triggers
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 1000);
      }
    }, 100);
  }, [
    rundownId, 
    paramId, 
    savedRundowns.length,
    loading, 
    setRundownTitle, 
    setTimezone, 
    setRundownStartTime, 
    handleLoadLayout,
    setItems,
    onRundownLoaded
  ]);

  // Reset loaded reference when rundown ID changes
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    if (loadedRef.current && loadedRef.current !== currentRundownId) {
      loadedRef.current = null;
      isLoadingRef.current = false;
      lastLoadedDataRef.current = null;
    }
  }, [rundownId, paramId]);
};
