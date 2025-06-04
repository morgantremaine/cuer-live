
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
  
  // Track initialization state and prevent concurrent operations
  const operationInProgressRef = useRef(false);
  const initStateRef = useRef({
    initialized: false,
    rundownId: '',
    lastItemsLength: 0
  });

  // Generate consistent list ID based on rundown ID and source column
  const generateListId = useCallback((sourceColumn: string) => {
    const timestamp = Date.now();
    const random = Math.random();
    return `${sourceColumn}_${timestamp}_${random}`;
  }, []);

  // Initialize blueprint data
  useEffect(() => {
    const currentItemsLength = items.length;
    const hasItemsChanged = initStateRef.current.lastItemsLength !== currentItemsLength;
    
    const shouldInitialize = 
      !loading && 
      items.length > 0 && 
      rundownId && 
      rundownTitle && 
      !operationInProgressRef.current &&
      (!initStateRef.current.initialized || initStateRef.current.rundownId !== rundownId);
    
    console.log('Blueprint init check:', {
      shouldInitialize,
      loading,
      itemsLength: items.length,
      rundownId,
      rundownTitle,
      operationInProgress: operationInProgressRef.current,
      initialized: initStateRef.current.initialized,
      rundownChanged: initStateRef.current.rundownId !== rundownId
    });
    
    if (shouldInitialize) {
      console.log('STARTING Blueprint initialization for rundown:', rundownId);
      operationInProgressRef.current = true;
      
      const initializeLists = async () => {
        try {
          // Try to load saved blueprint from database
          const blueprint = await loadBlueprint();
          
          if (blueprint && blueprint.lists && blueprint.lists.length > 0) {
            console.log('Loading saved blueprint with', blueprint.lists.length, 'lists');
            
            // Create lists with fresh items but existing checkbox states
            const refreshedLists = blueprint.lists.map(list => ({
              ...list,
              items: generateListFromColumn(items, list.sourceColumn),
              // Preserve checkbox states from database
              checkedItems: list.checkedItems || {}
            }));
            
            setLists(refreshedLists);
            
            // Set show date from saved blueprint if available
            if (blueprint.show_date) {
              setShowDate(blueprint.show_date);
            }
          } else {
            console.log('Creating default blueprint');
            // No saved blueprint, create default list
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
            
            // Save the default list to database
            await saveBlueprint(rundownTitle, defaultLists, showDate, true);
          }
          
          initStateRef.current = {
            initialized: true,
            rundownId: rundownId,
            lastItemsLength: currentItemsLength
          };
          setInitialized(true);
          console.log('Blueprint initialization COMPLETED for rundown:', rundownId);
        } catch (error) {
          console.error('Error during blueprint initialization:', error);
        } finally {
          operationInProgressRef.current = false;
        }
      };
      
      initializeLists();
    } else if (hasItemsChanged && initStateRef.current.initialized && initStateRef.current.rundownId === rundownId) {
      // Items changed but we're already initialized - just update the count
      console.log('Items changed, updating count:', currentItemsLength);
      initStateRef.current.lastItemsLength = currentItemsLength;
    }
  }, [loading, items.length, rundownId, rundownTitle, savedBlueprint, loadBlueprint, saveBlueprint, generateListId, showDate]);

  // Reset initialization when rundown changes
  useEffect(() => {
    if (initStateRef.current.rundownId !== rundownId) {
      console.log('Rundown changed from', initStateRef.current.rundownId, 'to', rundownId, '- resetting initialization');
      initStateRef.current.initialized = false;
      setInitialized(false);
      operationInProgressRef.current = false;
    }
  }, [rundownId]);

  return {
    lists,
    setLists,
    showDate,
    setShowDate,
    initialized,
    operationInProgressRef
  };
};
