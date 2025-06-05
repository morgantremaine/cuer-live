
import { useCallback } from 'react';

interface UseRundownRowOperationsProps {
  selectedRows: Set<string>;
  deleteMultipleRows: (ids: string[]) => void;
  clearSelection: () => void;
  addRow: (calculateEndTime: any, insertAfterIndex?: number) => void;
  addHeader: (insertAfterIndex?: number) => void;
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
    // Use the interface that expects insertAfterIndex
    addRow(calculateEndTime);
  }, [addRow, calculateEndTime]);

  const handleAddHeader = useCallback(() => {
    // Use the interface that expects insertAfterIndex
    addHeader();
  }, [addHeader]);

  return {
    handleDeleteSelectedRows,
    handleAddRow,
    handleAddHeader
  };
};
