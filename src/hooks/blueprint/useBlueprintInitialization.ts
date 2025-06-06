
import { useEffect, useRef } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn } from '@/utils/blueprintUtils';

export const useBlueprintInitialization = (
  user: any,
  rundownId: string,
  rundownTitle: string,
  items: RundownItem[],
  initialized: boolean,
  loading: boolean,
  stateRef: React.MutableRefObject<{ currentRundownId: string; isInitializing: boolean }>,
  setLists: (lists: BlueprintList[]) => void,
  setInitialized: (initialized: boolean) => void,
  setLoading: (loading: boolean) => void,
  setShowDate: (date: string) => void,
  loadBlueprint: () => Promise<any>,
  saveBlueprint: (lists: BlueprintList[], silent?: boolean) => void,
  generateListId: (sourceColumn: string) => string
) => {
  const initializationLockRef = useRef(false);
  
  useEffect(() => {
    // Reset if rundown changed
    if (rundownId !== stateRef.current.currentRundownId && stateRef.current.currentRundownId !== '') {
      console.log('Rundown changed, resetting blueprint state');
      setLists([]);
      setInitialized(false);
      stateRef.current.currentRundownId = '';
      stateRef.current.isInitializing = false;
      initializationLockRef.current = false;
    }
    
    // Initialize if needed - with better guards against race conditions
    if (
      user && 
      rundownId && 
      rundownTitle && 
      items.length > 0 && 
      !initialized && 
      !loading && 
      !stateRef.current.isInitializing &&
      !initializationLockRef.current
    ) {
      console.log('Starting blueprint initialization for rundown:', rundownId);
      
      // Set all locks to prevent concurrent initialization
      stateRef.current.isInitializing = true;
      initializationLockRef.current = true;
      stateRef.current.currentRundownId = rundownId;
      setLoading(true);

      const initializeBlueprint = async () => {
        try {
          console.log('Loading blueprint data...');
          const blueprintData = await loadBlueprint();
          
          if (blueprintData && blueprintData.lists && Array.isArray(blueprintData.lists) && blueprintData.lists.length > 0) {
            console.log('Found existing blueprint with', blueprintData.lists.length, 'lists');
            
            const refreshedLists = blueprintData.lists.map((list: BlueprintList) => ({
              ...list,
              items: generateListFromColumn(items, list.sourceColumn),
              checkedItems: list.checkedItems || {}
            }));
            
            setLists(refreshedLists);
            
            if (blueprintData.show_date) {
              setShowDate(blueprintData.show_date);
            }
          } else {
            console.log('No existing blueprint found, creating default');
            
            const defaultLists = [
              {
                id: generateListId('headers'),
                name: 'Rundown Overview',
                sourceColumn: 'headers',
                items: generateListFromColumn(items, 'headers'),
                checkedItems: {}
              }
            ];
            
            setLists(defaultLists);
            
            // Save default blueprint
            try {
              await saveBlueprint(defaultLists, true);
              console.log('Default blueprint saved');
            } catch (saveError) {
              console.error('Failed to save default blueprint:', saveError);
            }
          }
          
          setInitialized(true);
          console.log('Blueprint initialization completed');
        } catch (error) {
          console.error('Blueprint initialization failed:', error);
          
          // Create minimal fallback state
          const fallbackLists = [
            {
              id: generateListId('headers'),
              name: 'Rundown Overview',
              sourceColumn: 'headers',
              items: generateListFromColumn(items, 'headers'),
              checkedItems: {}
            }
          ];
          setLists(fallbackLists);
          setInitialized(true);
        } finally {
          setLoading(false);
          stateRef.current.isInitializing = false;
          initializationLockRef.current = false;
        }
      };

      initializeBlueprint();
    }
  }, [
    user, 
    rundownId, 
    rundownTitle, 
    items.length, 
    initialized, 
    loading, 
    loadBlueprint, 
    saveBlueprint, 
    generateListId, 
    setLists, 
    setInitialized, 
    setLoading, 
    setShowDate, 
    stateRef
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stateRef.current.isInitializing) {
        console.log('Cleaning up blueprint initialization on unmount');
        stateRef.current.isInitializing = false;
        initializationLockRef.current = false;
      }
    };
  }, [stateRef]);
};
