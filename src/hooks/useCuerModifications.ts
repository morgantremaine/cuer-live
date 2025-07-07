
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import { useModificationApplier } from './useCuerModifications/useModificationApplier';

export const useCuerModifications = () => {
  // Use the same state coordination system as the main rundown
  const { coreState } = useRundownStateCoordination();

  console.log('🤖 useCuerModifications initialized with coordinated state:', {
    itemCount: coreState.items.length,
    rundownId: coreState.rundownId,
    hasUnsavedChanges: coreState.hasUnsavedChanges
  });

  const { applyModifications } = useModificationApplier({
    items: coreState.items,
    updateItem: coreState.updateItem,
    addRow: coreState.addRow,
    addHeader: coreState.addHeader,
    deleteRow: coreState.deleteRow,
    calculateEndTime: coreState.calculateEndTime,
    markAsChanged: coreState.markAsChanged
  });

  return {
    applyModifications
  };
};
