
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

  // Memoize the loading logic to prevent infinite loops
  const loadRundownData = useCallback(() => {
    if (loading) return;
    
    // Prevent duplicate loading
    if (loadedRef.current === rundownId) return;
    
    if (rundownId && savedRundowns.length > 0) {
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      if (existingRundown) {
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
      } else {
        console.log('Rundown not found:', rundownId);
      }
    } else if (!rundownId) {
      console.log('New rundown, using default title and timezone');
      loadedRef.current = null;
      setRundownTitle('Live Broadcast Rundown');
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
    return () => {
      if (rundownId !== loadedRef.current) {
        loadedRef.current = null;
      }
    };
  }, [rundownId]);
};
