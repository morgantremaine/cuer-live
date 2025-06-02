
import { useEffect, useCallback, useRef } from 'react';

interface UseRundownDataLoaderProps {
  rundownId: string | undefined;
  savedRundowns: any[];
  loading: boolean;
  setRundownTitle: (title: string) => void;
  setTimezone: (timezone: string) => void;
  setRundownStartTime: (startTime: string) => void;
  handleLoadLayout: (columns: any[]) => void;
}

export const useRundownDataLoader = ({
  rundownId,
  savedRundowns,
  loading,
  setRundownTitle,
  setTimezone,
  setRundownStartTime,
  handleLoadLayout
}: UseRundownDataLoaderProps) => {
  // Track what we've already loaded to prevent re-loading
  const loadedDataRef = useRef<{ [key: string]: boolean }>({});
  const isProcessingRef = useRef(false);

  // Load rundown data only once per rundown
  const loadRundownData = useCallback(() => {
    if (loading || isProcessingRef.current) {
      return;
    }

    const currentKey = rundownId || 'new';
    
    // Skip if already loaded
    if (loadedDataRef.current[currentKey]) {
      return;
    }

    isProcessingRef.current = true;

    try {
      if (rundownId && savedRundowns.length > 0) {
        const existingRundown = savedRundowns.find(r => r.id === rundownId);
        if (existingRundown) {
          console.log('Loading rundown data:', { 
            id: rundownId, 
            title: existingRundown.title, 
            timezone: existingRundown.timezone,
            startTime: existingRundown.startTime || existingRundown.start_time
          });
          
          // Mark as loaded before setting data to prevent loops
          loadedDataRef.current[currentKey] = true;
          
          if (existingRundown.title) {
            console.log('Setting title from saved rundown:', existingRundown.title);
            setRundownTitle(existingRundown.title);
          }
          
          if (existingRundown.timezone) {
            console.log('Setting timezone from saved rundown:', existingRundown.timezone);
            setTimezone(existingRundown.timezone);
          }

          // Handle both startTime and start_time fields for compatibility
          const startTime = existingRundown.startTime || existingRundown.start_time;
          if (startTime) {
            console.log('Setting start time from saved rundown:', startTime);
            setRundownStartTime(startTime);
          }
          
          if (existingRundown.columns && Array.isArray(existingRundown.columns)) {
            console.log('Loading column layout:', existingRundown.columns);
            handleLoadLayout(existingRundown.columns);
          }
        }
      } else if (!rundownId) {
        console.log('New rundown, using default title');
        loadedDataRef.current[currentKey] = true;
        setRundownTitle('Live Broadcast Rundown');
        // Don't set default timezone for new rundowns - let it use the default from useRundownBasicState
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [rundownId, savedRundowns, loading, setRundownTitle, setTimezone, setRundownStartTime, handleLoadLayout]);

  // Load data when conditions are met
  useEffect(() => {
    // Don't proceed if still loading
    if (loading) return;
    
    // For existing rundowns, wait for savedRundowns to be available
    if (rundownId && savedRundowns.length === 0) return;
    
    // Load the data
    loadRundownData();
  }, [rundownId, savedRundowns.length, loading, loadRundownData]);

  // Clean up when rundown changes
  useEffect(() => {
    return () => {
      isProcessingRef.current = false;
    };
  }, [rundownId]);
};
