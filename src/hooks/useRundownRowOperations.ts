
import { useCallback } from 'react';

interface UseRundownRowOperationsProps {
  selectedRows: Set<string>;
  deleteMultipleRows: (ids: string[]) => void;
  clearSelection: () => void;
  addRow: (selectedRowId?: string | null, selectedRows?: Set<string>) => void;
  addHeader: (selectedRowId?: string | null, selectedRows?: Set<string>) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
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
    const selectedIds = Array.from(selectedRows);
    if (selectedIds.length > 0) {
      deleteMultipleRows(selectedIds);
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

  const handleAddRow = useCallback((calculateEndTimeFn: (startTime: string, duration: string) => string, selectedRowId?: string | null) => {
    addRow(selectedRowId, selectedRows);
  }, [addRow, selectedRows]);

  const handleAddHeader = useCallback((selectedRowId?: string | null) => {
    addHeader(selectedRowId, selectedRows);
  }, [addHeader, selectedRows]);

  return {
    handleDeleteSelectedRows,
    handleAddRow,
    handleAddHeader
  };
};
