
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

  useEffect(() => {
    // Prevent loading if already in progress or conditions not met
    if (loading || isLoadingRef.current || savedRundowns.length === 0) {
      return;
    }
    
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
    
    // Mark as loading
    isLoadingRef.current = true;
    loadedRef.current = currentRundownId;
    
    // Load all data in sequence
    try {
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
    } catch (error) {
      console.error('Error loading rundown:', error);
    } finally {
      // Reset loading flag after a short delay
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 100);
    }
  }, [rundownId, paramId, savedRundowns, loading]);

  // Reset when rundown ID changes
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    if (loadedRef.current && loadedRef.current !== currentRundownId) {
      console.log('Rundown ID changed, resetting loader');
      loadedRef.current = null;
      isLoadingRef.current = false;
    }
  }, [rundownId, paramId]);
};
