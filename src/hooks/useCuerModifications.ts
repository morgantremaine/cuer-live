
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import { useModificationApplier } from './useCuerModifications/useModificationApplier';

export const useCuerModifications = () => {
  const {
    coreState
  } = useRundownStateCoordination();

  const {
    items,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    calculateEndTime,
    markAsChanged
  } = coreState;

  const { applyModifications } = useModificationApplier({
    items,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    calculateEndTime,
    markAsChanged
  });

  return {
    applyModifications
  };
};
