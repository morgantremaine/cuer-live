
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
    console.log('Blueprint initialization check:', {
      user: !!user,
      rundownId,
      rundownTitle,
      itemsLength: items.length,
      initialized,
      loading,
      isInitializing: stateRef.current.isInitializing,
      currentRundownId: stateRef.current.currentRundownId
    });

    // Reset if rundown changed
    if (rundownId !== stateRef.current.currentRundownId && stateRef.current.currentRundownId !== '') {
      console.log('Rundown changed, resetting blueprint state');
      setLists([]);
      setInitialized(false);
      stateRef.current.currentRundownId = '';
      stateRef.current.isInitializing = false;
    }
    
    // Initialize if needed
    if (user && rundownId && rundownTitle && items.length > 0 && !initialized && !loading && !stateRef.current.isInitializing) {
      console.log('Starting blueprint initialization...');
      stateRef.current.isInitializing = true;
      stateRef.current.currentRundownId = rundownId;
      setLoading(true);

      const initializeBlueprint = async () => {
        try {
          console.log('Loading existing blueprint data...');
          const blueprintData = await loadBlueprint();
          console.log('Blueprint data loaded:', blueprintData);
          
          if (blueprintData && blueprintData.lists && blueprintData.lists.length > 0) {
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
            console.log('No existing blueprint found, creating default lists');
            const defaultLists = [
              {
                id: generateListId('headers'),
                name: 'Rundown Overview',
                sourceColumn: 'headers',
                items: generateListFromColumn(items, 'headers'),
                checkedItems: {}
              }
            ];
            console.log('Created default lists:', defaultLists);
            setLists(defaultLists);
            await saveBlueprint(defaultLists, true);
          }
          
          setInitialized(true);
          console.log('Blueprint initialization completed');
        } catch (error) {
          console.error('Blueprint initialization failed:', error);
        } finally {
          setLoading(false);
          stateRef.current.isInitializing = false;
        }
      };

      initializeBlueprint();
    }
  }, [user, rundownId, rundownTitle, items.length, initialized, loading, loadBlueprint, saveBlueprint, generateListId, setLists, setInitialized, setLoading, setShowDate, stateRef]);
};
