
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
  const loadingRef = useRef(false);

  useEffect(() => {
    // Skip if storage is still loading or we're already processing
    if (loading || loadingRef.current) {
      return;
    }
    
    const currentRundownId = rundownId || paramId;
    
    // If no rundown ID, this is a new rundown - reset state
    if (!currentRundownId) {
      if (loadedRundownIdRef.current) {
        console.log('Switching to new rundown, resetting state');
        loadedRundownIdRef.current = null;
      }
      return;
    }

    // Don't reload if we've already loaded this exact rundown
    if (loadedRundownIdRef.current === currentRundownId) {
      return;
    }

    // Try to find the rundown in saved rundowns
    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    
    if (!rundown) {
      console.log('Rundown not found in current data:', currentRundownId);
      // Don't retry infinitely - just log and return
      return;
    }

    // Load the rundown data
    console.log('Loading rundown:', rundown.title, 'ID:', currentRundownId);
    loadingRef.current = true;
    
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

      // Load the items with customFields
      if (rundown.items && Array.isArray(rundown.items)) {
        console.log('Loading rundown items:', rundown.items.length);
        const itemsWithCustomFields = rundown.items.map(item => ({
          ...item,
          customFields: item.customFields || {}
        }));
        setItems(itemsWithCustomFields);
      }

      // Mark as loaded
      loadedRundownIdRef.current = currentRundownId;

      // Call the callback
      if (onRundownLoaded) {
        onRundownLoaded(rundown);
      }

      console.log('Rundown loaded successfully:', rundown.title);
    } finally {
      // Reset loading flag after a delay
      setTimeout(() => {
        loadingRef.current = false;
      }, 100);
    }
  }, [rundownId, paramId, savedRundowns, loading]);

  // Reset when rundown ID changes
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    if (loadedRundownIdRef.current && loadedRundownIdRef.current !== currentRundownId) {
      console.log('Rundown ID changed, resetting loader');
      loadedRundownIdRef.current = null;
      loadingRef.current = false;
    }
  }, [rundownId, paramId]);
};
