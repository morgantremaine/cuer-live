
import { useModificationApplier } from './useCuerModifications/useModificationApplier';

export interface CuerModDeps {
  items: any[];
  updateItem: (id: string, field: string, value: string) => void;
  addRow: () => void;
  addHeader: () => void;
  addRowAtIndex: (index: number) => void;
  addHeaderAtIndex: (index: number) => void;
  deleteRow: (id: string) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  markAsChanged: () => void;
}

export const useCuerModifications = (deps: CuerModDeps) => {
  const { applyModifications } = useModificationApplier(deps);

  return {
    applyModifications
  };
};