
import { useState, useCallback, useEffect, useRef } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn } from '@/utils/blueprintUtils';
import { format } from 'date-fns';

interface BlueprintData {
  lists: BlueprintList[];
  show_date?: string;
}

export const useBlueprintInitialization = (
  rundownId: string,
  rundownTitle: string,
  items: RundownItem[],
  savedBlueprint: BlueprintData | null,
  loading: boolean,
  loadBlueprint: () => Promise<BlueprintData | null>,
  saveBlueprint: (title: string, lists: BlueprintList[], showDate: string, silent?: boolean) => Promise<any>
) => {
  const [lists, setLists] = useState<BlueprintList[]>([]);
  const [showDate, setShowDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [initialized, setInitialized] = useState(false);
  
  // Single source of truth for initialization state
  const initStateRef = useRef({
    initialized: false,
    rundownId: '',
    isInitializing: false
  });
  const operationInProgressRef = useRef(false);

  // Generate consistent list ID
  const generateListId = useCallback((sourceColumn: string) => {
    const timestamp = Date.now();
    const random = Math.random();
    return `${sourceColumn}_${timestamp}_${random}`;
  }, []);

  // Initialize blueprint data - simplified logic
  useEffect(() => {
    // Prevent multiple simultaneous initializations
    if (initStateRef.current.isInitializing || operationInProgressRef.current || loading) {
      console.log('Blueprint init: Already initializing or loading, skipping');
      return;
    }

    // Check if we need to initialize
    const needsInitialization = 
      rundownId && 
      rundownTitle && 
      items.length > 0 && 
      !initStateRef.current.initialized;

    const rundownChanged = initStateRef.current.rundownId !== rundownId;

    console.log('Blueprint init check:', {
      needsInitialization,
      rundownChanged,
      loading,
      itemsLength: items.length,
      rundownId,
      rundownTitle,
      currentRundownId: initStateRef.current.rundownId,
      initialized: initStateRef.current.initialized
    });

    if (!needsInitialization && !rundownChanged) {
      return;
    }

    // If rundown changed, reset everything
    if (rundownChanged) {
      console.log('Rundown changed from', initStateRef.current.rundownId, 'to', rundownId, '- resetting');
      initStateRef.current = {
        initialized: false,
        rundownId: '',
        isInitializing: false
      };
      setInitialized(false);
      setLists([]);
    }

    if (!needsInitialization) {
      return;
    }

    console.log('STARTING Blueprint initialization for rundown:', rundownId);
    initStateRef.current.isInitializing = true;
    operationInProgressRef.current = true;
    
    const initializeLists = async () => {
      try {
        let blueprintData = savedBlueprint;
        
        // Only load if we don't have data
        if (!blueprintData) {
          console.log('Loading blueprint data from database');
          blueprintData = await loadBlueprint();
        }
        
        if (blueprintData && blueprintData.lists && blueprintData.lists.length > 0) {
          console.log('Using saved blueprint with', blueprintData.lists.length, 'lists');
          
          // Refresh items but preserve checkbox states
          const refreshedLists = blueprintData.lists.map(list => ({
            ...list,
            items: generateListFromColumn(items, list.sourceColumn),
            checkedItems: list.checkedItems || {}
          }));
          
          setLists(refreshedLists);
          
          if (blueprintData.show_date) {
            setShowDate(blueprintData.show_date);
          }
        } else {
          console.log('Creating default blueprint');
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
          
          // Save the default list
          await saveBlueprint(rundownTitle, defaultLists, showDate, true);
        }
        
        // Mark as initialized
        initStateRef.current = {
          initialized: true,
          rundownId: rundownId,
          isInitializing: false
        };
        setInitialized(true);
        console.log('Blueprint initialization COMPLETED for rundown:', rundownId);
      } catch (error) {
        console.error('Error during blueprint initialization:', error);
        initStateRef.current.isInitializing = false;
      } finally {
        operationInProgressRef.current = false;
      }
    };
    
    initializeLists();
  }, [rundownId, rundownTitle, items.length, savedBlueprint, loading, loadBlueprint, saveBlueprint, generateListId, showDate]);

  return {
    lists,
    setLists,
    showDate,
    setShowDate,
    initialized,
    operationInProgressRef
  };
};
