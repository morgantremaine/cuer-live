
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
  // Track what we've already loaded to prevent re-loading
  const loadedRundownRef = useRef<string | undefined>(undefined);
  const isLoadingRef = useRef(false);

  // Stable function references
  const stableFunctions = useRef({
    setRundownTitle,
    setTimezone,
    setRundownStartTime,
    handleLoadLayout
  });

  // Update function references
  useEffect(() => {
    stableFunctions.current = {
      setRundownTitle,
      setTimezone,
      setRundownStartTime,
      handleLoadLayout
    };
  }, [setRundownTitle, setTimezone, setRundownStartTime, handleLoadLayout]);

  // Load rundown data only once per rundown
  const loadRundownData = useCallback(() => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) return;
    
    // Don't proceed if not initialized, loading, or already loaded
    if (!isInitialized || loading || loadedRundownRef.current === rundownId) {
      return;
    }

    isLoadingRef.current = true;

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
          
          // Mark as loaded first to prevent loops
          loadedRundownRef.current = rundownId;
          
          if (existingRundown.title) {
            console.log('Setting title from saved rundown:', existingRundown.title);
            stableFunctions.current.setRundownTitle(existingRundown.title);
          }
          
          if (existingRundown.timezone) {
            console.log('Setting timezone from saved rundown:', existingRundown.timezone);
            stableFunctions.current.setTimezone(existingRundown.timezone);
          }

          if (existingRundown.start_time) {
            console.log('Setting start time from saved rundown:', existingRundown.start_time);
            stableFunctions.current.setRundownStartTime(existingRundown.start_time);
          }
          
          if (existingRundown.columns && Array.isArray(existingRundown.columns)) {
            console.log('Loading column layout:', existingRundown.columns);
            stableFunctions.current.handleLoadLayout(existingRundown.columns);
          }
        } else {
          loadedRundownRef.current = rundownId;
        }
      } else if (!rundownId && loadedRundownRef.current !== 'new') {
        console.log('New rundown, using default title');
        loadedRundownRef.current = 'new';
        stableFunctions.current.setRundownTitle('Live Broadcast Rundown');
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, [rundownId, savedRundowns.length, loading, isInitialized]);

  // Load data when conditions are met - use stable dependencies
  useEffect(() => {
    if (!isInitialized) return;
    
    // For existing rundowns, wait for savedRundowns to load
    if (rundownId && savedRundowns.length === 0 && !loading) return;
    
    loadRundownData();
  }, [isInitialized, rundownId, savedRundowns.length, loading, loadRundownData]);

  // Reset when rundown changes
  useEffect(() => {
    if (loadedRundownRef.current !== rundownId) {
      loadedRundownRef.current = undefined;
      isLoadingRef.current = false;
    }
  }, [rundownId]);
};
