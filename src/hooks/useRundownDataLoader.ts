
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
  // Track what we've loaded to prevent re-loading
  const hasLoadedRef = useRef<Set<string>>(new Set());

  const loadRundownData = useCallback(() => {
    // Don't proceed if not initialized or still loading data
    if (!isInitialized || loading) {
      return;
    }

    const loadKey = rundownId || 'new';
    
    // If we've already loaded this rundown, skip
    if (hasLoadedRef.current.has(loadKey)) {
      return;
    }

    // Mark as loading to prevent duplicate calls
    hasLoadedRef.current.add(loadKey);

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
      } else if (!rundownId) {
        console.log('New rundown, using default title');
        setRundownTitle('Live Broadcast Rundown');
      }
    } catch (error) {
      console.error('Error loading rundown data:', error);
      // Remove from loaded set on error so it can be retried
      hasLoadedRef.current.delete(loadKey);
    }
  }, [rundownId, savedRundowns, loading, isInitialized, setRundownTitle, setTimezone, setRundownStartTime, handleLoadLayout]);

  // Reset loaded state when rundown changes
  useEffect(() => {
    // Clear loaded state when rundown ID changes
    return () => {
      const loadKey = rundownId || 'new';
      hasLoadedRef.current.delete(loadKey);
    };
  }, [rundownId]);

  // Load data when conditions are met
  useEffect(() => {
    loadRundownData();
  }, [loadRundownData]);
};
