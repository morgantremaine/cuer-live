
import { useDirectRundownState } from '@/hooks/useDirectRundownState';
import { useModificationApplier } from './useCuerModifications/useModificationApplier';

export const useCuerModifications = () => {
  // Use direct state access instead of going through coordination layer
  const directState = useDirectRundownState();

  console.log('🤖 useCuerModifications initialized with direct state:', {
    itemCount: directState.items.length,
    rundownId: directState.rundownId,
    hasUnsavedChanges: directState.hasUnsavedChanges
  });

  const { applyModifications } = useModificationApplier({
    items: directState.items,
    updateItem: directState.updateItem,
    addRow: directState.addRow,
    addHeader: directState.addHeader,
    addRowAtIndex: directState.addRowAtIndex,
    addHeaderAtIndex: directState.addHeaderAtIndex,
    deleteRow: directState.deleteRow,
    calculateEndTime: directState.calculateEndTime,
    markAsChanged: directState.markAsChanged
  });

  return {
    applyModifications
  };
};
