
import { useCallback, useRef } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { useBlueprintStorage } from '../useBlueprintStorage';

export const useBlueprintSaving = (rundownId: string, rundownTitle: string, showDate: string) => {
  const operationInProgressRef = useRef(false);
  const lastSaveRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const { saveBlueprint } = useBlueprintStorage(rundownId);

  // Save lists to database with debouncing to prevent infinite loops
  const saveLists = useCallback(async (updatedLists: BlueprintList[], silent = false) => {
    if (operationInProgressRef.current) {
      console.log('Save operation in progress, skipping save');
      return;
    }
    
    // Create a hash of the current state to prevent duplicate saves
    const currentStateHash = JSON.stringify({
      listsCount: updatedLists.length,
      listIds: updatedLists.map(l => l.id),
      showDate,
      rundownTitle
    });
    
    if (lastSaveRef.current === currentStateHash) {
      console.log('No changes detected, skipping save');
      return;
    }
    
    console.log('Saving blueprint lists:', {
      count: updatedLists.length,
      silent,
      rundownId,
      rundownTitle
    });
    
    operationInProgressRef.current = true;
    lastSaveRef.current = currentStateHash;
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    try {
      // For silent saves (like checkbox updates), debounce to prevent spam
      if (silent) {
        saveTimeoutRef.current = setTimeout(async () => {
          try {
            await saveBlueprint(rundownTitle, updatedLists, showDate, silent);
            console.log('Debounced save completed');
          } catch (error) {
            console.error('Error in debounced save:', error);
          } finally {
            operationInProgressRef.current = false;
          }
        }, 500);
      } else {
        // For immediate saves (like add/delete operations), save immediately
        await saveBlueprint(rundownTitle, updatedLists, showDate, silent);
        operationInProgressRef.current = false;
      }
    } catch (error) {
      console.error('Error saving lists:', error);
      operationInProgressRef.current = false;
    }
  }, [rundownTitle, showDate, saveBlueprint, rundownId]);

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
