
import { useEffect, useRef } from 'react';
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
  const initializationRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const initializeBlueprint = async () => {
      if (!user || !rundownId || !rundownTitle || !items.length) return;
      if (initialized || loading) return;
      if (stateRef.current.isInitializing) return;
      if (stateRef.current.currentRundownId === rundownId) return;

      // Prevent multiple simultaneous initializations for the same rundown
      const initKey = `${rundownId}-${user.id}`;
      if (initializationRef.current[initKey]) return;
      
      initializationRef.current[initKey] = true;
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
        console.error('Blueprint initialization error:', error);
      } finally {
        setLoading(false);
        stateRef.current.isInitializing = false;
        // Clear the initialization flag after a delay to allow for proper cleanup
        setTimeout(() => {
          delete initializationRef.current[initKey];
        }, 1000);
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
