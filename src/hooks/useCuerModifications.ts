
import { useDirectRundownState } from '@/hooks/useDirectRundownState';
import { useModificationApplier } from './useCuerModifications/useModificationApplier';

export const useCuerModifications = () => {
  // Use direct state access like Find/Replace does (which works)
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
    deleteRow: directState.deleteRow,
    calculateEndTime: directState.calculateEndTime,
    markAsChanged: directState.markAsChanged
  });

  return {
    applyModifications
  };
};
