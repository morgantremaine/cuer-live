
import { useDirectRundownState } from '@/hooks/useDirectRundownState';
import { useModificationApplier } from './useCuerModifications/useModificationApplier';

export const useCuerModifications = () => {
  // Use direct state access instead of going through coordination layer
  const directState = useDirectRundownState();

  // Debug logging removed for cleaner console output

  const { applyModifications } = useModificationApplier({
    items: directState.items,
    updateItem: directState.updateItem,
    addRow: directState.addRow,
    addHeader: directState.addHeader,
    addRowAtIndex: directState.addRowAtIndex,
    addHeaderAtIndex: directState.addHeaderAtIndex,
    deleteRow: directState.deleteRow,
    calculateEndTime: directState.calculateEndTime,
    markAsChanged: directState.markAsChanged,
    saveUndoState: directState.saveUndoState
  });

  return {
    applyModifications
  };
};
