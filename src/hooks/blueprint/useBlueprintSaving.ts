
import { useCallback, useRef } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { useBlueprintStorage } from '../useBlueprintStorage';

export const useBlueprintSaving = (rundownId: string, rundownTitle: string, showDate: string) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveRef = useRef<string>('');
  const { saveBlueprint } = useBlueprintStorage(rundownId);

  // Simplified save function with better deduplication
  const saveLists = useCallback(async (updatedLists: BlueprintList[], silent = false) => {
    // Create a more comprehensive hash to prevent duplicate saves
    const currentStateHash = JSON.stringify({
      listsCount: updatedLists.length,
      listData: updatedLists.map(l => ({
        id: l.id,
        name: l.name,
        sourceColumn: l.sourceColumn,
        itemsCount: l.items.length,
        checkedItems: l.checkedItems || {}
      })),
      showDate,
      rundownTitle,
      rundownId
    });
    
    // Skip if no changes
    if (lastSaveRef.current === currentStateHash) {
      console.log('Blueprint save: No changes detected, skipping save');
      return;
    }
    
    console.log('Blueprint save: Saving', updatedLists.length, 'lists', silent ? '(silent)' : '');
    lastSaveRef.current = currentStateHash;
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    try {
      if (silent) {
        // Debounce silent saves (like checkbox updates)
        saveTimeoutRef.current = setTimeout(async () => {
          try {
            await saveBlueprint(rundownTitle, updatedLists, showDate, silent);
            console.log('Blueprint save: Debounced save completed');
          } catch (error) {
            console.error('Blueprint save: Error in debounced save:', error);
          }
        }, 500);
      } else {
        // Immediate save for important operations
        await saveBlueprint(rundownTitle, updatedLists, showDate, silent);
        console.log('Blueprint save: Immediate save completed');
      }
    } catch (error) {
      console.error('Blueprint save: Error saving lists:', error);
    }
  }, [rundownTitle, showDate, saveBlueprint, rundownId]);

  // Wrapper for drag and drop compatibility
  const saveListsForDragAndDrop = useCallback((title: string, updatedLists: BlueprintList[], silent = false) => {
    saveLists(updatedLists, silent);
  }, [saveLists]);

  return {
    saveLists,
    saveListsForDragAndDrop
  };
};
