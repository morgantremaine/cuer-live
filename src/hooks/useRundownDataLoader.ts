
import { useEffect, useCallback } from 'react';

interface UseRundownDataLoaderProps {
  rundownId: string | undefined;
  savedRundowns: any[];
  loading: boolean;
  setRundownTitle: (title: string) => void;
  handleLoadLayout: (columns: any[]) => void;
}

export const useRundownDataLoader = ({
  rundownId,
  savedRundowns,
  loading,
  setRundownTitle,
  handleLoadLayout
}: UseRundownDataLoaderProps) => {
  // Memoize the loading logic to prevent infinite loops
  const loadRundownData = useCallback(() => {
    if (loading) return;
    
    if (rundownId && savedRundowns.length > 0) {
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      if (existingRundown) {
        console.log('Loading rundown title:', existingRundown.title);
        setRundownTitle(existingRundown.title);
        
        // Load column layout if it exists
        if (existingRundown.columns && Array.isArray(existingRundown.columns)) {
          console.log('Loading column layout:', existingRundown.columns);
          handleLoadLayout(existingRundown.columns);
        }
      }
    } else if (!rundownId) {
      console.log('New rundown, using default title');
      setRundownTitle('Live Broadcast Rundown');
    }
  }, [rundownId, savedRundowns, loading, setRundownTitle, handleLoadLayout]);

  // Only run when the rundown ID changes or when savedRundowns are first loaded
  useEffect(() => {
    // Add a check to prevent running multiple times for the same rundown
    if (loading || savedRundowns.length === 0) return;
    
    loadRundownData();
  }, [rundownId, savedRundowns.length > 0, loading]); // Simplified dependencies
};
