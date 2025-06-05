
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
  console.log('Validating loading conditions:', {
    currentRundownId,
    userHasInteracted,
    loadedId,
    initialLoadComplete,
    isLoading,
    recentAutoSave: checkRecentAutoSave(currentRundownId),
    userChangedSinceAutoSave: checkUserChangedSinceAutoSave(currentRundownId)
  });

  // Critical safeguards only - reduced logging
  if (checkRecentAutoSave(currentRundownId)) {
    console.log('Validation: Blocked - recent auto-save');
    return { shouldLoad: false, reason: 'recent auto-save' };
  }

  if (userHasInteracted) {
    console.log('Validation: Blocked - user has already interacted');
    return { shouldLoad: false, reason: 'user has already interacted' };
  }

  if (checkUserChangedSinceAutoSave(currentRundownId)) {
    console.log('Validation: Blocked - user changed since auto-save');
    return { shouldLoad: false, reason: 'user changed since auto-save' };
  }

  if (loadedId === currentRundownId && initialLoadComplete) {
    console.log('Validation: Blocked - already loaded');
    return { shouldLoad: false, reason: 'already loaded' };
  }

  if (isLoading) {
    console.log('Validation: Blocked - already loading');
    return { shouldLoad: false, reason: 'already loading' };
  }

  console.log('Validation: Passed - should load');
  return { shouldLoad: true };
};

export const getItemsToLoad = (rundown: SavedRundown) => {
  let itemsToLoad = rundown.items || [];
  
  console.log('Getting items to load - direct items:', itemsToLoad?.length || 0);
  
  if ((!itemsToLoad || itemsToLoad.length === 0) && rundown.undo_history && Array.isArray(rundown.undo_history) && rundown.undo_history.length > 0) {
    console.log('No direct items, checking undo history:', rundown.undo_history.length, 'entries');
    
    for (let i = rundown.undo_history.length - 1; i >= 0; i--) {
      const historyEntry = rundown.undo_history[i];
      
      if (historyEntry && historyEntry.items && Array.isArray(historyEntry.items) && historyEntry.items.length > 0) {
        itemsToLoad = historyEntry.items;
        console.log('Found items in undo history entry', i, ':', itemsToLoad.length, 'items');
        break;
      }
    }
  }
  
  console.log('Final items to load:', itemsToLoad?.length || 0);
  return itemsToLoad;
};
