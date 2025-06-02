
import { useCallback } from 'react';

interface UseRundownRowOperationsProps {
  selectedRows: Set<string>;
  deleteMultipleRows: (ids: string[]) => void;
  clearSelection: () => void;
  addRow: (calculateEndTime: (startTime: string, duration: string) => string, insertAfterIndex?: number) => void;
  addHeader: (insertAfterIndex?: number) => void;
}

export const useRundownRowOperations = ({
  selectedRows,
  deleteMultipleRows,
  clearSelection,
  addRow,
  addHeader
}: UseRundownRowOperationsProps) => {
  const handleDeleteSelectedRows = useCallback(() => {
    const selectedIds = Array.from(selectedRows);
    if (selectedIds.length > 0) {
      deleteMultipleRows(selectedIds);
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

  const wrappedAddRow = useCallback((calculateEndTime: (startTime: string, duration: string) => string, insertAfterIndex?: number) => {
    addRow(calculateEndTime, insertAfterIndex);
  }, [addRow]);

  const wrappedAddHeader = useCallback((insertAfterIndex?: number) => {
    addHeader(insertAfterIndex);
  }, [addHeader]);

  return {
    handleDeleteSelectedRows,
    addRow: wrappedAddRow,
    addHeader: wrappedAddHeader
  };
};
