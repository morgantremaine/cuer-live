
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import { useModificationApplier } from './useCuerModifications/useModificationApplier';

export const useCuerModifications = () => {
  // FIXED: Use clean state coordination instead of direct state to prevent hook duplication
  // This ensures we don't create multiple instances of useSimplifiedRundownState
  const { coreState } = useRundownStateCoordination();

  // Debug logging removed for cleaner console output

  const { applyModifications } = useModificationApplier({
    items: coreState.items,
    updateItem: coreState.updateItem,
    addRow: coreState.addRow,
    addHeader: coreState.addHeader,
    addRowAtIndex: coreState.addRowAtIndex,
    addHeaderAtIndex: coreState.addHeaderAtIndex,
    deleteRow: coreState.deleteRow,
    calculateEndTime: coreState.calculateEndTime,
    markAsChanged: coreState.markAsChanged
  });

  return {
    applyModifications
  };
};
