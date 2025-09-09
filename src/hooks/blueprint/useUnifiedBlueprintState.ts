
import { useBlueprintContext } from '@/contexts/BlueprintContext';

// Simplified version that just exposes the context
// This maintains backward compatibility while using the unified context
export const useUnifiedBlueprintState = () => {
  const {
    state,
    updateLists,
    addList,
    deleteList,
    renameList,
    updateCheckedItems,
    updateShowDate,
    updateComponentOrder,
    saveBlueprint,
    refreshBlueprint
  } = useBlueprintContext();

  return {
    // State
    lists: state.lists,
    availableColumns: [], // This will be calculated in the component using rundown items
    showDate: state.showDate,
    initialized: state.isInitialized,
    loading: state.isLoading,
    isSaving: state.isSaving,
    error: state.error,
    componentOrder: state.componentOrder,
    
    // Actions
    updateShowDate,
    addNewList: addList, // Alias for compatibility
    deleteList,
    renameList,
    updateCheckedItems,
    refreshAllLists: refreshBlueprint, // Alias for compatibility
    saveBlueprint,
    refreshBlueprint,
    updateComponentOrder,
    updateLists
  };
};
