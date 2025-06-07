
import { useEffect } from 'react';
import { generateDefaultBlueprint } from '@/utils/blueprintUtils';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';

export const useBlueprintInitialization = (
  user: any,
  rundownId: string,
  rundownTitle: string,
  items: RundownItem[],
  initialized: boolean,
  loading: boolean,
  stateRef: any,
  setLists: (lists: BlueprintList[]) => void,
  setInitialized: (initialized: boolean) => void,
  setLoading: (loading: boolean) => void,
  setShowDate: (date: string) => void,
  loadBlueprint: () => Promise<any>,
  saveBlueprint: (lists: BlueprintList[], silent?: boolean, showDateOverride?: string, notesOverride?: string, crewDataOverride?: any, cameraPlots?: any, componentOrder?: string[]) => void,
  generateListId: (sourceColumn: string) => string
) => {
  useEffect(() => {
    const initializeBlueprint = async () => {
      if (!user || !rundownId || !rundownTitle || !items.length) return;
      if (initialized || loading) return;
      if (stateRef.current.isInitializing) return;
      if (stateRef.current.currentRundownId === rundownId) return;

      stateRef.current.isInitializing = true;
      setLoading(true);

      try {
        const existingBlueprint = await loadBlueprint();

        if (existingBlueprint) {
          setLists(existingBlueprint.lists || []);
          if (existingBlueprint.show_date) {
            setShowDate(existingBlueprint.show_date);
          }
        } else {
          // Create default blueprint
          const defaultLists = generateDefaultBlueprint(rundownId, rundownTitle, items);
          setLists(defaultLists);
          saveBlueprint(defaultLists, false);
        }

        setInitialized(true);
        stateRef.current.currentRundownId = rundownId;
      } catch (error) {
        // Error handling removed for cleaner console
      } finally {
        setLoading(false);
        stateRef.current.isInitializing = false;
      }
    };

    initializeBlueprint();
  }, [
    user,
    rundownId,
    rundownTitle,
    items,
    initialized,
    loading,
    stateRef,
    setLists,
    setInitialized,
    setLoading,
    setShowDate,
    loadBlueprint,
    saveBlueprint,
    generateListId
  ]);
};
