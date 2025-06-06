
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
  const lastRundownHashRef = useRef<string>('');

  useEffect(() => {
    // Only proceed if we have rundowns loaded and a specific rundown ID
    if (loading || savedRundowns.length === 0 || isLoadingRef.current) return;
    
    const currentRundownId = rundownId || paramId;
    if (!currentRundownId) return;

    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    if (!rundown) return;

    // Create a hash of the rundown data to detect when it actually changes
    const rundownHash = JSON.stringify({
      title: rundown.title,
      items: rundown.items,
      columns: rundown.columns,
      timezone: rundown.timezone,
      start_time: rundown.start_time,
      updated_at: rundown.updated_at
    });

    // Check if this is the same rundown with the same data we already loaded
    const isSameRundownId = loadedRef.current === currentRundownId;
    const isSameData = lastRundownHashRef.current === rundownHash;

    if (isSameRundownId && isSameData) {
      console.log('🔄 Skipping reload - same rundown data already loaded');
      return;
    }

    console.log('🔄 Loading rundown data:', rundown.title, 'with items:', rundown.items?.length || 0);
    console.log('🔄 Data changed:', !isSameData, 'Rundown changed:', !isSameRundownId);
    
    // Mark as loading and loaded to prevent loops
    isLoadingRef.current = true;
    loadedRef.current = currentRundownId;
    lastRundownHashRef.current = rundownHash;
    
    // Set the rundown data
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

    // CRITICAL: Load the items back into the state
    if (rundown.items && Array.isArray(rundown.items)) {
      console.log('🔄 Setting rundown items:', rundown.items.length);
      setItems(rundown.items);
    }

    // Call the callback with the loaded rundown
    if (onRundownLoaded) {
      onRundownLoaded(rundown);
    }

    // Reset loading flag after a short delay
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 100);
  }, [
    rundownId, 
    paramId, 
    savedRundowns, // Changed from savedRundowns.length to full savedRundowns array
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
      console.log('🔄 Rundown ID changed, resetting loader state');
      loadedRef.current = null;
      lastRundownHashRef.current = '';
      isLoadingRef.current = false;
    }
  }, [rundownId, paramId]);
};
