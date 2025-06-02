
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
  const loadedRundownRef = useRef<string | undefined>(undefined);
  const isProcessingRef = useRef(false);

  // Load rundown data only once per rundown
  const loadRundownData = useCallback(() => {
    if (loading || isProcessingRef.current || loadedRundownRef.current === rundownId) {
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
            startTime: existingRundown.start_time
          });
          
          // Mark as loaded first to prevent loops
          loadedRundownRef.current = rundownId;
          
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
        } else {
          loadedRundownRef.current = rundownId;
        }
      } else if (!rundownId && loadedRundownRef.current !== 'new') {
        console.log('New rundown, using default title');
        loadedRundownRef.current = 'new';
        setRundownTitle('Live Broadcast Rundown');
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [rundownId, savedRundowns, loading, setRundownTitle, setTimezone, setRundownStartTime, handleLoadLayout]);

  // Load data when conditions are met
  useEffect(() => {
    if (loading) return;
    if (rundownId && savedRundowns.length === 0) return;
    
    loadRundownData();
  }, [loadRundownData]);

  // Reset when rundown changes
  useEffect(() => {
    if (loadedRundownRef.current !== rundownId) {
      loadedRundownRef.current = undefined;
      isProcessingRef.current = false;
    }
  }, [rundownId]);
};
