
import { useCallback } from 'react';

interface UseRundownRowOperationsProps {
  selectedRows: Set<string>;
  deleteMultipleRows: (ids: string[]) => void;
  clearSelection: () => void;
  addRow: () => void;
  addHeader: () => void;
  calculateEndTime: any;
}

export const useRundownRowOperations = ({
  selectedRows,
  deleteMultipleRows,
  clearSelection,
  addRow,
  addHeader,
  calculateEndTime
}: UseRundownRowOperationsProps) => {
  
  const handleDeleteSelectedRows = useCallback(() => {
    if (selectedRows.size > 0) {
      deleteMultipleRows(Array.from(selectedRows));
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

  const handleAddRow = useCallback(() => {
    addRow();
  }, [addRow]);

  const handleAddHeader = useCallback(() => {
    addHeader();
  }, [addHeader]);

  return {
    handleDeleteSelectedRows,
    handleAddRow,
    handleAddHeader
  };
};
