
import { useCallback } from 'react';

interface UseRundownRowOperationsProps {
  selectedRows: Set<string>;
  deleteMultipleRows: (ids: string[]) => void;
  clearSelection: () => void;
  addRow: (calculateEndTime: (startTime: string, duration: string) => string, selectedRowId?: string | null) => void;
  addHeader: (selectedRowId?: string | null) => void;
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

  const wrappedAddRow = useCallback((calculateEndTime: (startTime: string, duration: string) => string, selectedRowId?: string | null) => {
    addRow(calculateEndTime, selectedRowId);
  }, [addRow]);

  const wrappedAddHeader = useCallback((selectedRowId?: string | null) => {
    addHeader(selectedRowId);
  }, [addHeader]);

  return {
    handleDeleteSelectedRows,
    addRow: wrappedAddRow,
    addHeader: wrappedAddHeader
  };
};
