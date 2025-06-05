
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
    hasDirectItems: rundown.items?.length || 0,
    hasUndoHistory: rundown.undo_history?.length || 0
  });

  // Don't load if already loading
  if (isLoading) {
    console.log('Validation: Blocked - already loading');
    return { shouldLoad: false, reason: 'already loading' };
  }

  // Don't load if already loaded and complete
  if (loadedId === currentRundownId && initialLoadComplete) {
    console.log('Validation: Blocked - already loaded and complete');
    return { shouldLoad: false, reason: 'already loaded' };
  }

  // Allow loading if we have data to load (either direct items or undo history)
  const hasItemsToLoad = (rundown.items && rundown.items.length > 0) || 
                        (rundown.undo_history && rundown.undo_history.length > 0);
  
  if (!hasItemsToLoad) {
    console.log('Validation: Blocked - no items to load');
    return { shouldLoad: false, reason: 'no items to load' };
  }

  // Only check these conditions if user has already interacted
  if (userHasInteracted) {
    if (checkRecentAutoSave(currentRundownId)) {
      console.log('Validation: Blocked - recent auto-save and user has interacted');
      return { shouldLoad: false, reason: 'recent auto-save with user interaction' };
    }

    if (checkUserChangedSinceAutoSave(currentRundownId)) {
      console.log('Validation: Blocked - user changed since auto-save');
      return { shouldLoad: false, reason: 'user changed since auto-save' };
    }
  }

  console.log('Validation: Passed - should load');
  return { shouldLoad: true };
};

export const getItemsToLoad = (rundown: SavedRundown) => {
  // First, try to get items directly
  if (rundown.items && Array.isArray(rundown.items) && rundown.items.length > 0) {
    console.log('Getting items to load - using direct items:', rundown.items.length);
    return rundown.items;
  }
  
  // If no direct items, check undo history for the most recent saved state
  if (rundown.undo_history && Array.isArray(rundown.undo_history) && rundown.undo_history.length > 0) {
    console.log('No direct items, checking undo history:', rundown.undo_history.length, 'entries');
    
    // Look for the most recent entry with items (search from newest to oldest)
    for (let i = rundown.undo_history.length - 1; i >= 0; i--) {
      const historyEntry = rundown.undo_history[i];
      
      if (historyEntry && historyEntry.items && Array.isArray(historyEntry.items) && historyEntry.items.length > 0) {
        console.log('Found items in undo history entry', i, ':', historyEntry.items.length, 'items');
        return historyEntry.items;
      }
    }
  }
  
  console.log('No items found in rundown or undo history');
  return [];
};
