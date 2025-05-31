
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
        console.log('Loading rundown data:', { id: rundownId, title: existingRundown.title });
        setRundownTitle(existingRundown.title);
        
        // Load column layout if it exists
        if (existingRundown.columns && Array.isArray(existingRundown.columns)) {
          console.log('Loading column layout:', existingRundown.columns);
          handleLoadLayout(existingRundown.columns);
        }
      } else {
        console.log('Rundown not found:', rundownId);
      }
    } else if (!rundownId) {
      console.log('New rundown, using default title');
      setRundownTitle('Live Broadcast Rundown');
    }
  }, [rundownId, savedRundowns, loading, setRundownTitle, handleLoadLayout]);

  // Load data when rundown ID changes or when savedRundowns are first loaded
  useEffect(() => {
    if (loading) return;
    
    // For existing rundowns, wait for savedRundowns to be loaded
    if (rundownId && savedRundowns.length === 0) return;
    
    loadRundownData();
  }, [rundownId, savedRundowns.length, loading, loadRundownData]);
};
