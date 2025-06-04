
import { useCallback, useRef } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { useBlueprintStorage } from '../useBlueprintStorage';

export const useBlueprintSaving = (rundownId: string, rundownTitle: string, showDate: string) => {
  const operationInProgressRef = useRef(false);
  const { saveBlueprint } = useBlueprintStorage(rundownId);

  // Save lists to database with a delay
  const saveLists = useCallback(async (updatedLists: BlueprintList[], silent = false) => {
    if (operationInProgressRef.current) {
      console.log('Operation in progress, skipping save');
      return;
    }
    
    operationInProgressRef.current = true;
    try {
      await saveBlueprint(rundownTitle, updatedLists, showDate, silent);
    } catch (error) {
      console.error('Error saving lists:', error);
    } finally {
      operationInProgressRef.current = false;
    }
  }, [rundownTitle, showDate, saveBlueprint]);

  // Create a wrapper function that matches the expected signature for drag and drop
  const saveListsForDragAndDrop = useCallback((title: string, updatedLists: BlueprintList[], silent = false) => {
    saveLists(updatedLists, silent);
  }, [saveLists]);

  return {
    saveLists,
    saveListsForDragAndDrop,
    operationInProgressRef
  };
};
