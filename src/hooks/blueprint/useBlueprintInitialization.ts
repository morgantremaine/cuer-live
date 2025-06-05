
import { useEffect } from 'react';
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
  useEffect(() => {
    // Reset if rundown changed
    if (rundownId !== stateRef.current.currentRundownId && stateRef.current.currentRundownId !== '') {
      setLists([]);
      setInitialized(false);
      stateRef.current.currentRundownId = '';
      stateRef.current.isInitializing = false;
    }
    
    // Initialize if needed
    if (user && rundownId && rundownTitle && items.length > 0 && !initialized && !loading && !stateRef.current.isInitializing) {
      stateRef.current.isInitializing = true;
      stateRef.current.currentRundownId = rundownId;
      setLoading(true);

      const initializeBlueprint = async () => {
        try {
          const blueprintData = await loadBlueprint();
          
          if (blueprintData && blueprintData.lists && blueprintData.lists.length > 0) {
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
            await saveBlueprint(defaultLists, true);
          }
          
          setInitialized(true);
        } catch (error) {
          // Initialization failed silently
        } finally {
          setLoading(false);
          stateRef.current.isInitializing = false;
        }
      };

      initializeBlueprint();
    }
  }, [user, rundownId, rundownTitle, items.length, initialized, loading, loadBlueprint, saveBlueprint, generateListId, setLists, setInitialized, setLoading, setShowDate, stateRef]);
};
