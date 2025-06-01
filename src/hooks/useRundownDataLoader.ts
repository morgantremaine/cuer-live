
import { useEffect, useCallback, useRef } from 'react';

interface UseRundownDataLoaderProps {
  rundownId: string | undefined;
  savedRundowns: any[];
  loading: boolean;
  setRundownTitle: (title: string) => void;
  setTimezone: (timezone: string) => void;
  handleLoadLayout: (columns: any[]) => void;
}

export const useRundownDataLoader = ({
  rundownId,
  savedRundowns,
  loading,
  setRundownTitle,
  setTimezone,
  handleLoadLayout
}: UseRundownDataLoaderProps) => {
  const loadedRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // Memoize the loading logic to prevent infinite loops
  const loadRundownData = useCallback(() => {
    if (loading || isLoadingRef.current) return;
    
    // Prevent duplicate loading
    if (loadedRef.current === (rundownId || 'new')) return;
    
    isLoadingRef.current = true;

    try {
      if (rundownId && savedRundowns.length > 0) {
        const existingRundown = savedRundowns.find(r => r.id === rundownId);
        if (existingRundown && loadedRef.current !== rundownId) {
          console.log('Loading rundown data:', { id: rundownId, title: existingRundown.title, timezone: existingRundown.timezone });
          
          loadedRef.current = rundownId;
          
          // Use direct setters without change tracking for initial load
          if (existingRundown.title) {
            console.log('Setting title from saved rundown:', existingRundown.title);
            setRundownTitle(existingRundown.title);
          }
          
          if (existingRundown.timezone) {
            console.log('Setting timezone from saved rundown:', existingRundown.timezone);
            setTimezone(existingRundown.timezone);
          }
          
          // Load column layout if it exists
          if (existingRundown.columns && Array.isArray(existingRundown.columns)) {
            console.log('Loading column layout:', existingRundown.columns);
            handleLoadLayout(existingRundown.columns);
          }
        }
      } else if (!rundownId && loadedRef.current !== 'new') {
        console.log('New rundown, using default title and timezone');
        loadedRef.current = 'new';
        setRundownTitle('Live Broadcast Rundown');
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, [rundownId, savedRundowns, loading, setRundownTitle, setTimezone, handleLoadLayout]);

  // Load data when rundown ID changes or when savedRundowns are first loaded
  useEffect(() => {
    if (loading) return;
    
    // For existing rundowns, wait for savedRundowns to be loaded
    if (rundownId && savedRundowns.length === 0) return;
    
    loadRundownData();
  }, [rundownId, savedRundowns.length, loading, loadRundownData]);

  // Reset when rundown changes
  useEffect(() => {
    const currentKey = rundownId || 'new';
    if (loadedRef.current && loadedRef.current !== currentKey) {
      loadedRef.current = null;
      isLoadingRef.current = false;
    }
  }, [rundownId]);
};
