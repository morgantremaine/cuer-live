
import { useEffect, useCallback, useRef } from 'react';

interface UseRundownDataLoaderProps {
  rundownId: string | undefined;
  savedRundowns: any[];
  loading: boolean;
  isInitialized: boolean;
  setRundownTitle: (title: string) => void;
  setTimezone: (timezone: string) => void;
  setRundownStartTime: (startTime: string) => void;
  handleLoadLayout: (columns: any[]) => void;
}

export const useRundownDataLoader = ({
  rundownId,
  savedRundowns,
  loading,
  isInitialized,
  setRundownTitle,
  setTimezone,
  setRundownStartTime,
  handleLoadLayout
}: UseRundownDataLoaderProps) => {
  // Track what we've loaded globally to prevent any re-loading
  const loadedStateRef = useRef<{
    rundownId: string | undefined;
    isLoaded: boolean;
    isProcessing: boolean;
  }>({
    rundownId: undefined,
    isLoaded: false,
    isProcessing: false
  });

  // Load rundown data only once per rundown
  const loadRundownData = useCallback(() => {
    // If we're already processing or have loaded this rundown, skip
    if (loadedStateRef.current.isProcessing || 
        (loadedStateRef.current.rundownId === rundownId && loadedStateRef.current.isLoaded)) {
      return;
    }

    // Don't proceed if not initialized or still loading data
    if (!isInitialized || loading) {
      return;
    }

    loadedStateRef.current.isProcessing = true;

    try {
      if (rundownId && savedRundowns.length > 0) {
        const existingRundown = savedRundowns.find(r => r.id === rundownId);
        if (existingRundown) {
          console.log('Loading rundown data:', { 
            id: rundownId, 
            title: existingRundown.title, 
            timezone: existingRundown.timezone,
            startTime: existingRundown.start_time
          });
          
          if (existingRundown.title) {
            console.log('Setting title from saved rundown:', existingRundown.title);
            setRundownTitle(existingRundown.title);
          }
          
          if (existingRundown.timezone) {
            console.log('Setting timezone from saved rundown:', existingRundown.timezone);
            setTimezone(existingRundown.timezone);
          }

          if (existingRundown.start_time) {
            console.log('Setting start time from saved rundown:', existingRundown.start_time);
            setRundownStartTime(existingRundown.start_time);
          }
          
          if (existingRundown.columns && Array.isArray(existingRundown.columns)) {
            console.log('Loading column layout:', existingRundown.columns);
            handleLoadLayout(existingRundown.columns);
          }
        }
        
        // Mark as loaded
        loadedStateRef.current = {
          rundownId,
          isLoaded: true,
          isProcessing: false
        };
      } else if (!rundownId && loadedStateRef.current.rundownId !== 'new') {
        console.log('New rundown, using default title');
        setRundownTitle('Live Broadcast Rundown');
        loadedStateRef.current = {
          rundownId: 'new',
          isLoaded: true,
          isProcessing: false
        };
      } else {
        loadedStateRef.current.isProcessing = false;
      }
    } catch (error) {
      console.error('Error loading rundown data:', error);
      loadedStateRef.current.isProcessing = false;
    }
  }, [rundownId, savedRundowns, loading, isInitialized, setRundownTitle, setTimezone, setRundownStartTime, handleLoadLayout]);

  // Load data when conditions are met
  useEffect(() => {
    // Reset state when rundown changes
    if (loadedStateRef.current.rundownId !== rundownId) {
      loadedStateRef.current = {
        rundownId: undefined,
        isLoaded: false,
        isProcessing: false
      };
    }

    loadRundownData();
  }, [loadRundownData]);
};
