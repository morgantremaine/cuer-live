
import { useEffect } from 'react';

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
  // Load the title and columns from existing rundown
  useEffect(() => {
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
  }, [rundownId, savedRundowns, loading, handleLoadLayout, setRundownTitle]);
};
