
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { useModificationApplier } from './useCuerModifications/useModificationApplier';

export const useCuerModifications = () => {
  const {
    items,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    calculateEndTime,
    markAsChanged
  } = useRundownGridState();

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
