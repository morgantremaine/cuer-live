
import { SavedRundown } from '../useRundownStorage/types';
import { checkRecentAutoSave, checkUserChangedSinceAutoSave } from '../useAutoSaveOperations';

export const validateLoadingConditions = (
  currentRundownId: string,
  rundown: SavedRundown,
  userHasInteracted: boolean,
  loadedId: string | null,
  initialLoadComplete: boolean,
  isLoading: boolean
): { shouldLoad: boolean; reason?: string } => {
  // Critical safeguards only - reduced logging
  if (checkRecentAutoSave(currentRundownId)) {
    return { shouldLoad: false, reason: 'recent auto-save' };
  }

  if (userHasInteracted) {
    return { shouldLoad: false, reason: 'user has already interacted' };
  }

  if (checkUserChangedSinceAutoSave(currentRundownId)) {
    return { shouldLoad: false, reason: 'user changed since auto-save' };
  }

  if (loadedId === currentRundownId && initialLoadComplete) {
    return { shouldLoad: false, reason: 'already loaded' };
  }

  if (isLoading) {
    return { shouldLoad: false, reason: 'already loading' };
  }

  return { shouldLoad: true };
};

export const getItemsToLoad = (rundown: SavedRundown) => {
  let itemsToLoad = rundown.items || [];
  
  if ((!itemsToLoad || itemsToLoad.length === 0) && rundown.undo_history && Array.isArray(rundown.undo_history) && rundown.undo_history.length > 0) {
    for (let i = rundown.undo_history.length - 1; i >= 0; i--) {
      const historyEntry = rundown.undo_history[i];
      
      if (historyEntry && historyEntry.items && Array.isArray(historyEntry.items) && historyEntry.items.length > 0) {
        itemsToLoad = historyEntry.items;
        break;
      }
    }
  }
  
  return itemsToLoad;
};
