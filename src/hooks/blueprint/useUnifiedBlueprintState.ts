
import { useBlueprintContext } from '@/contexts/BlueprintContext';
import { useOTIntegration } from '@/hooks/useOTIntegration';

// Enhanced version that integrates OT capabilities
export const useUnifiedBlueprintState = (rundownData?: any, otEnabled: boolean = true) => {
  const blueprintContext = useBlueprintContext();
  
  const otIntegration = useOTIntegration({
    rundownId: rundownData?.id || '',
    rundownData: rundownData || {},
    enabled: otEnabled && !!rundownData?.id
  });

  // Return OT-enhanced operations when available, fallback to regular operations
  const enhancedOperations = otIntegration.isOTEnabled ? {
    updateLists: otIntegration.blueprintOps.updateLists,
    updateShowDate: otIntegration.blueprintOps.updateShowDate,
    updateNotes: otIntegration.blueprintOps.updateNotes,
    updateCheckedItems: otIntegration.blueprintOps.updateCheckedItems,
  } : {
    updateLists: blueprintContext.updateLists,
    updateShowDate: blueprintContext.updateShowDate,
    updateNotes: blueprintContext.updateNotes,
    updateCheckedItems: blueprintContext.updateCheckedItems,
  };

  return {
    // State
    lists: blueprintContext.state.lists,
    availableColumns: [], // This will be calculated in the component using rundown items
    showDate: blueprintContext.state.showDate,
    initialized: blueprintContext.state.isInitialized,
    loading: blueprintContext.state.isLoading,
    isSaving: blueprintContext.state.isSaving,
    error: blueprintContext.state.error,
    componentOrder: blueprintContext.state.componentOrder,
    
    // Enhanced Actions with OT support
    ...enhancedOperations,
    addNewList: blueprintContext.addList, // Alias for compatibility
    deleteList: blueprintContext.deleteList,
    renameList: blueprintContext.renameList,
    refreshAllLists: blueprintContext.refreshBlueprint, // Alias for compatibility
    saveBlueprint: blueprintContext.saveBlueprint,
    refreshBlueprint: blueprintContext.refreshBlueprint,
    updateComponentOrder: blueprintContext.updateComponentOrder,
    autoRefreshLists: blueprintContext.autoRefreshLists,
    
    // OT-specific state
    isOTEnabled: otIntegration.isOTEnabled,
    isCollaborative: otIntegration.isReady,
    activeSessions: otIntegration.activeSessions,
    activeConflicts: otIntegration.activeConflicts
  };
};
