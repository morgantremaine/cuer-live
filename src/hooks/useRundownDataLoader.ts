
import { useState, useEffect } from 'react';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useRundownDataLoader = (
  rundownId: string | undefined,
  setItems: (items: RundownItem[]) => void,
  setRundownTitle: (title: string) => void,
  handleLoadLayout: (columns: Column[]) => void
) => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const { savedRundowns, loading } = useRundownStorage();

  // Load saved rundown data when component mounts or rundownId changes
  useEffect(() => {
    console.log('useRundownDataLoader: Effect triggered', { 
      rundownId, 
      loading, 
      savedRundownsLength: savedRundowns.length, 
      isDataLoaded 
    });
    
    if (rundownId && !loading && savedRundowns.length > 0 && !isDataLoaded) {
      const savedRundown = savedRundowns.find(r => r.id === rundownId);
      console.log('useRundownDataLoader: Looking for rundown with id:', rundownId);
      console.log('useRundownDataLoader: Found rundown:', savedRundown);
      
      if (savedRundown) {
        console.log('useRundownDataLoader: Loading saved rundown data');
        console.log('useRundownDataLoader: Items to load:', savedRundown.items);
        console.log('useRundownDataLoader: Column config to load:', savedRundown.column_config);
        
        // Load the rundown data
        if (savedRundown.items && Array.isArray(savedRundown.items)) {
          setItems(savedRundown.items);
        }
        
        if (savedRundown.title) {
          setRundownTitle(savedRundown.title);
        }
        
        // Load column configuration if it exists
        if (savedRundown.column_config && Array.isArray(savedRundown.column_config)) {
          console.log('useRundownDataLoader: Loading column configuration');
          handleLoadLayout(savedRundown.column_config);
        }
        
        setIsDataLoaded(true);
        console.log('useRundownDataLoader: Data loading complete');
      } else {
        console.log('useRundownDataLoader: No rundown found with id:', rundownId);
      }
    }
  }, [rundownId, savedRundowns, loading, isDataLoaded, setItems, setRundownTitle, handleLoadLayout]);

  // Reset data loaded flag when rundownId changes
  useEffect(() => {
    console.log('useRundownDataLoader: Rundown ID changed, resetting data loaded flag');
    setIsDataLoaded(false);
  }, [rundownId]);

  return { isDataLoaded };
};
