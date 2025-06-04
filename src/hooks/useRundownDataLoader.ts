
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
  setItems: (items: RundownItem[]) => void; // Add setItems prop
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
  setItems, // Add setItems parameter
  onRundownLoaded
}: UseRundownDataLoaderProps) => {
  const params = useParams<{ id: string }>();
  const paramId = params.id;
  const loadedRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const lastLoadedDataRef = useRef<string>('');

  useEffect(() => {
    // Only proceed if we have rundowns loaded and a specific rundown ID
    if (loading || savedRundowns.length === 0 || isLoadingRef.current) return;
    
    const currentRundownId = rundownId || paramId;
    if (!currentRundownId) return;

    // Prevent loading the same rundown multiple times
    if (loadedRef.current === currentRundownId) return;

    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    if (!rundown) return;

    // Create a signature to check if data actually changed
    const dataSignature = JSON.stringify({
      title: rundown.title,
      timezone: rundown.timezone,
      startTime: rundown.start_time, // Use start_time property
      columnsLength: rundown.columns?.length || 0,
      itemsLength: rundown.items?.length || 0 // Include items in signature
    });

    // Skip if same data was already loaded
    if (lastLoadedDataRef.current === dataSignature) return;

    console.log('Loading rundown data:', rundown.title);
    
    // Mark as loading and loaded to prevent loops
    isLoadingRef.current = true;
    loadedRef.current = currentRundownId;
    lastLoadedDataRef.current = dataSignature;
    
    // Set the rundown data
    setRundownTitle(rundown.title);
    
    if (rundown.timezone) {
      setTimezone(rundown.timezone);
    }
    
    if (rundown.start_time) { // Use start_time property
      setRundownStartTime(rundown.start_time || '09:00:00');
    }
    
    if (rundown.columns) {
      handleLoadLayout(rundown.columns);
    }

    // Load the rundown items
    if (rundown.items) {
      console.log('Loading rundown items:', rundown.items.length);
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
    savedRundowns.length, // Use length instead of the array to prevent unnecessary re-runs
    loading, 
    setRundownTitle, 
    setTimezone, 
    setRundownStartTime, 
    handleLoadLayout,
    setItems, // Add setItems to dependencies
    onRundownLoaded
  ]);

  // Reset loaded reference when rundown ID changes
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    if (loadedRef.current && loadedRef.current !== currentRundownId) {
      loadedRef.current = null;
      isLoadingRef.current = false;
      lastLoadedDataRef.current = '';
    }
  }, [rundownId, paramId]);
};
