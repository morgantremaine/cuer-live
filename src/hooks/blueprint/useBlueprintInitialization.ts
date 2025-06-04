
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
    rundownId: ''
  });

  // Generate consistent list ID based on rundown ID and source column
  const generateListId = useCallback((sourceColumn: string) => {
    const timestamp = Date.now();
    const random = Math.random();
    return `${sourceColumn}_${timestamp}_${random}`;
  }, []);

  // Initialize blueprint data
  useEffect(() => {
    const shouldInitialize = 
      !loading && 
      items.length > 0 && 
      rundownId && 
      rundownTitle && 
      !operationInProgressRef.current &&
      (!initStateRef.current.initialized || initStateRef.current.rundownId !== rundownId);
    
    if (shouldInitialize) {
      console.log('Initializing blueprint state with items:', items.length);
      operationInProgressRef.current = true;
      
      const initializeLists = async () => {
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
          
          console.log('Loaded lists with checkbox states:', refreshedLists.map(l => ({ id: l.id, checkedItems: l.checkedItems })));
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
          rundownId: rundownId
        };
        setInitialized(true);
        operationInProgressRef.current = false;
      };
      
      initializeLists();
    }
  }, [loading, items, rundownId, rundownTitle, savedBlueprint, loadBlueprint, saveBlueprint, generateListId, showDate]);

  // Reset initialization when rundown changes
  useEffect(() => {
    if (initStateRef.current.rundownId !== rundownId) {
      console.log('Rundown changed, resetting initialization');
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
